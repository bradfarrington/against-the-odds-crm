import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../lib/api';
import { ChevronRight, Check, Calendar as CalendarIcon } from 'lucide-react';

// ─── Theme helpers ────────────────────────────────────────────

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance({ r, g, b }) {
    const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/** Lighten a color by adding an offset (works on black) */
function lift(hex, offset) {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${Math.min(255, r + offset)}, ${Math.min(255, g + offset)}, ${Math.min(255, b + offset)})`;
}

function darken(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const f = 1 - amount;
    return `rgb(${Math.max(0, Math.round(r * f))}, ${Math.max(0, Math.round(g * f))}, ${Math.max(0, Math.round(b * f))})`;
}

function alpha(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Build a full theme object from settings */
function buildTheme(bgColor, accentColor, cardBgColor, cardShadow, inputBgColor, fontColor) {
    const bg = bgColor || '#1a1a2e';
    const accent = accentColor || '#FF6100';
    const lum = luminance(hexToRgb(bg));
    const isDark = lum < 0.35;

    const SHADOW_MAP = {
        none: 'none',
        sm: '0 1px 6px rgba(0,0,0,0.08)',
        md: '0 4px 24px rgba(0,0,0,0.12)',
        lg: '0 8px 40px rgba(0,0,0,0.18)',
        xl: '0 12px 60px rgba(0,0,0,0.25)',
    };

    if (isDark) {
        const card = cardBgColor || '#1e1e2e';
        return {
            isDark: true,
            pageBg: bg,
            cardBg: card,
            cardBorder: '#2e2e42',
            cardShadow: SHADOW_MAP[cardShadow] || SHADOW_MAP.md,
            inputBg: inputBgColor || '#161624',
            inputBorder: '#363650',
            inputFocusBorder: accent,
            textPrimary: fontColor || '#f1f5f9',
            textSecondary: fontColor || '#94a3b8',
            textMuted: fontColor ? alpha(fontColor, 0.5) : '#64748b',
            choiceBg: '#1a1a2c',
            choiceBorder: '#2e2e42',
            choiceHoverBorder: '#4a4a66',
            choiceSelectedBg: alpha(accent, 0.15),
            choiceSelectedBorder: accent,
            choiceSelectedText: fontColor || '#f1f5f9',
            accent,
            accentHover: lift(accent, 25),
            accentGlow: alpha(accent, 0.18),
            successBg: 'rgba(22, 163, 74, 0.15)',
            successColor: '#4ade80',
            errorColor: '#f87171',
            shadow: SHADOW_MAP[cardShadow] || SHADOW_MAP.md,
            progressTrack: '#2e2e42',
        };
    } else {
        const card = cardBgColor || '#ffffff';
        return {
            isDark: false,
            pageBg: bg,
            cardBg: card,
            cardBorder: darken(bg, 0.08),
            cardShadow: SHADOW_MAP[cardShadow] || SHADOW_MAP.md,
            inputBg: inputBgColor || '#ffffff',
            inputBorder: '#d1d5db',
            inputFocusBorder: accent,
            textPrimary: fontColor || '#111827',
            textSecondary: fontColor || '#4b5563',
            textMuted: fontColor ? alpha(fontColor, 0.5) : '#9ca3af',
            choiceBg: '#f9fafb',
            choiceBorder: '#e5e7eb',
            choiceHoverBorder: '#9ca3af',
            choiceSelectedBg: alpha(accent, 0.08),
            choiceSelectedBorder: accent,
            choiceSelectedText: fontColor || '#111827',
            accent,
            accentHover: darken(accent, 0.1),
            accentGlow: alpha(accent, 0.12),
            successBg: '#dcfce7',
            successColor: '#16a34a',
            errorColor: '#ef4444',
            shadow: SHADOW_MAP[cardShadow] || SHADOW_MAP.md,
            progressTrack: '#e5e7eb',
        };
    }
}

// ─── CSS generator ────────────────────────────────────────────

function generateCSS(theme) {
    return `
        .ps-page { min-height: 100vh; background: ${theme.pageBg}; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
        .ps-progress-track { position: fixed; top: 0; left: 0; right: 0; height: 4px; background: ${theme.progressTrack}; z-index: 100; }
        .ps-progress-fill { height: 100%; border-radius: 0 2px 2px 0; transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .ps-card { width: 100%; max-width: 680px; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 16px; overflow: visible; box-shadow: ${theme.cardShadow}; }
        .ps-card-body { padding: 40px; }
        @media (max-width: 600px) { .ps-card-body { padding: 24px 20px; } }

        .ps-question { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .ps-q-label { font-size: 16px; font-weight: 600; color: ${theme.textPrimary}; line-height: 1.4; }
        .ps-q-required { color: ${theme.accent}; margin-left: 3px; }
        .ps-q-hint { font-size: 13px; color: ${theme.textSecondary}; line-height: 1.5; margin-top: -4px; }

        .ps-input { width: 100%; padding: 10px 14px; border: 1px solid ${theme.inputBorder}; border-radius: 8px; font-size: 15px; color: ${theme.textPrimary}; background: ${theme.inputBg}; outline: none; transition: border-color 0.2s; font-family: inherit; }
        .ps-input:focus { border-color: ${theme.inputFocusBorder}; }
        .ps-input::placeholder { color: ${theme.textMuted}; }
        .ps-input option { color: ${theme.textPrimary}; background: ${theme.inputBg}; }
        select.ps-input { cursor: pointer; appearance: auto; }
        textarea.ps-input { resize: vertical; }

        .ps-choices { display: flex; flex-direction: column; gap: 8px; }
        .ps-choice { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid ${theme.choiceBorder}; border-radius: 8px; background: ${theme.choiceBg}; font-size: 14px; color: ${theme.textSecondary}; cursor: pointer; text-align: left; transition: border-color 0.15s, background 0.15s, color 0.15s; user-select: none; font-family: inherit; }
        .ps-choice:hover { border-color: ${theme.choiceHoverBorder}; color: ${theme.textPrimary}; }
        .ps-choice.selected { border-color: ${theme.choiceSelectedBorder}; background: ${theme.choiceSelectedBg}; color: ${theme.choiceSelectedText}; }

        .ps-choice-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${theme.choiceBorder}; flex-shrink: 0; transition: border-color 0.15s, background 0.15s; }
        .ps-choice.selected .ps-choice-dot { border-color: ${theme.accent}; background: ${theme.accent}; }

        .ps-checkbox-dot { width: 16px; height: 16px; border-radius: 4px; border: 2px solid ${theme.choiceBorder}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; transition: border-color 0.15s, background 0.15s; }
        .ps-choice.selected .ps-checkbox-dot { border-color: ${theme.accent}; background: ${theme.accent}; color: #fff; }

        .ps-dd-multi-wrap { position: relative; }
        .ps-dd-multi-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 14px; border: 1px solid ${theme.inputBorder}; border-radius: 8px; font-size: 15px; color: ${theme.textPrimary}; background: ${theme.inputBg}; cursor: pointer; transition: border-color 0.2s; font-family: inherit; min-height: 44px; text-align: left; }
        .ps-dd-multi-btn:focus { border-color: ${theme.inputFocusBorder}; outline: none; }
        .ps-dd-multi-placeholder { color: ${theme.textMuted}; }
        .ps-dd-multi-tags { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
        .ps-dd-multi-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 14px; font-size: 12px; font-weight: 500; background: ${theme.accentGlow}; color: ${theme.accent}; border: 1px solid ${theme.accent}; }
        .ps-dd-multi-tag-x { cursor: pointer; font-size: 14px; line-height: 1; opacity: 0.7; }
        .ps-dd-multi-tag-x:hover { opacity: 1; }
        .ps-dd-multi-arrow { flex-shrink: 0; margin-left: 8px; font-size: 12px; color: ${theme.textMuted}; }
        .ps-dd-multi-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 8px; max-height: 220px; overflow-y: auto; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
        .ps-dd-multi-opt { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 14px; color: ${theme.textSecondary}; cursor: pointer; transition: background 0.1s; font-family: inherit; }
        .ps-dd-multi-opt:hover { background: ${theme.choiceBg}; color: ${theme.textPrimary}; }
        .ps-dd-multi-opt-check { width: 16px; height: 16px; border-radius: 4px; border: 2px solid ${theme.choiceBorder}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: border-color 0.15s, background 0.15s; }
        .ps-dd-multi-opt.selected .ps-dd-multi-opt-check { border-color: ${theme.accent}; background: ${theme.accent}; color: #fff; }
        .ps-dd-multi-opt.selected { color: ${theme.textPrimary}; }

        .ps-nav { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid ${theme.cardBorder}; margin-top: 24px; }
        .ps-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; background: ${theme.accent}; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, opacity 0.15s; font-family: inherit; }
        .ps-btn:hover { background: ${theme.accentHover}; }
        .ps-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ps-btn-back { background: none; border: none; color: ${theme.textMuted}; font-size: 13px; cursor: pointer; padding: 0; font-family: inherit; }
        .ps-btn-back:hover { color: ${theme.textSecondary}; }

        .ps-error { font-size: 13px; color: ${theme.errorColor}; margin-top: 4px; }

        .ps-section-title { font-size: 18px; font-weight: 700; color: ${theme.textPrimary}; margin-bottom: 4px; }
        .ps-section-desc { font-size: 14px; color: ${theme.textSecondary}; line-height: 1.6; }

        .ps-thanks { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 24px; gap: 16px; }
        .ps-thanks-icon { width: 56px; height: 56px; border-radius: 50%; background: ${theme.successBg}; color: ${theme.successColor}; display: flex; align-items: center; justify-content: center; }
        .ps-thanks h2 { font-size: 22px; font-weight: 700; color: ${theme.textPrimary}; margin: 0; }
        .ps-thanks p { font-size: 14px; color: ${theme.textSecondary}; margin: 0; max-width: 320px; }

        .ps-pi-heading { font-size: 22px; font-weight: 700; color: ${theme.textPrimary}; margin-bottom: 8px; }
        .ps-pi-sub { font-size: 14px; color: ${theme.textSecondary}; margin-bottom: 24px; }
        .ps-pi-label { display: block; font-size: 13px; font-weight: 600; color: ${theme.textPrimary}; margin-bottom: 6px; }
        .ps-pi-group { margin-bottom: 16px; }

        .ps-welcome-title { font-size: 28px; font-weight: 700; color: ${theme.textPrimary}; margin-bottom: 16px; line-height: 1.3; }
        .ps-welcome-desc { font-size: 16px; color: ${theme.textSecondary}; margin-bottom: 32px; line-height: 1.6; }

        .ps-page-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${theme.textMuted}; margin-bottom: 20px; }

        .ps-richtext-content h1, .ps-richtext-content h2, .ps-richtext-content h3 { font-weight: 700; margin: 0 0 8px 0; }
        .ps-richtext-content h3 { font-size: 18px; }
        .ps-richtext-content p { margin: 0 0 8px 0; }
        .ps-richtext-content ul, .ps-richtext-content ol { margin: 0 0 8px 0; padding-left: 24px; }
        .ps-richtext-content li { margin-bottom: 4px; }
        .ps-richtext-content *:last-child { margin-bottom: 0; }
    `;
}

// ─── Themed date picker for public survey ───────────────────

function PublicDatePicker({ value, onChange, theme }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const parsed = value ? new Date(value) : null;
    const [viewDate, setViewDate] = useState(parsed || new Date());
    // 'days' | 'months' | 'years'
    const [viewMode, setViewMode] = useState('days');

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date();

    function selectDay(d) {
        const m = String(month + 1).padStart(2, '0');
        const day = String(d).padStart(2, '0');
        onChange(`${year}-${m}-${day}`);
        setOpen(false);
        setViewMode('days');
    }

    function selectMonth(m) {
        setViewDate(new Date(year, m, 1));
        setViewMode('days');
    }

    function selectYear(y) {
        setViewDate(new Date(y, month, 1));
        setViewMode('months');
    }

    function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
    function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

    // For year view: show a grid centered around the current viewDate year
    const decadeStart = Math.floor(year / 12) * 12;
    const yearGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

    function prevYearPage() { setViewDate(new Date(decadeStart - 12, month, 1)); }
    function nextYearPage() { setViewDate(new Date(decadeStart + 12, month, 1)); }

    const selectedDay = parsed && parsed.getFullYear() === year && parsed.getMonth() === month ? parsed.getDate() : null;
    const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

    const displayText = parsed
        ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Select date';

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function handleHeaderClick() {
        if (viewMode === 'days') setViewMode('months');
        else if (viewMode === 'months') setViewMode('years');
    }

    // Common button hover style helper
    const cellStyle = (isActive, isHighlight) => ({
        padding: '8px 4px', textAlign: 'center', fontSize: 13, fontFamily: 'inherit',
        fontWeight: isActive ? 600 : 400, borderRadius: 8, cursor: 'pointer',
        color: isActive ? '#fff' : theme.textPrimary,
        background: isActive ? theme.accent : 'transparent',
        border: isHighlight && !isActive ? `1px solid ${theme.accent}` : '1px solid transparent',
        transition: 'background 0.15s',
    });

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                className="ps-input"
                onClick={() => { setOpen(o => !o); if (!open) setViewMode('days'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
            >
                <CalendarIcon style={{ width: 16, height: 16, color: theme.textMuted, flexShrink: 0 }} />
                <span style={{ color: parsed ? theme.textPrimary : theme.textMuted }}>{displayText}</span>
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
                    background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
                    borderRadius: 10, padding: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                    width: 280,
                }}>
                    {/* ── Header ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <button type="button" onClick={viewMode === 'years' ? prevYearPage : prevMonth} style={{
                            background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                        }}>←</button>
                        <button type="button" onClick={handleHeaderClick} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                            fontWeight: 600, fontSize: 13, color: theme.accent, fontFamily: 'inherit',
                        }}>
                            {viewMode === 'days' && viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            {viewMode === 'months' && year}
                            {viewMode === 'years' && `${yearGrid[0]} – ${yearGrid[yearGrid.length - 1]}`}
                        </button>
                        <button type="button" onClick={viewMode === 'years' ? nextYearPage : nextMonth} style={{
                            background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                        }}>→</button>
                    </div>

                    {/* ── Days view ── */}
                    {viewMode === 'days' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: 10, color: theme.textMuted, fontWeight: 600 }}>{d}</div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                                {days.map((d, i) => {
                                    if (!d) return <div key={`e${i}`} />;
                                    const isSelected = d === selectedDay;
                                    const isToday = d === todayDay;
                                    return (
                                        <button key={d} type="button" onClick={() => selectDay(d)} style={{
                                            padding: '6px 0', textAlign: 'center', fontSize: 13, fontFamily: 'inherit',
                                            fontWeight: isSelected ? 600 : 400, borderRadius: 6, cursor: 'pointer',
                                            color: isSelected ? '#fff' : theme.textPrimary,
                                            background: isSelected ? theme.accent : 'transparent',
                                            border: isToday && !isSelected ? `1px solid ${theme.accent}` : '1px solid transparent',
                                            transition: 'background 0.15s',
                                        }}>{d}</button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Months view ── */}
                    {viewMode === 'months' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            {MONTHS.map((m, i) => {
                                const isCurrent = i === month;
                                const isThisMonth = today.getFullYear() === year && today.getMonth() === i;
                                return (
                                    <button key={m} type="button" onClick={() => selectMonth(i)} style={cellStyle(isCurrent, isThisMonth)}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Years view ── */}
                    {viewMode === 'years' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            {yearGrid.map(y => {
                                const isCurrent = y === year;
                                const isThisYear = y === today.getFullYear();
                                return (
                                    <button key={y} type="button" onClick={() => selectYear(y)} style={cellStyle(isCurrent, isThisYear)}>
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Address autocomplete (Nominatim) ────────────────────────

function AddressAutocomplete({ value, onChange, theme }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const timer = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => { setQuery(value || ''); }, [value]);

    function handleInput(val) {
        setQuery(val);
        onChange(val);
        clearTimeout(timer.current);
        if (val.length < 3) { setResults([]); setOpen(false); return; }
        timer.current = setTimeout(async () => {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(val)}`;
                const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
                const data = await res.json();
                setResults(data);
                setOpen(data.length > 0);
            } catch (err) { setResults([]); }
        }, 350);
    }

    function selectResult(item) {
        const display = item.display_name;
        setQuery(display);
        onChange(display);
        setOpen(false);
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input
                className="ps-input"
                value={query}
                onChange={e => handleInput(e.target.value)}
                placeholder="Start typing an address…"
                autoComplete="off"
            />
            {open && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
                    background: theme.cardBg, border: `1px solid ${theme.cardBorder}`,
                    borderRadius: 8, maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}>
                    {results.map((item, i) => (
                        <div
                            key={i}
                            onClick={() => selectResult(item)}
                            style={{
                                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                                color: theme.textPrimary, borderBottom: `1px solid ${theme.cardBorder}`,
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.inputBg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {item.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MultiSelectDropdown({ choices, selected, onChange, placeholder, theme }) {
    const [open, setOpen] = useState(false);
    function toggle(choice) {
        if (selected.includes(choice)) {
            onChange(selected.filter(c => c !== choice));
        } else {
            onChange([...selected, choice]);
        }
    }
    return (
        <div className="ps-dd-multi-wrap">
            <button type="button" className="ps-dd-multi-btn" onClick={() => setOpen(o => !o)}>
                {selected.length === 0 ? (
                    <span className="ps-dd-multi-placeholder">{placeholder || 'Select...'}</span>
                ) : (
                    <div className="ps-dd-multi-tags">
                        {selected.map((s, i) => (
                            <span key={i} className="ps-dd-multi-tag">
                                {s}
                                <span className="ps-dd-multi-tag-x" onClick={e => { e.stopPropagation(); toggle(s); }}>×</span>
                            </span>
                        ))}
                    </div>
                )}
                <span className="ps-dd-multi-arrow">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="ps-dd-multi-list">
                    {choices.map((choice, i) => {
                        const isSel = selected.includes(choice);
                        return (
                            <div key={i} className={`ps-dd-multi-opt${isSel ? ' selected' : ''}`} onClick={() => toggle(choice)}>
                                <div className="ps-dd-multi-opt-check">{isSel ? '✓' : ''}</div>
                                {choice}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── QuestionInput per type ───────────────────────────────────

function QuestionInput({ question, value, onChange, theme }) {
    const { type, settings = {} } = question;

    switch (type) {
        case 'short_text':
            return (
                <input
                    className="ps-input"
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={settings.placeholder || ''}
                    maxLength={settings.maxLength || undefined}
                />
            );

        case 'long_text':
            return (
                <textarea
                    className="ps-input"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={settings.placeholder || ''}
                    rows={settings.minRows || 4}
                    maxLength={settings.maxLength || undefined}
                />
            );

        case 'email':
            return (
                <input
                    className="ps-input"
                    type="email"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={settings.placeholder || 'name@example.com'}
                />
            );

        case 'number':
            return (
                <input
                    className="ps-input"
                    type="number"
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder={settings.placeholder || ''}
                    min={settings.min ?? undefined}
                    max={settings.max ?? undefined}
                    step={settings.decimalPlaces != null ? Math.pow(10, -settings.decimalPlaces) : 'any'}
                />
            );

        case 'date':
            return <PublicDatePicker value={value} onChange={onChange} theme={theme} />;

        case 'multiple_choice': {
            const choices = settings.choices || [];
            return (
                <div className="ps-choices">
                    {choices.map((choice, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ps-choice${value === choice ? ' selected' : ''}`}
                            onClick={() => onChange(choice)}
                        >
                            <div className="ps-choice-dot" />
                            {choice}
                        </button>
                    ))}
                    {settings.allowOther && (
                        <button
                            type="button"
                            className={`ps-choice${typeof value === 'string' && !choices.includes(value) ? ' selected' : ''}`}
                            onClick={() => onChange('')}
                        >
                            <div className="ps-choice-dot" />
                            Other
                        </button>
                    )}
                </div>
            );
        }

        case 'checkboxes': {
            const choices = settings.choices || [];
            const selected = Array.isArray(value) ? value : [];
            function toggle(choice) {
                if (selected.includes(choice)) {
                    onChange(selected.filter(c => c !== choice));
                } else {
                    onChange([...selected, choice]);
                }
            }
            return (
                <div className="ps-choices">
                    {choices.map((choice, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ps-choice${selected.includes(choice) ? ' selected' : ''}`}
                            onClick={() => toggle(choice)}
                        >
                            <div className="ps-checkbox-dot">{selected.includes(choice) ? '✓' : ''}</div>
                            {choice}
                        </button>
                    ))}
                </div>
            );
        }

        case 'dropdown': {
            const choices = settings.choices || [];
            if (settings.multiSelect) {
                const selected = Array.isArray(value) ? value : [];
                return (
                    <MultiSelectDropdown
                        choices={choices}
                        selected={selected}
                        onChange={onChange}
                        placeholder={settings.placeholder}
                        theme={theme}
                    />
                );
            }
            return (
                <select
                    className="ps-input"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="">{settings.placeholder || 'Select...'}</option>
                    {choices.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
            );
        }

        case 'rating': {
            const steps = settings.steps || 5;
            const shape = settings.shape || 'star';
            const ShapeChar = shape === 'heart' ? '♥' : shape === 'circle' ? '●' : '★';
            return (
                <div>
                    {(settings.lowLabel || settings.highLabel) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: theme.textMuted }}>
                            <span>{settings.lowLabel}</span>
                            <span>{settings.highLabel}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Array.from({ length: steps }).map((_, i) => {
                            const rating = (settings.startAtOne !== false ? 1 : 0) + i;
                            const filled = value != null && value >= rating;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => onChange(rating)}
                                    style={{
                                        fontSize: 32, background: 'none', border: 'none', cursor: 'pointer',
                                        color: filled ? '#f59e0b' : theme.textMuted,
                                        transition: 'color 0.15s',
                                        padding: 0,
                                    }}
                                >
                                    {ShapeChar}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        case 'opinion_scale': {
            const steps = settings.steps || 10;
            const start = settings.startAtOne !== false ? 1 : 0;
            return (
                <div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Array.from({ length: steps }).map((_, i) => {
                            const num = start + i;
                            const selected = value === num;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => onChange(num)}
                                    style={{
                                        width: 44, height: 44, borderRadius: 8,
                                        border: `2px solid ${selected ? theme.accent : theme.choiceBorder}`,
                                        background: selected ? theme.accent : theme.choiceBg,
                                        color: selected ? '#fff' : theme.textPrimary,
                                        fontSize: 15, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                    {(settings.lowLabel || settings.highLabel) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: theme.textMuted }}>
                            <span>{settings.lowLabel}</span>
                            <span>{settings.highLabel}</span>
                        </div>
                    )}
                </div>
            );
        }

        case 'yes_no':
            return (
                <div style={{ display: 'flex', gap: 12 }}>
                    {[true, false].map((isYes) => {
                        const label = isYes ? (settings.yesLabel || 'Yes') : (settings.noLabel || 'No');
                        const selected = value === isYes;
                        return (
                            <button
                                key={String(isYes)}
                                type="button"
                                onClick={() => onChange(isYes)}
                                style={{
                                    padding: '12px 36px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer',
                                    border: `2px solid ${selected ? theme.accent : theme.choiceBorder}`,
                                    background: selected ? theme.accent : theme.choiceBg,
                                    color: selected ? '#fff' : theme.textPrimary,
                                    transition: 'all 0.15s',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            );

        case 'rating_scale': {
            const { min = 0, max = 10, step = 1, color = '#FF6100', minLabel, maxLabel, showNumbers } = settings;
            const rangeVal = value ?? min;
            const pct = ((rangeVal - min) / (max - min)) * 100;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, minWidth: 18, textAlign: 'center' }}>{min}</span>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={rangeVal}
                            onChange={e => onChange(Number(e.target.value))}
                            style={{
                                flex: 1, height: 4, WebkitAppearance: 'none', appearance: 'none', borderRadius: 4, outline: 'none', cursor: 'pointer',
                                background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${theme.progressTrack} ${pct}%, ${theme.progressTrack} 100%)`,
                                accentColor: color,
                            }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, minWidth: 18, textAlign: 'center' }}>{max}</span>
                    </div>
                    {showNumbers && (
                        <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, color }}>{rangeVal}</div>
                    )}
                    {(minLabel || maxLabel) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.textMuted }}>
                            <span>{minLabel}</span>
                            <span>{maxLabel}</span>
                        </div>
                    )}
                </div>
            );
        }

        case 'section':
            return null;

        case 'text_block': {
            const { richContent } = settings;
            if (!richContent) return null;
            return (
                <div
                    className="ps-richtext-content"
                    style={{ lineHeight: 1.6, color: theme.textPrimary }}
                    dangerouslySetInnerHTML={{ __html: richContent }}
                />
            );
        }

        case 'image': {
            const { imageUrl, altText, width, alignment } = settings;
            if (!imageUrl) return null;
            return (
                <div style={{ textAlign: alignment || 'center' }}>
                    <img
                        src={imageUrl}
                        alt={altText || ''}
                        style={{ maxWidth: `${width || 100}%`, borderRadius: 8, height: 'auto' }}
                    />
                </div>
            );
        }

        case 'statement':
            return null;

        default:
            return null;
    }
}

// ─── Render a single question block ──────────────────────────

function QuestionBlock({ question, value, onChange, theme }) {
    const { type, title, description, required, settings = {} } = question;

    if (type === 'section') {
        return (
            <div className="ps-question">
                <div className="ps-section-title">{title || 'Section'}</div>
                {(description || settings.description) && (
                    <div className="ps-section-desc">{description || settings.description}</div>
                )}
            </div>
        );
    }

    if (type === 'image') {
        return (
            <div className="ps-question">
                <QuestionInput question={question} value={value} onChange={onChange} theme={theme} />
                {title && <div style={{ textAlign: settings.alignment || 'center', fontSize: 13, color: theme.textMuted, marginTop: 6 }}>{title}</div>}
            </div>
        );
    }

    if (type === 'text_block') {
        return (
            <div className="ps-question">
                <QuestionInput question={question} value={value} onChange={onChange} theme={theme} />
            </div>
        );
    }

    return (
        <div className="ps-question">
            <div className="ps-q-label">
                {title || <span style={{ color: theme.textMuted, fontStyle: 'italic' }}>Untitled question</span>}
                {required && <span className="ps-q-required">*</span>}
            </div>
            {description && <div className="ps-q-hint">{description}</div>}
            <QuestionInput question={question} value={value} onChange={onChange} theme={theme} />
        </div>
    );
}

// ─── Main Public Survey page ──────────────────────────────────

export default function PublicSurvey() {
    const { token } = useParams();

    const [loadState, setLoadState] = useState('loading');
    const [survey, setSurvey] = useState(null);
    const [questions, setQuestions] = useState([]);

    // Page-based navigation: -1 = welcome, -2 = personal info, 0..N-1 = pages, N = thank you
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState({});
    const [personalInfoAnswers, setPersonalInfoAnswers] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            const result = await api.fetchPublicSurvey(token);
            if (!result) {
                setLoadState('not_found');
                return;
            }
            setSurvey(result.survey);
            setQuestions(result.questions);
            const hasWelcome = result.survey.settings?.welcomeScreen?.enabled;
            const isRecovery = result.survey.type === 'recovery';
            const piFields = result.survey.settings?.personalInfoFields || [];
            let initialStep = 0;
            if (hasWelcome) initialStep = -1;
            if (isRecovery && piFields.length > 0) initialStep = hasWelcome ? -1 : -2;
            setCurrentPage(initialStep);
            setLoadState('ready');
        }
        load();
    }, [token]);

    // Build theme from survey settings
    const settings = survey?.settings || {};
    const theme = useMemo(() => buildTheme(settings.bgColor, '#FF6100', settings.cardBgColor, settings.cardShadow, settings.inputBgColor, settings.fontColor), [settings.bgColor, settings.cardBgColor, settings.cardShadow, settings.inputBgColor, settings.fontColor]);
    const css = useMemo(() => generateCSS(theme), [theme]);
    const barColor = settings.progressBarColor || '#FF6100';
    const fontFamily = settings.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Build pages from survey.pages (builder format) or fall back to flat questions
    const pages = useMemo(() => {
        if (survey?.pages?.length > 0) {
            return survey.pages.map((p, i) => {
                // Map builder elements to question format for rendering
                const pageQuestions = (p.elements || []).map(el => ({
                    id: el.id,
                    title: el.label,
                    description: el.hint,
                    type: el.type,
                    required: el.required,
                    settings: { ...el.config, choices: el.options },
                }));
                return { name: p.name || `Page ${i + 1}`, questions: pageQuestions };
            });
        }
        // Fallback: all questions on one page
        return [{ name: '', questions }];
    }, [survey?.pages, questions]);

    const totalPages = pages.length;

    function setAnswer(questionId, value) {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        setError('');
    }

    function validateCurrentPage() {
        if (currentPage < 0 || currentPage >= totalPages) return true;
        const pageQuestions = pages[currentPage].questions;
        for (const q of pageQuestions) {
            if (!q.required) continue;
            const val = answers[q.id];

            if (q.type === 'checkboxes') {
                if (!Array.isArray(val) || val.length === 0) {
                    setError(`"${q.title || 'This field'}" — Please select at least one option.`);
                    return false;
                }
                const { minSelections } = q.settings || {};
                if (minSelections && val.length < minSelections) {
                    setError(`"${q.title || 'This field'}" — Please select at least ${minSelections} options.`);
                    return false;
                }
            } else if (q.type === 'email') {
                if (!val || !val.includes('@')) {
                    setError(`"${q.title || 'Email'}" — Please enter a valid email address.`);
                    return false;
                }
            } else if (q.type === 'number') {
                if (val == null || val === '') {
                    setError(`"${q.title || 'This field'}" — Please enter a number.`);
                    return false;
                }
                const { min, max } = q.settings || {};
                if (min != null && val < min) { setError(`Minimum value is ${min}.`); return false; }
                if (max != null && val > max) { setError(`Maximum value is ${max}.`); return false; }
            } else if (q.type === 'yes_no') {
                if (val === undefined || val === null) {
                    setError(`"${q.title || 'This field'}" — Please make a selection.`);
                    return false;
                }
            } else if (q.type === 'multiple_choice' || q.type === 'rating' || q.type === 'opinion_scale') {
                if (val == null || val === '') {
                    setError(`"${q.title || 'This field'}" — Please make a selection.`);
                    return false;
                }
            } else if (q.type === 'dropdown') {
                if (q.settings?.multiSelect) {
                    if (!Array.isArray(val) || val.length === 0) {
                        setError(`"${q.title || 'This field'}" — Please select at least one option.`);
                        return false;
                    }
                } else if (val == null || val === '') {
                    setError(`"${q.title || 'This field'}" — Please make a selection.`);
                    return false;
                }
            } else if (q.type === 'statement' || q.type === 'section' || q.type === 'image' || q.type === 'text_block') {
                continue;
            } else {
                if (!val || String(val).trim() === '') {
                    setError(`"${q.title || 'This field'}" is required.`);
                    return false;
                }
            }
        }
        return true;
    }

    function advance() {
        if (!validateCurrentPage()) return;
        setError('');
        setCurrentPage(prev => prev + 1);
    }

    async function handleSubmit() {
        if (!validateCurrentPage()) return;
        setSubmitting(true);
        try {
            const answersArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
            const metadata = { userAgent: navigator.userAgent };

            if (survey.type === 'recovery') {
                const piFields = survey.settings?.personalInfoFields || [];
                const personalInfo = {};
                piFields.forEach(key => {
                    if (personalInfoAnswers[key]) personalInfo[key] = personalInfoAnswers[key];
                });
                const customAnswers = {};
                Object.entries(answers).forEach(([qId, val]) => {
                    customAnswers[qId] = val;
                });
                await api.submitRecoverySurveyResponse(survey.id, personalInfo, customAnswers, answersArray, metadata);
            } else {
                await api.submitPublicSurveyResponse(survey.id, answersArray, metadata);
            }
            setCurrentPage(totalPages); // advance to thank you
        } catch (err) {
            console.error('Submit failed:', err);
            setError(`Submission failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    }

    const progress = totalPages > 1
        ? (currentPage >= totalPages ? 100 : Math.round(((Math.max(currentPage, 0)) / (totalPages)) * 100))
        : (currentPage >= totalPages ? 100 : 0);

    // ── Render states ──────────────────────────────────────────

    if (loadState === 'loading') {
        return (
            <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</div>
            </div>
        );
    }

    if (loadState === 'not_found') {
        return (
            <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                <div style={{ background: '#1a1b23', border: '1px solid #2a2b35', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Survey not found</h1>
                    <p style={{ fontSize: 14, color: '#94a3b8' }}>This survey link is invalid or has been removed.</p>
                </div>
            </div>
        );
    }

    // ── All rendering below uses the dynamic theme ──────────

    // Welcome screen
    if (currentPage === -1) {
        const ws = settings.welcomeScreen || {};
        const isRecovery = survey.type === 'recovery';
        const piFields = settings.personalInfoFields || [];
        return (
            <div className="ps-page" style={{ fontFamily }}>
                <style>{css}</style>
                <div className="ps-card">
                    <div className="ps-card-body">
                        <div className="ps-welcome-title">{ws.title || survey.title}</div>
                        {ws.description && <div className="ps-welcome-desc">{ws.description}</div>}
                        <button className="ps-btn" onClick={() => setCurrentPage(isRecovery && piFields.length > 0 ? -2 : 0)}>
                            {ws.buttonText || 'Start'} <ChevronRight style={{ width: 18, height: 18 }} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Personal info step (recovery surveys)
    if (currentPage === -2) {
        const piFields = settings.personalInfoFields || [];
        const PI_LABELS = {
            firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
            address: 'Address', dateOfBirth: 'Date of Birth', gender: 'Gender', referralSource: 'Referral Source',
        };
        return (
            <div className="ps-page" style={{ fontFamily }}>
                <style>{css}</style>
                {totalPages > 1 && (
                    <div className="ps-progress-track">
                        <div className="ps-progress-fill" style={{ width: '0%', background: barColor }} />
                    </div>
                )}
                <div className="ps-card">
                    <div className="ps-card-body">
                        <div className="ps-pi-heading">Your Information</div>
                        <div className="ps-pi-sub">Please provide your details below.</div>
                        {piFields.map(key => (
                            <div key={key} className="ps-pi-group">
                                <label className="ps-pi-label">{PI_LABELS[key]}</label>
                                {key === 'gender' ? (
                                    <select
                                        className="ps-input"
                                        value={personalInfoAnswers[key] || ''}
                                        onChange={e => setPersonalInfoAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select...</option>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Non-binary</option>
                                        <option>Prefer not to say</option>
                                    </select>
                                ) : key === 'referralSource' ? (
                                    <select
                                        className="ps-input"
                                        value={personalInfoAnswers[key] || ''}
                                        onChange={e => setPersonalInfoAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select...</option>
                                        <option>Self-referral</option>
                                        <option>GP Referral</option>
                                        <option>GamCare</option>
                                        <option>Betknowmore UK</option>
                                        <option>Bolton Council</option>
                                        <option>Family/Friend</option>
                                        <option>Other</option>
                                    </select>
                                ) : key === 'dateOfBirth' ? (
                                    <PublicDatePicker
                                        value={personalInfoAnswers[key] || ''}
                                        onChange={v => setPersonalInfoAnswers(prev => ({ ...prev, [key]: v }))}
                                        theme={theme}
                                    />
                                ) : key === 'address' ? (
                                    <AddressAutocomplete
                                        value={personalInfoAnswers[key] || ''}
                                        onChange={v => setPersonalInfoAnswers(prev => ({ ...prev, [key]: v }))}
                                        theme={theme}
                                    />
                                ) : (
                                    <input
                                        className="ps-input"
                                        type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                                        value={personalInfoAnswers[key] || ''}
                                        onChange={e => setPersonalInfoAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                                    />
                                )}
                            </div>
                        ))}
                        {error && <p className="ps-error">{error}</p>}
                        <div style={{ marginTop: 24 }}>
                            <button className="ps-btn" onClick={() => {
                                if (piFields.includes('email') && (!personalInfoAnswers.email || !personalInfoAnswers.email.includes('@'))) {
                                    setError('Please enter a valid email address.');
                                    return;
                                }
                                if (piFields.includes('firstName') && !personalInfoAnswers.firstName?.trim()) {
                                    setError('Please enter your first name.');
                                    return;
                                }
                                setError('');
                                setCurrentPage(0);
                            }}>
                                Next <ChevronRight style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Thank you screen
    if (currentPage >= totalPages) {
        const ty = settings.thankYouScreen || {};
        return (
            <div className="ps-page" style={{ fontFamily }}>
                <style>{css}</style>
                <div className="ps-card">
                    <div className="ps-thanks">
                        <div className="ps-thanks-icon">
                            <Check style={{ width: 30, height: 30 }} />
                        </div>
                        <h2>{ty.title || 'Thank you!'}</h2>
                        {ty.description && <p>{ty.description}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // ── Question pages ──────────────────────────────────────

    const page = pages[currentPage];
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage === totalPages - 1;

    return (
        <div className="ps-page" style={{ fontFamily }}>
            <style>{css}</style>

            {/* Progress bar */}
            {totalPages > 1 && (
                <div className="ps-progress-track">
                    <div className="ps-progress-fill" style={{ width: `${progress}%`, background: barColor }} />
                </div>
            )}

            <div className="ps-card">
                <div className="ps-card-body">
                    {/* Page label */}
                    {totalPages > 1 && (
                        <div className="ps-page-label">
                            {page.name && page.name !== `Page ${currentPage + 1}` ? page.name : `Page ${currentPage + 1} of ${totalPages}`}
                        </div>
                    )}

                    {/* Questions */}
                    {page.questions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: theme.textMuted, padding: '48px 24px', fontSize: 14 }}>
                            This page has no questions.
                        </div>
                    ) : (
                        page.questions.map(q => (
                            <QuestionBlock
                                key={q.id}
                                question={q}
                                value={answers[q.id]}
                                onChange={val => setAnswer(q.id, val)}
                                theme={theme}
                            />
                        ))
                    )}

                    {/* Error */}
                    {error && <p className="ps-error">{error}</p>}

                    {/* Navigation */}
                    <div className="ps-nav">
                        <div>
                            {!isFirstPage && (
                                <button className="ps-btn-back" onClick={() => { setCurrentPage(p => p - 1); setError(''); }}>
                                    ← Back
                                </button>
                            )}
                        </div>
                        <div>
                            {isLastPage ? (
                                <button className="ps-btn" onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? 'Submitting…' : 'Submit'}
                                    {!submitting && <Check style={{ width: 16, height: 16 }} />}
                                </button>
                            ) : (
                                <button className="ps-btn" onClick={advance}>
                                    Next <ChevronRight style={{ width: 18, height: 18 }} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
