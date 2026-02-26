import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users, Clock, MapPin, AlignLeft, Building2, User, Filter, RefreshCw, Video, ExternalLink, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import CoachingSessionModal from '../components/CoachingSessionModal';
import WorkshopModal from '../components/WorkshopModal';
import DateTimePicker from '../components/DateTimePicker';

// Staff color palette for All Members view
const STAFF_COLORS = [
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#06B6D4', // Cyan
];

// Add animation keyframes for the popover
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeslide {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

export default function Calendar() {
    const { user } = useAuth();
    const { state: dataState } = useData();
    const staffList = dataState.staff || [];

    const [appointments, setAppointments] = useState([]);
    const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // View state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState('all');
    const [view, setView] = useState('month'); // 'month', 'week', 'day'

    // Multi-calendar state
    const [userCalendars, setUserCalendars] = useState([]);
    const [enabledCalendars, setEnabledCalendars] = useState(new Set());

    // Staff member filter state (for All Members view)
    const [enabledStaff, setEnabledStaff] = useState(new Set());

    // Staff color overrides (persisted in localStorage)
    const [staffColorOverrides, setStaffColorOverrides] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('staffColorOverrides') || '{}');
        } catch { return {}; }
    });
    const [colorPickerStaffId, setColorPickerStaffId] = useState(null);
    const [colorPickerCalId, setColorPickerCalId] = useState(null);
    const colorPickerRef = useRef(null);

    // Persist color overrides
    useEffect(() => {
        localStorage.setItem('staffColorOverrides', JSON.stringify(staffColorOverrides));
    }, [staffColorOverrides]);

    // Close color picker on outside click
    useEffect(() => {
        if (!colorPickerStaffId && !colorPickerCalId) return;
        const handleClick = (e) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
                setColorPickerStaffId(null);
                setColorPickerCalId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [colorPickerStaffId, colorPickerCalId]);

    // Helper: get color for a staff member (override or default)
    const getStaffColor = (staffId) => {
        if (staffColorOverrides[staffId]) return staffColorOverrides[staffId];
        const idx = staffList.findIndex(s => s.id === staffId);
        return STAFF_COLORS[idx >= 0 ? idx % STAFF_COLORS.length : 0];
    };

    // Helper: get color for an event based on its calendar
    const getCalendarColor = (graphCalendarId) => {
        if (!graphCalendarId || userCalendars.length === 0) return null;
        const cal = userCalendars.find(c => c.graph_calendar_id === graphCalendarId);
        return cal?.color || null;
    };

    // Popover / Interaction State
    const [selectedEventInfo, setSelectedEventInfo] = useState(null);
    const [editingWorkshop, setEditingWorkshop] = useState(null);
    const [editingCoachingSession, setEditingCoachingSession] = useState(null);
    const [editingCoachingSeekerId, setEditingCoachingSeekerId] = useState(null);


    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', start_time: '', durationHours: 1, durationMinutes: 0, location: '', description: '', is_all_day: false, contact_id: '', recovery_seeker_id: '', staff_id: user?.id || '' });

    const fetchUserCalendars = async (uid) => {
        if (!uid || uid === 'all') {
            setUserCalendars([]);
            setEnabledCalendars(new Set());
            return;
        }
        const { data } = await supabase
            .from('user_calendars')
            .select('*')
            .eq('user_id', uid)
            .order('is_default', { ascending: false });
        const cals = data || [];
        setUserCalendars(cals);
        setEnabledCalendars(new Set(cals.map(c => c.graph_calendar_id)));
    };

    const fetchAppointments = async () => {
        setLoading(true);

        const isOwnDiary = selectedUser === user?.id;
        const isOtherUser = selectedUser !== 'all' && !isOwnDiary;

        let query = supabase.from('appointments').select('*');
        if (selectedUser !== 'all') {
            query = query.eq('user_id', selectedUser);
        }

        // Privacy: when viewing another user's diary, only show their default calendar events
        if (isOtherUser) {
            const { data: defaultCal } = await supabase
                .from('user_calendars')
                .select('graph_calendar_id')
                .eq('user_id', selectedUser)
                .eq('is_default', true)
                .maybeSingle();
            if (defaultCal?.graph_calendar_id) {
                query = query.or(`graph_calendar_id.is.null,graph_calendar_id.eq.${defaultCal.graph_calendar_id}`);
            }
        }

        // Privacy: for "All Members" view, only show each user's default calendar events
        if (selectedUser === 'all') {
            const { data: defaultCals } = await supabase
                .from('user_calendars')
                .select('graph_calendar_id')
                .eq('is_default', true);
            const defaultCalIds = (defaultCals || []).map(c => c.graph_calendar_id).filter(Boolean);
            if (defaultCalIds.length > 0) {
                query = query.or(`graph_calendar_id.is.null,graph_calendar_id.in.(${defaultCalIds.join(',')})`);
            }
        }

        const { data, error } = await query;
        if (!error && data) {
            setAppointments(data);
        }
        setLoading(false);

        // Trigger Outlook sync in the background if a specific user is selected and has a connection
        if (selectedUser !== 'all') {
            const { data: conn } = await supabase
                .from('user_oauth_connections')
                .select('id')
                .eq('user_id', selectedUser)
                .maybeSingle();

            if (conn) {
                fetchOutlookEvents(selectedUser);
            }
        }
    };

    const fetchOutlookEvents = async (uid, isManual = false) => {
        if (!uid) return;
        setIsSyncingOutlook(true);
        try {
            // Ensure the session JWT is valid (refreshes automatically if close to expiry)
            const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr || !session) {
                throw new Error('Your session has expired. Please log out and log back in.');
            }

            // Determine which user IDs to sync
            let userIds = [];
            if (uid === 'all') {
                const { data: connections } = await supabase
                    .from('user_oauth_connections')
                    .select('user_id');
                userIds = (connections || []).map(c => c.user_id);
                if (userIds.length === 0) {
                    if (isManual) alert('No Outlook accounts connected. Please connect an Outlook account first.');
                    return;
                }
            } else {
                userIds = [uid];
            }

            let totalCount = 0;
            let totalDeleted = 0;
            for (const userId of userIds) {
                const { data: jsonRes, error: syncError } = await supabase.functions.invoke('outlook-api', {
                    body: { action: 'getEvents', userId }
                });

                if (syncError) {
                    let errMessage = syncError.message || 'Unknown server error';
                    try {
                        if (syncError.context && typeof syncError.context.json === 'function') {
                            const errData = await syncError.context.json();
                            errMessage = errData?.error || JSON.stringify(errData);
                        } else if (syncError.context && typeof syncError.context.text === 'function') {
                            errMessage = await syncError.context.text();
                        }
                    } catch (e) { }
                    console.error('[Calendar] Sync error for user', userId, ':', errMessage);
                    if (userIds.length === 1) {
                        // Single user — surface the actual error rather than showing "0 events"
                        throw new Error(errMessage);
                    }
                    // Multiple users — log and continue to the next
                    continue;
                }

                totalCount += jsonRes?.count || 0;
                totalDeleted += jsonRes?.deleted || 0;
            }

            // Re-fetch local appointments to show newly imported ones (with same privacy filtering)
            let query = supabase.from('appointments').select('*');
            if (uid !== 'all') {
                query = query.eq('user_id', uid);
            }
            const isOtherUser = uid !== 'all' && uid !== user?.id;
            if (isOtherUser) {
                const { data: defaultCal } = await supabase
                    .from('user_calendars')
                    .select('graph_calendar_id')
                    .eq('user_id', uid)
                    .eq('is_default', true)
                    .maybeSingle();
                if (defaultCal?.graph_calendar_id) {
                    query = query.or(`graph_calendar_id.is.null,graph_calendar_id.eq.${defaultCal.graph_calendar_id}`);
                }
            }
            if (uid === 'all') {
                const { data: defaultCals } = await supabase
                    .from('user_calendars')
                    .select('graph_calendar_id')
                    .eq('is_default', true);
                const defaultCalIds = (defaultCals || []).map(c => c.graph_calendar_id).filter(Boolean);
                if (defaultCalIds.length > 0) {
                    query = query.or(`graph_calendar_id.is.null,graph_calendar_id.in.(${defaultCalIds.join(',')})`);
                }
            }
            const { data } = await query;
            if (data) {
                setAppointments(data);
                // Refresh calendar list in case new calendars appeared after sync
                if (uid !== 'all') fetchUserCalendars(uid);
            }

            if (isManual) {
                const deletedNote = totalDeleted > 0 ? `, removed ${totalDeleted} deleted` : '';
                alert(`Successfully synced ${totalCount} events from Outlook${deletedNote}.`);
            }

        } catch (err) {
            console.error('[Calendar] Outlook sync failed:', err);
            if (isManual) {
                alert(`Outlook sync failed: ${err.message || 'Unknown error. Check console.'}`);
            }
        } finally {
            setIsSyncingOutlook(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchUserCalendars(selectedUser);
        // Initialize enabledStaff with all staff when switching to 'all'
        if (selectedUser === 'all') {
            setEnabledStaff(new Set(staffList.map(s => s.id)));
        }
    }, [selectedUser]);

    const allEvents = React.useMemo(() => {
        const isOwnDiary = selectedUser === user?.id;
        const isAllMembers = selectedUser === 'all';

        let events = appointments
            .filter(app => {
                // For own diary: apply client-side calendar filter (only Outlook-tagged events are filtered)
                if (isOwnDiary && app.graph_calendar_id && userCalendars.length > 0) {
                    return enabledCalendars.has(app.graph_calendar_id);
                }
                // For All Members view: filter by enabled staff
                if (isAllMembers && app.user_id) {
                    return enabledStaff.has(app.user_id);
                }
                return true;
            })
            .map(app => ({
                ...app,
                eventType: 'appointment'
            }));

        // Add Coaching Sessions
        const seekers = dataState.recoverySeekers || [];
        seekers.forEach(seeker => {
            const sessions = seeker.coachingSessions || [];
            sessions.forEach(session => {
                const dateStr = session.date;
                if (!dateStr) return;

                // No longer calculating startTimeStr, etc. handled by direct date/endTime usage below

                const origSession = {
                    id: session.id,
                    date: session.start_time || session.date,
                    endTime: session.end_time || session.endTime,
                    staffId: session.staff_id || session.staffId,
                    notes: session.notes,
                    progressRating: session.progressRating || session.progress_rating
                };

                events.push({
                    id: `coaching-${session.id}`,
                    title: `Coaching: ${seeker ? `${seeker.firstName} ${seeker.lastName}` : 'Unknown'}`,
                    start_time: session.start_time || session.date,
                    end_time: session.end_time || session.endTime,
                    is_all_day: false,
                    description: session.notes || '',
                    eventType: 'coaching',
                    originalSession: origSession,
                    seekerId: seeker.id
                });
            });
        });

        // Add Workshops
        const workshops = dataState.preventionSchedule || [];
        workshops.forEach(workshop => {
            if (!workshop.date) return;
            events.push({
                id: `ws-${workshop.id || Math.random()}`,
                title: `Workshop: ${workshop.title}`,
                start_time: workshop.date, // Actual datetime if available
                end_time: workshop.endTime || workshop.date, // Assuming endTime exists, otherwise falls back
                is_all_day: !workshop.date.includes('T') && !workshop.endTime, // If no time part
                description: workshop.notes || '',
                eventType: 'workshop',
                originalWorkshop: workshop
            });
        });

        return events;
    }, [appointments, dataState.recoverySeekers, dataState.preventionSchedule, selectedUser, user?.id, enabledCalendars, userCalendars, enabledStaff]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
        if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        if (view === 'day') newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
        if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        if (view === 'day') newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();

        // Calculate end time
        let endDateTime = new Date(newEvent.start_time);
        if (newEvent.is_all_day) {
            endDateTime.setHours(23, 59, 59, 999);
        } else {
            endDateTime.setHours(endDateTime.getHours() + parseInt(newEvent.durationHours));
            endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(newEvent.durationMinutes));
        }

        // Try to push to Outlook if connected
        const { data: conn } = await supabase.from('user_oauth_connections').select('id').eq('user_id', user.id).maybeSingle();
        if (conn) {
            try {
                const payload = {
                    action: 'createEvent',
                    userId: user.id,
                    subject: newEvent.title,
                    startDateTime: new Date(newEvent.start_time).toISOString(),
                    endDateTime: endDateTime.toISOString(),
                    bodyHtml: newEvent.description,
                    locationStr: newEvent.location,
                    isAllDay: newEvent.is_all_day,
                    transactionId: `localevent:${crypto.randomUUID()}`
                };

                const { error: pushError } = await supabase.functions.invoke('outlook-api', {
                    body: payload
                });

                // Even if graph fails, we can proceed to insert it locally (or handle as an alert)
                if (pushError) console.warn("Failed to push to graph api", pushError.message);
            } catch (err) {
                console.error(err);
            }
        }

        // Insert into Supabase (Fallback/Local immediately)
        const { error } = await supabase.from('appointments').insert({
            title: newEvent.title,
            start_time: new Date(newEvent.start_time).toISOString(),
            end_time: endDateTime.toISOString(),
            location: newEvent.location,
            description: newEvent.description,
            is_all_day: newEvent.is_all_day,
            contact_id: newEvent.contact_id || null,
            recovery_seeker_id: newEvent.recovery_seeker_id || null,
            user_id: newEvent.staff_id || user.id
        });

        if (!error) {
            setIsModalOpen(false);
            setNewEvent({ title: '', start_time: '', durationHours: 1, durationMinutes: 0, location: '', description: '', is_all_day: false, contact_id: '', recovery_seeker_id: '', staff_id: user?.id || '' });
            fetchAppointments();
        } else {
            alert('Error creating event locally: ' + error.message);
        }
    };

    const renderMonthGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        // Calculate number of weeks needed
        const totalCells = daysInMonth + firstDayIndex;
        const weeksCount = Math.ceil(totalCells / 7);

        const today = new Date();
        const tYear = today.getFullYear();
        const tMonth = today.getMonth();
        const tDate = today.getDate();

        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} style={{ background: 'var(--bg-body)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = allEvents.filter(app => {
                if (!app.start_time) return false;
                if (app.is_all_day) {
                    const startDate = app.start_time.split('T')[0];
                    const endDate = (app.end_time || app.start_time).split('T')[0];
                    return dateStr >= startDate && dateStr <= endDate;
                }
                const dt = new Date(app.start_time);
                if (isNaN(dt.getTime())) return false;
                return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === d;
            }).sort((a, b) => {
                // All-day events first
                if (a.is_all_day && !b.is_all_day) return -1;
                if (!a.is_all_day && b.is_all_day) return 1;
                // Then sort by start time
                return new Date(a.start_time) - new Date(b.start_time);
            });
            const isToday = tYear === year && tMonth === month && tDate === d;

            days.push(
                <div key={d} style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                    onDoubleClick={() => {
                        const newDate = new Date(year, month, d);
                        setCurrentDate(newDate);
                        setView('day');
                    }}
                >
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: isToday ? 'white' : 'var(--text-secondary)',
                            background: isToday ? 'var(--primary)' : 'transparent',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-full)'
                        }}>
                            {d}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', overflowY: 'auto', flex: 1 }}>
                        {dayEvents.map(ev => {
                            const tzTime = new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            let bgColor, borderLeft, textColor;
                            if (selectedUser === 'all' && ev.user_id) {
                                const sc = getStaffColor(ev.user_id);
                                bgColor = sc;
                                borderLeft = `3px solid rgba(0,0,0,0.15)`;
                                textColor = '#ffffff';
                            } else if (ev.graph_event_id) {
                                const calColor = getCalendarColor(ev.graph_calendar_id);
                                bgColor = calColor || '#0078D4';
                                borderLeft = `3px solid ${calColor ? 'rgba(0,0,0,0.15)' : '#005a9e'}`;
                                textColor = '#ffffff';
                            } else if (ev.eventType === 'coaching') {
                                bgColor = 'var(--success)';
                                borderLeft = '3px solid rgba(34, 197, 94, 0.15)';
                                textColor = '#000000';
                            } else if (ev.eventType === 'workshop') {
                                bgColor = 'var(--primary-light)';
                                borderLeft = '3px solid var(--primary)';
                                textColor = '#000000';
                            } else {
                                bgColor = '#ffffff';
                                borderLeft = '3px solid #e0e0e0';
                                textColor = '#000000';
                            }

                            return (
                                <div
                                    key={ev.id}
                                    style={{
                                        fontSize: 11,
                                        background: bgColor,
                                        color: textColor,
                                        borderLeft,
                                        padding: '4px 6px',
                                        borderRadius: 4,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'pointer',
                                        textAlign: ev.is_all_day ? 'center' : 'left'
                                    }}
                                    title={ev.title}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setSelectedEventInfo({ event: ev, rect });
                                    }}
                                >
                                    {!ev.is_all_day && <span style={{ opacity: 0.8, marginRight: 4 }}>{tzTime}</span>}
                                    {ev.title}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Fill remaining cells in the last week
        const totalGridCells = weeksCount * 7;
        for (let i = days.length; i < totalGridCells; i++) {
            days.push(<div key={`empty-end-${i}`} style={{ background: 'var(--bg-body)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}></div>);
        }

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                minHeight: 0
            }}>
                {/* Fixed day-name header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    flexShrink: 0,
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-main)'
                }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, padding: '12px 0', color: 'var(--text-muted)' }}>{d.toUpperCase()}</div>
                    ))}
                </div>
                {/* Scrollable grid body */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gridTemplateRows: `repeat(${weeksCount}, 1fr)`,
                        minHeight: '100%'
                    }}>
                        {days}
                    </div>
                </div>
            </div>
        );
    };

    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const renderTimeGridContainer = (daysData, isDayView) => {
        // Show grid from 7 AM to 11 PM
        const hours = Array.from({ length: 17 }, (_, i) => i + 7);

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'var(--bg-card)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', flexShrink: 0, paddingRight: 6 }}>
                    {/* Time axis spacer */}
                    <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--border)' }}></div>
                    {/* Day headers */}
                    {daysData.map((d, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', padding: isDayView ? '16px 0' : '12px 0', borderRight: i < daysData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            {isDayView ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                    <span style={{
                                        fontWeight: 600,
                                        fontSize: 24,
                                        color: d.isToday ? 'white' : 'var(--text-primary)',
                                        background: d.isToday ? 'var(--primary)' : 'transparent',
                                        width: 40,
                                        height: 40,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 'var(--radius-full)'
                                    }}>
                                        {d.date.getDate()}
                                    </span>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-muted)' }}>
                                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.date.getDay()]}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {d.date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.date.getDay()]}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <span style={{
                                            fontWeight: 600,
                                            fontSize: 15,
                                            color: d.isToday ? 'white' : 'var(--text-primary)',
                                            background: d.isToday ? 'var(--primary)' : 'transparent',
                                            width: 28,
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 'var(--radius-full)'
                                        }}>
                                            {d.date.getDate()}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* All-day events row */}
                {daysData.some(d => d.events.some(ev => ev.is_all_day)) && (() => {
                    const uniqueAllDayEvents = [];
                    const eventIds = new Set();
                    daysData.forEach((d, dayIndex) => {
                        d.events.filter(ev => ev.is_all_day).forEach(ev => {
                            if (!eventIds.has(ev.id)) {
                                eventIds.add(ev.id);
                                uniqueAllDayEvents.push({ ...ev, startDayIndex: dayIndex, endDayIndex: dayIndex });
                            } else {
                                const existing = uniqueAllDayEvents.find(e => e.id === ev.id);
                                if (existing) existing.endDayIndex = dayIndex;
                            }
                        });
                    });

                    const tracks = [];
                    uniqueAllDayEvents.sort((a, b) => (b.endDayIndex - b.startDayIndex) - (a.endDayIndex - a.startDayIndex) || a.startDayIndex - b.startDayIndex);
                    uniqueAllDayEvents.forEach(ev => {
                        let assigned = false;
                        for (let track of tracks) {
                            if (!track.some(e => !(ev.endDayIndex < e.startDayIndex || ev.startDayIndex > e.endDayIndex))) {
                                track.push(ev);
                                assigned = true;
                                break;
                            }
                        }
                        if (!assigned) tracks.push([ev]);
                    });

                    return (
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', flexShrink: 0, paddingRight: 6 }}>
                            <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>All day</span>
                            </div>
                            <div style={{ position: 'relative', flex: 1, minHeight: Math.max(28, tracks.length * 28 + 4) }}>
                                {/* Visual day dividers */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
                                    {daysData.map((_, i) => (
                                        <div key={i} style={{ flex: 1, borderRight: i < daysData.length - 1 ? '1px solid var(--border)' : 'none' }}></div>
                                    ))}
                                </div>
                                {/* Spanning Events */}
                                {tracks.map((track, trackIndex) => (
                                    track.map(ev => {
                                        const left = (ev.startDayIndex / daysData.length) * 100;
                                        const width = ((ev.endDayIndex - ev.startDayIndex + 1) / daysData.length) * 100;
                                        let bgColor = '#ffffff', borderLeftColor = '#e0e0e0', textColor = '#000000';
                                        if (selectedUser === 'all' && ev.user_id) {
                                            const sc = getStaffColor(ev.user_id);
                                            bgColor = sc; borderLeftColor = 'rgba(0,0,0,0.15)'; textColor = '#ffffff';
                                        } else if (ev.graph_event_id) {
                                            const calColor = getCalendarColor(ev.graph_calendar_id);
                                            bgColor = calColor || '#0078D4'; borderLeftColor = calColor ? 'rgba(0,0,0,0.15)' : '#005a9e'; textColor = '#ffffff';
                                        }
                                        else if (ev.eventType === 'coaching') { bgColor = 'var(--success)'; borderLeftColor = 'rgba(34,197,94,0.4)'; }
                                        else if (ev.eventType === 'workshop') { bgColor = 'var(--primary-light)'; borderLeftColor = 'var(--primary)'; }
                                        return (
                                            <div key={ev.id} style={{
                                                position: 'absolute',
                                                top: trackIndex * 26 + 4,
                                                left: `calc(${left}% + 4px)`,
                                                width: `calc(${width}% - 8px)`,
                                                fontSize: 11, background: bgColor, color: textColor, borderLeft: `3px solid ${borderLeftColor}`, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', zIndex: 1,
                                                textAlign: 'center'
                                            }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setSelectedEventInfo({ event: ev, rect });
                                                }}
                                                title={ev.title}
                                            >
                                                {ev.title}
                                            </div>
                                        );
                                    })
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Scrollable Body */}
                <div style={{ display: 'flex', flex: 1, overflowY: 'scroll' }}>
                    {/* Time axis */}
                    <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-main)', position: 'relative', zIndex: 10 }}>
                        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, bottom: 0 }}>
                            {hours.map(h => (
                                <div key={h} style={{ height: 60, position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: -8, right: 8, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0 4px', zIndex: 2 }}>
                                        {h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Days container */}
                    <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                        {/* Background timeline grid */}
                        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
                            {hours.map((h, i) => (
                                <div key={h} style={{ height: i === hours.length - 1 ? 59 : 60, borderBottom: '1px solid var(--border)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 30, left: 0, right: 0, borderTop: '1px dashed var(--border)', opacity: 0.3 }}></div>
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {daysData.map((d, i) => (
                            <div key={i} style={{ flex: 1, position: 'relative', borderRight: i < daysData.length - 1 ? '1px solid var(--border)' : 'none', zIndex: 1, minHeight: hours.length * 60 }}
                                onDoubleClick={() => {
                                    setCurrentDate(d.date);
                                    setView('day');
                                }}
                            >
                                {/* Events (all-day events shown above in banner row) */}
                                {d.events.filter(ev => !ev.is_all_day).map(ev => {
                                    const start = new Date(ev.start_time);
                                    let end = new Date(ev.end_time);
                                    if (isNaN(end.getTime())) end = start;

                                    let startMinsRaw, endMinsRaw;
                                    if (ev.is_all_day) {
                                        startMinsRaw = 0; // plot at top of visually displayed block
                                        endMinsRaw = 60;  // 1 hr block duration
                                    } else {
                                        startMinsRaw = (start.getHours() * 60 + start.getMinutes()) - (7 * 60);
                                        endMinsRaw = (end.getHours() * 60 + end.getMinutes()) - (7 * 60);

                                        // Account for events crossing midnight spanning into the next day
                                        if (end < start || end.getDate() !== start.getDate()) {
                                            endMinsRaw = hours.length * 60; // Cap at bottom of calendar grid visually
                                        }
                                    }

                                    if (endMinsRaw <= 0 || startMinsRaw >= hours.length * 60) return null;

                                    const startMins = Math.max(0, startMinsRaw);
                                    const endMins = Math.min(hours.length * 60, endMinsRaw);

                                    // Make duration strictly correspond to minute differences for grid rendering (1 min = 1px)
                                    const duration = Math.max(15, endMins - startMins);

                                    let bgColor, borderLeftColor, textColor;
                                    if (selectedUser === 'all' && ev.user_id) {
                                        const sc = getStaffColor(ev.user_id);
                                        bgColor = sc;
                                        borderLeftColor = 'rgba(0,0,0,0.15)';
                                        textColor = '#ffffff';
                                    } else if (ev.graph_event_id) {
                                        const calColor = getCalendarColor(ev.graph_calendar_id);
                                        bgColor = calColor || '#0078D4';
                                        borderLeftColor = calColor ? 'rgba(0,0,0,0.15)' : '#005a9e';
                                        textColor = '#ffffff';
                                    } else if (ev.eventType === 'coaching') {
                                        bgColor = 'var(--success)';
                                        borderLeftColor = 'rgba(34, 197, 94, 0.4)';
                                        textColor = '#000000';
                                    } else if (ev.eventType === 'workshop') {
                                        bgColor = 'var(--primary-light)';
                                        borderLeftColor = 'var(--primary)';
                                        textColor = '#000000';
                                    } else {
                                        bgColor = '#ffffff';
                                        borderLeftColor = '#e0e0e0';
                                        textColor = '#000000';
                                    }

                                    return (
                                        <div key={ev.id} style={{
                                            position: 'absolute',
                                            top: startMins + 12,
                                            height: duration,
                                            left: 4,
                                            right: 4,
                                            background: bgColor,
                                            borderLeft: `3px solid ${borderLeftColor}`,
                                            borderRadius: 4,
                                            padding: duration <= 30 ? '2px 6px' : '4px 6px',
                                            fontSize: 11,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: duration <= 30 ? 'center' : 'flex-start',
                                            gap: duration <= 30 ? 0 : 2,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            cursor: 'pointer',
                                            color: textColor,
                                            zIndex: 2
                                        }} title={`${ev.title}\n${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setSelectedEventInfo({ event: ev, rect });
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: duration <= 30 ? '1' : '1.2' }}>{ev.title}</div>
                                            {duration >= 45 && (
                                                <div style={{ fontSize: 10, color: textColor, opacity: 0.8 }}>
                                                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekGrid = () => {
        const startDate = getStartOfWeek(currentDate);
        const today = new Date();
        const daysData = [];

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
            const dayEvents = allEvents.filter(app => {
                if (!app.start_time) return false;
                if (app.is_all_day) {
                    const startDate = app.start_time.split('T')[0];
                    const endDate = (app.end_time || app.start_time).split('T')[0];
                    return dateStr >= startDate && dateStr <= endDate;
                }
                const dt = new Date(app.start_time);
                if (isNaN(dt.getTime())) return false;
                return dt.getFullYear() === currentDay.getFullYear() && dt.getMonth() === currentDay.getMonth() && dt.getDate() === currentDay.getDate();
            });
            const isToday = today.getFullYear() === currentDay.getFullYear() && today.getMonth() === currentDay.getMonth() && today.getDate() === currentDay.getDate();
            daysData.push({ date: currentDay, events: dayEvents, isToday, dateStr });
        }

        return renderTimeGridContainer(daysData, false);
    };

    const renderDayGrid = () => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const dayEvents = allEvents.filter(app => {
            if (!app.start_time) return false;
            if (app.is_all_day) {
                const startDate = app.start_time.split('T')[0];
                const endDate = (app.end_time || app.start_time).split('T')[0];
                return dateStr >= startDate && dateStr <= endDate;
            }
            const dt = new Date(app.start_time);
            if (isNaN(dt.getTime())) return false;
            return dt.getFullYear() === currentDate.getFullYear() && dt.getMonth() === currentDate.getMonth() && dt.getDate() === currentDate.getDate();
        });
        const today = new Date();
        const isToday = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === currentDate.getDate();

        return renderTimeGridContainer([{ date: currentDate, events: dayEvents, isToday, dateStr }], true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <div className="page-header" style={{ flexShrink: 0, paddingLeft: 'var(--space-xl)', paddingRight: 'var(--space-xl)' }}>
                <div className="page-header-left">
                    <h1>Calendar</h1>
                    <div className="page-header-subtitle">Manage your schedule and team appointments</div>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 'var(--space-md)', width: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                        <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                        <select
                            style={{ border: 'none', background: 'transparent', fontSize: 14, outline: 'none', cursor: 'pointer', color: 'var(--text)' }}
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="all">All Members</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                            ))}
                        </select>
                    </div>

                    {true && (
                        <button
                            className={`btn btn-secondary ${isSyncingOutlook ? 'loading' : ''}`}
                            onClick={() => fetchOutlookEvents(selectedUser, true)}
                            disabled={isSyncingOutlook}
                            style={{ flexShrink: 0, width: 'auto' }}
                        >
                            <RefreshCw style={{
                                width: 14,
                                height: 14,
                                marginRight: 8,
                                animation: isSyncingOutlook ? 'spin 2s linear infinite' : 'none'
                            }} />
                            {isSyncingOutlook ? 'Syncing...' : 'Sync Outlook'}
                        </button>
                    )}

                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ flexShrink: 0, width: 'auto', flex: 'none' }}>
                        <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                        New Event
                    </button>
                </div>
            </div>

            <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 var(--space-xl) var(--space-xl)', overflow: 'hidden' }}>
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, margin: 0, border: 'none', background: 'transparent', overflow: 'hidden' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', padding: '16px 24px', flexShrink: 0, background: 'var(--bg-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                            <DateTimePicker
                                mode="date"
                                value={currentDate}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setCurrentDate(new Date(e.target.value));
                                    }
                                }}
                                customTrigger={(formatted) => (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            background: 'var(--bg-input)',
                                            padding: '8px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {formatted}
                                        </span>
                                    </div>
                                )}
                            />
                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                <button className="btn btn-secondary btn-sm" onClick={handlePrev}><ChevronLeft size={16} /></button>
                                <button className="btn btn-secondary btn-sm" onClick={handleToday}>Today</button>
                                <button className="btn btn-secondary btn-sm" onClick={handleNext}><ChevronRight size={16} /></button>
                            </div>
                            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 600, minWidth: 200 }}>
                                {view === 'month' && currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                {view === 'week' && `Week of ${getStartOfWeek(currentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                {view === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 2, borderRadius: 'var(--radius-sm)' }}>
                            <button className={`btn btn-sm ${view === 'month' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setView('month')}>Month</button>
                            <button className={`btn btn-sm ${view === 'week' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setView('week')}>Week</button>
                            <button className={`btn btn-sm ${view === 'day' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setView('day')}>Day</button>
                        </div>
                    </div>

                    {/* Calendar filter chips — only shown when viewing own diary with multiple calendars */}
                    {selectedUser === user?.id && userCalendars.length > 1 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                            padding: '8px 24px', borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-main)', flexShrink: 0
                        }}>
                            <Filter size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 2 }}>Calendars:</span>
                            {userCalendars.map(cal => {
                                const isOn = enabledCalendars.has(cal.graph_calendar_id);
                                return (
                                    <div key={cal.graph_calendar_id} style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setEnabledCalendars(prev => {
                                                const next = new Set(prev);
                                                if (next.has(cal.graph_calendar_id)) {
                                                    next.delete(cal.graph_calendar_id);
                                                } else {
                                                    next.add(cal.graph_calendar_id);
                                                }
                                                return next;
                                            })}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                                border: `2px solid ${isOn ? cal.color : 'var(--border)'}`,
                                                background: isOn ? `${cal.color}22` : 'transparent',
                                                color: isOn ? cal.color : 'var(--text-secondary)',
                                                fontSize: 12, cursor: 'pointer',
                                                fontWeight: isOn ? 600 : 400,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setColorPickerCalId(prev => prev === cal.graph_calendar_id ? null : cal.graph_calendar_id); }}
                                                title="Click to change colour"
                                                style={{
                                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                                    background: isOn ? cal.color : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    border: '1px solid rgba(0,0,0,0.15)',
                                                    transition: 'transform 0.15s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                            {cal.name}
                                            {cal.is_default && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>work</span>}
                                        </button>

                                        {/* Color picker popover */}
                                        {colorPickerCalId === cal.graph_calendar_id && (
                                            <div ref={colorPickerRef} style={{
                                                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)', padding: 8,
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
                                                zIndex: 100, animation: 'fadeslide 0.15s ease-out'
                                            }}>
                                                {STAFF_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            // Update local state immediately
                                                            setUserCalendars(prev => prev.map(uc =>
                                                                uc.graph_calendar_id === cal.graph_calendar_id ? { ...uc, color: c } : uc
                                                            ));
                                                            setColorPickerCalId(null);
                                                            // Persist to Supabase
                                                            await supabase.from('user_calendars')
                                                                .update({ color: c })
                                                                .eq('user_id', user.id)
                                                                .eq('graph_calendar_id', cal.graph_calendar_id);
                                                        }}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: '50%',
                                                            background: c, border: c === cal.color ? '2px solid var(--text-primary)' : '2px solid transparent',
                                                            cursor: 'pointer', padding: 0,
                                                            transition: 'transform 0.1s, border-color 0.1s',
                                                            outline: 'none'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Staff member filter chips — only shown in All Members view */}
                    {selectedUser === 'all' && staffList.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                            padding: '8px 24px', borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-main)', flexShrink: 0
                        }}>
                            <Filter size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 2 }}>Staff:</span>
                            {staffList.map(s => {
                                const color = getStaffColor(s.id);
                                const isOn = enabledStaff.has(s.id);
                                return (
                                    <div key={s.id} style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setEnabledStaff(prev => {
                                                const next = new Set(prev);
                                                if (next.has(s.id)) {
                                                    next.delete(s.id);
                                                } else {
                                                    next.add(s.id);
                                                }
                                                return next;
                                            })}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                                border: `2px solid ${isOn ? color : 'var(--border)'}`,
                                                background: isOn ? `${color}22` : 'transparent',
                                                color: isOn ? color : 'var(--text-secondary)',
                                                fontSize: 12, cursor: 'pointer',
                                                fontWeight: isOn ? 600 : 400,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setColorPickerStaffId(prev => prev === s.id ? null : s.id); }}
                                                title="Click to change colour"
                                                style={{
                                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                                    background: isOn ? color : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    border: '1px solid rgba(0,0,0,0.15)',
                                                    transition: 'transform 0.15s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                            {s.firstName} {s.lastName}
                                        </button>

                                        {/* Color picker popover */}
                                        {colorPickerStaffId === s.id && (
                                            <div ref={colorPickerRef} style={{
                                                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)', padding: 8,
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
                                                zIndex: 100, animation: 'fadeslide 0.15s ease-out'
                                            }}>
                                                {STAFF_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStaffColorOverrides(prev => ({ ...prev, [s.id]: c }));
                                                            setColorPickerStaffId(null);
                                                        }}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: '50%',
                                                            background: c, border: c === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                                                            cursor: 'pointer', padding: 0,
                                                            transition: 'transform 0.1s, border-color 0.1s',
                                                            outline: 'none'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-md)', background: 'var(--bg-main)', minHeight: 0, overflow: 'hidden' }}>
                        {loading ? (
                            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading appointments...</div>
                        ) : (
                            <>
                                {view === 'month' && renderMonthGrid()}
                                {view === 'week' && renderWeekGrid()}
                                {view === 'day' && renderDayGrid()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add / Edit Appointment Modal (existing logic omitted for brevity in updates, using standard Modal) */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Event">
                <form onSubmit={handleCreateEvent}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Event Title *</label>
                            <input className="form-input" required value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Meeting with..." />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Start Date & Time *</label>
                                <DateTimePicker required name="start_time" value={newEvent.start_time} onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Duration (Hours)</label>
                                <select className="form-input" value={newEvent.durationHours} onChange={e => {
                                    const h = parseInt(e.target.value);
                                    let m = newEvent.durationMinutes;
                                    if (h === 0 && m < 15) m = 15;
                                    setNewEvent({ ...newEvent, durationHours: h, durationMinutes: m });
                                }}>
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h} hr{h !== 1 ? 's' : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Duration (Minutes)</label>
                                <select className="form-input" value={newEvent.durationMinutes} onChange={e => {
                                    const m = parseInt(e.target.value);
                                    let h = newEvent.durationHours;
                                    if (h === 0 && m < 15) h = 1;
                                    setNewEvent({ ...newEvent, durationMinutes: m, durationHours: h });
                                }}>
                                    {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m} mins</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assigned Member *</label>
                            <select className="form-input" required value={newEvent.staff_id} onChange={e => setNewEvent({ ...newEvent, staff_id: e.target.value })}>
                                <option value="">Select Staff Member</option>
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="checkbox" id="allDay" checked={newEvent.is_all_day} onChange={e => setNewEvent({ ...newEvent, is_all_day: e.target.checked })} />
                            <label htmlFor="allDay" style={{ fontSize: 13, userSelect: 'none' }}>All Day Event</label>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" style={{ paddingLeft: 36 }} value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Online, Office..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description (Optional)</label>
                            <textarea className="form-input" rows="3" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Notes..."></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Link to Contact (Optional)</label>
                            <select className="form-input" value={newEvent.contact_id} onChange={e => setNewEvent({ ...newEvent, contact_id: e.target.value, recovery_seeker_id: '' })}>
                                <option value="">-- No Contact --</option>
                                {dataState.contacts?.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Or Link to Recovery Seeker (Optional)</label>
                            <select className="form-input" value={newEvent.recovery_seeker_id} onChange={e => setNewEvent({ ...newEvent, recovery_seeker_id: e.target.value, contact_id: '' })}>
                                <option value="">-- No Seeker --</option>
                                {dataState.recoverySeekers?.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Event</button>
                    </div>
                </form>
            </Modal>

            {/* Enhanced Appointment Detail Popover */}
            {selectedEventInfo && (() => {
                const { rect, event } = selectedEventInfo;
                const cardWidth = 320;
                const cardHeight = 450; // Estimated max height for positioning
                const margin = 12;

                // Default: Right of pill, centered vertically
                let left = rect.right + margin;
                let top = rect.top + (rect.height / 2) - (cardHeight / 2);
                let placement = 'right';

                // Flip to left if not enough space on right
                if (left + cardWidth > window.innerWidth) {
                    left = rect.left - cardWidth - margin;
                    placement = 'left';
                }

                // Constrain top/bottom
                if (top < 10) top = 10;
                if (top + cardHeight > window.innerHeight) {
                    top = Math.max(10, window.innerHeight - cardHeight - 10);
                }

                // Triangle pointer position (relative to card top)
                const arrowTop = Math.max(20, Math.min(cardHeight - 20, rect.top + (rect.height / 2) - top));

                return (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 9999
                        }}
                        onClick={() => setSelectedEventInfo(null)}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top,
                                left,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 300,
                                maxWidth: cardWidth,
                                maxHeight: cardHeight,
                                zIndex: 10000,
                                overflow: 'hidden',
                                animation: 'fadeslide 0.2s ease-out'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Triangle Arrow */}
                            <div style={{
                                position: 'absolute',
                                top: arrowTop,
                                [placement === 'right' ? 'left' : 'right']: -6,
                                width: 12,
                                height: 12,
                                background: 'var(--bg-card)',
                                borderLeft: placement === 'right' ? '1px solid var(--border)' : 'none',
                                borderBottom: placement === 'right' ? '1px solid var(--border)' : 'none',
                                borderRight: placement === 'left' ? '1px solid var(--border)' : 'none',
                                borderTop: placement === 'left' ? '1px solid var(--border)' : 'none',
                                transform: 'translateY(-50%) rotate(45deg)',
                                zIndex: -1
                            }}></div>

                            {/* Header color stripe */}
                            <div style={{ height: 6, width: '100%', background: event.graph_event_id ? '#0078D4' : 'var(--primary)', flexShrink: 0 }}></div>

                            {/* Scrollable Content */}
                            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                        {selectedEventInfo.event.title}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedEventInfo(null)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                    >
                                        <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                                        <Clock size={16} />
                                        <div>
                                            {selectedEventInfo.event.is_all_day ? 'All Day' : (
                                                <>
                                                    {new Date(selectedEventInfo.event.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    <div style={{ fontWeight: 600 }}>
                                                        {new Date(selectedEventInfo.event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(selectedEventInfo.event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {selectedEventInfo.event.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                                            <MapPin size={16} />
                                            <span>{selectedEventInfo.event.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Teams Meeting Link */}
                                {selectedEventInfo.event.online_meeting_url && (
                                    <div style={{ marginBottom: 20 }}>
                                        <a
                                            href={selectedEventInfo.event.online_meeting_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                            style={{ width: '100%', justifyContent: 'center', background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}
                                        >
                                            <Video size={16} style={{ marginRight: 8 }} />
                                            Join Meeting
                                        </a>
                                    </div>
                                )}

                                {/* Organizer & Attendees */}
                                {(selectedEventInfo.event.organizer?.emailAddress || selectedEventInfo.event.attendees?.length > 0) && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                        {/* Invitation status like Outlook */}
                                        {selectedEventInfo.event.organizer?.emailAddress && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: '50%', background: '#10B981', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
                                                    overflow: 'hidden'
                                                }}>
                                                    {(selectedEventInfo.event.organizer.emailAddress.name || selectedEventInfo.event.organizer.emailAddress.address || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {selectedEventInfo.event.organizer.emailAddress.name || selectedEventInfo.event.organizer.emailAddress.address} invited you.
                                                    </span>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {selectedEventInfo.event.response_status?.response === 'accepted' ? 'You accepted.' :
                                                            selectedEventInfo.event.response_status?.response === 'tentativelyAccepted' ? 'You tentatively accepted.' :
                                                                selectedEventInfo.event.response_status?.response === 'declined' ? 'You declined.' : 'Invitation pending.'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {selectedEventInfo.event.attendees?.length > 0 && (
                                            <>
                                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.5px' }}>
                                                    Other Participants
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {selectedEventInfo.event.attendees?.slice(0, 4).map((attendee, idx) => (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', color: '#64748B',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600
                                                            }}>
                                                                {(attendee.emailAddress.name || attendee.emailAddress.address || 'A').charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{attendee.emailAddress.name || attendee.emailAddress.address}</span>
                                                        </div>
                                                    ))}
                                                    {selectedEventInfo.event.attendees?.length > 4 && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 42 }}>
                                                            + {selectedEventInfo.event.attendees.length - 4} more
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* CRM Links */}
                                <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                                    {selectedEventInfo.event.contact_id && (
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={() => navigate(`/contacts/${selectedEventInfo.event.contact_id}`)}>
                                            <User size={14} style={{ marginRight: 6 }} />
                                            Contact
                                        </button>
                                    )}
                                    {selectedEventInfo.event.recovery_seeker_id && (
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={() => navigate(`/recovery-seekers/${selectedEventInfo.event.recovery_seeker_id}`)}>
                                            <User size={14} style={{ marginRight: 6 }} />
                                            Seeker
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Extracted Editing Modals */}
            <WorkshopModal
                isOpen={!!editingWorkshop}
                onClose={() => setEditingWorkshop(null)}
                editItem={editingWorkshop}
            />

            <CoachingSessionModal
                isOpen={!!editingCoachingSession}
                onClose={() => { setEditingCoachingSession(null); setEditingCoachingSeekerId(null); }}
                session={editingCoachingSession}
                seekerId={editingCoachingSeekerId}
            />
        </div >
    );
}
