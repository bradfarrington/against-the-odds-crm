import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function DateTimePicker({ value, onChange, required, name, mode = 'datetime', showIcon = true, customTrigger, dropdownAlign = 'left' }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    // 'days' | 'months' | 'years'
    const [viewMode, setViewMode] = useState('days');

    const [internalValue, setInternalValue] = useState(value || '');

    // Parse the incoming 'YYYY-MM-DDTHH:mm' string or default to today at nearest 15-min
    const getInitialDate = () => {
        if (internalValue) {
            const d = new Date(internalValue);
            if (!isNaN(d.getTime())) return d;
        }
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedMin = Math.ceil(minutes / 15) * 15;
        now.setMinutes(roundedMin);
        now.setSeconds(0);
        now.setMilliseconds(0);
        return now;
    };

    const [selectedDate, setSelectedDate] = useState(getInitialDate());

    // Sync from prop to internal if parent controls value
    useEffect(() => {
        if (value !== undefined && value !== internalValue) {
            setInternalValue(value);
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setSelectedDate(d);
            }
        }
    }, [value]);

    // Update internal state and call onChange if available
    const updateDate = (newDate) => {
        setSelectedDate(newDate);

        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const day = String(newDate.getDate()).padStart(2, '0');

        let newValue;
        if (mode === 'date') {
            newValue = `${year}-${month}-${day}`;
        } else {
            const hours = String(newDate.getHours()).padStart(2, '0');
            const minutes = String(newDate.getMinutes()).padStart(2, '0');
            newValue = `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        setInternalValue(newValue);
        if (onChange) {
            onChange({ target: { name, value: newValue } });
        }
    };

    // Handle clicks outside to close the dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate calendar with days/months/years drill-down
    const renderMonthCalendar = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const today = new Date();

        // Year grid for "years" view
        const decadeStart = Math.floor(year / 12) * 12;
        const yearGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

        // Header click cycles: days → months → years
        const handleHeaderClick = () => {
            if (viewMode === 'days') setViewMode('months');
            else if (viewMode === 'months') setViewMode('years');
        };

        // Arrow handlers depend on viewMode
        const handlePrev = () => {
            const nd = new Date(selectedDate);
            if (viewMode === 'years') nd.setFullYear(decadeStart - 12);
            else if (viewMode === 'months') nd.setFullYear(nd.getFullYear() - 1);
            else nd.setMonth(nd.getMonth() - 1);
            setSelectedDate(nd);
        };
        const handleNext = () => {
            const nd = new Date(selectedDate);
            if (viewMode === 'years') nd.setFullYear(decadeStart + 12);
            else if (viewMode === 'months') nd.setFullYear(nd.getFullYear() + 1);
            else nd.setMonth(nd.getMonth() + 1);
            setSelectedDate(nd);
        };

        // Header text
        let headerText;
        if (viewMode === 'years') headerText = `${yearGrid[0]} – ${yearGrid[yearGrid.length - 1]}`;
        else if (viewMode === 'months') headerText = String(year);
        else headerText = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Cell style helper for months/years grids
        const cellStyle = (isActive, isHighlight) => ({
            padding: '8px 4px', textAlign: 'center', fontSize: 13,
            fontWeight: isActive ? 600 : 400, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            color: isActive ? '#fff' : 'var(--text-primary)',
            background: isActive ? 'var(--primary)' : 'transparent',
            border: isHighlight && !isActive ? '1px solid var(--primary-light)' : '1px solid transparent',
            transition: 'var(--transition-fast)',
        });

        return (
            <div style={{ flex: 1, borderRight: mode === 'datetime' ? '1px solid var(--border)' : 'none', paddingRight: mode === 'datetime' ? '16px' : '0' }}>
                {/* Header with clickable drill-down */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handlePrev}>←</button>
                    <button
                        type="button"
                        onClick={handleHeaderClick}
                        style={{
                            background: 'none', border: 'none', cursor: viewMode !== 'years' ? 'pointer' : 'default',
                            fontWeight: 600, fontSize: 13, color: 'var(--primary)', padding: '4px 8px', fontFamily: 'inherit',
                        }}
                    >
                        {headerText}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleNext}>→</button>
                </div>

                {/* Days view */}
                {viewMode === 'days' && (() => {
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const daySlots = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                        daySlots.push(<div key={`empty-${i}`} style={{ padding: '6px' }} />);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                        const isSelected = d === selectedDate.getDate();
                        const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        daySlots.push(
                            <button
                                key={d}
                                type="button"
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setDate(d);
                                    updateDate(newDate);
                                }}
                                style={{
                                    padding: '6px 0', textAlign: 'center', fontSize: '13px',
                                    fontWeight: isSelected ? '600' : '400',
                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                    borderRadius: 'var(--radius-sm)',
                                    border: isToday && !isSelected ? '1px solid var(--primary-light)' : '1px solid transparent',
                                    cursor: 'pointer', transition: 'var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {d}
                            </button>
                        );
                    }
                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{day}</div>
                            ))}
                            {daySlots}
                        </div>
                    );
                })()}

                {/* Months view */}
                {viewMode === 'months' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {MONTHS.map((m, i) => {
                            const isCurrent = i === month;
                            const isThisMonth = today.getFullYear() === year && today.getMonth() === i;
                            return (
                                <button
                                    key={m} type="button"
                                    onClick={() => { setSelectedDate(new Date(year, i, 1)); setViewMode('days'); }}
                                    style={cellStyle(isCurrent, isThisMonth)}
                                    onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                    onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                                >{m}</button>
                            );
                        })}
                    </div>
                )}

                {/* Years view */}
                {viewMode === 'years' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {yearGrid.map(y => {
                            const isCurrent = y === year;
                            const isThisYear = y === today.getFullYear();
                            return (
                                <button
                                    key={y} type="button"
                                    onClick={() => { setSelectedDate(new Date(y, month, 1)); setViewMode('months'); }}
                                    style={cellStyle(isCurrent, isThisYear)}
                                    onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                    onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                                >{y}</button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Generate time selectors
    const renderTimePicker = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = [0, 15, 30, 45]; // STRICT 15 MIN INCREMENTS

        return (
            <div style={{ width: '120px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, marginBottom: '4px', color: 'var(--text-primary)' }}>Time</div>
                <div style={{ display: 'flex', gap: '8px', height: '180px' }}>

                    {/* Hours List */}
                    <div className="datetime-picker-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', scrollbarWidth: 'none' }}>
                        {hours.map(h => {
                            const isSelected = h === selectedDate.getHours();
                            return (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setHours(h);
                                        updateDate(newDate);
                                    }}
                                    style={{
                                        padding: '6px 0',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? '600' : '400',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {String(h).padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Minutes List */}
                    <div className="datetime-picker-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', scrollbarWidth: 'none' }}>
                        {minutes.map(m => {
                            const isSelected = m === selectedDate.getMinutes();
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setMinutes(m);
                                        updateDate(newDate);
                                    }}
                                    style={{
                                        padding: '6px 0',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? '600' : '400',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {String(m).padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const displayVal = internalValue || value;
    const formattedDisplay = displayVal
        ? new Date(displayVal).toLocaleDateString('en-GB', mode === 'date' ? {
            day: '2-digit', month: '2-digit', year: 'numeric'
        } : {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        })
        : mode === 'date' ? 'Select Date' : 'Select Date & Time';

    // Used for standard HTML form submitting
    const hiddenInputValue = displayVal || '';

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

            {/* Hidden Input for Form HTML Data */}
            <input type="hidden" name={name} value={hiddenInputValue} required={required} />

            {/* Display Button */}
            {customTrigger ? (
                <div onClick={() => { setIsOpen(!isOpen); if (!isOpen) setViewMode('days'); }} style={{ cursor: 'pointer' }}>
                    {customTrigger(formattedDisplay)}
                </div>
            ) : (
                <button
                    type="button"
                    className="form-input"
                    onClick={() => { setIsOpen(!isOpen); if (!isOpen) setViewMode('days'); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        textAlign: 'left'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {showIcon && <CalendarIcon size={16} color="var(--text-muted)" />}
                        <span style={{ color: displayVal ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {formattedDisplay}
                        </span>
                    </div>
                    {mode === 'datetime' && <Clock size={16} color="var(--primary)" />}
                </button>
            )}

            {/* Dropdown Popup */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    ...(dropdownAlign === 'right' ? { right: 0 } : { left: 0 }),
                    zIndex: 9999,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '16px',
                    display: 'flex',
                    width: mode === 'date' ? '280px' : '400px'
                }}>
                    {renderMonthCalendar()}
                    {mode === 'datetime' && renderTimePicker()}
                    <style>{`
                        .datetime-picker-scroll::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
