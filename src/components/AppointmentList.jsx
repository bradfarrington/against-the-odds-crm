import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

export default function AppointmentList({ linkedId, linkedType }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        setLoading(true);
        let query = supabase.from('appointments').select('*').order('start_time', { ascending: false });

        if (linkedType === 'seeker') {
            query = query.eq('recovery_seeker_id', linkedId);
        } else {
            query = query.eq('contact_id', linkedId);
        }

        const { data, error } = await query;
        if (!error && data) {
            setAppointments(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (linkedId) {
            fetchAppointments();
        }
    }, [linkedId, linkedType]);

    if (loading) {
        return <div style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Loading appointments...</div>;
    }

    if (appointments.length === 0) {
        return (
            <div className="empty-state">
                <CalendarIcon />
                <h3>No Appointments</h3>
                <p>There are no upcoming or past appointments linked to this person.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {appointments.map(app => (
                <div key={app.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{app.title}</div>
                        <span className={`status-badge ${new Date(app.end_time) < new Date() ? 'status-completed' : 'status-active'}`}>
                            {new Date(app.end_time) < new Date() ? 'Past' : 'Upcoming'}
                        </span>
                    </div>
                    {(app.start_time || app.end_time) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            <Clock size={14} />
                            {new Date(app.start_time).toLocaleString()} - {new Date(app.end_time).toLocaleTimeString()}
                        </div>
                    )}
                    {app.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            <MapPin size={14} /> {app.location}
                        </div>
                    )}
                    {app.description && (
                        <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-body)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                            {app.description}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
