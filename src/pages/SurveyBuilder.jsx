import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as api from '../lib/api';
import DateTimePicker from '../components/DateTimePicker';
import {
    ArrowLeft, Eye, EyeOff, Plus, Trash2, GripVertical,
    MessageSquare, AlignLeft, Mail, Phone, List, CheckSquare,
    ChevronDown, SlidersHorizontal, Upload, Calendar, Minus,
    FilePlus, Check, X, MousePointerClick, Save, Settings, Columns, Rows, Palette,
    Smartphone, Monitor, User, Pipette,
} from 'lucide-react';

// ─── HSV ↔ Hex helpers ────────────────────────────────────────

function hsvToHex(h, s, v) {
    const f = (n) => {
        const k = (n + h / 60) % 6;
        const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + 6) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
}

// ─── Custom Color Picker ──────────────────────────────────────

function SurveyColorPicker({ value, onChange, onReset, defaultColor, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const display = value || defaultColor || '#1a1a2e';
    const popupRef = useRef(null);

    // HSV state derived from the current hex value
    const initial = hexToHsv(display);
    const [hue, setHue] = useState(initial.h);
    const [sat, setSat] = useState(initial.s);
    const [val, setVal] = useState(initial.v);

    // Sync HSV when display value changes externally
    useEffect(() => {
        const hsv = hexToHsv(display);
        setHue(hsv.h);
        setSat(hsv.s);
        setVal(hsv.v);
    }, [display]);

    // Click outside to close
    useEffect(() => {
        function handler(e) {
            if (popupRef.current && !popupRef.current.contains(e.target)) setIsOpen(false);
        }
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    function commitColor(h, s, v) {
        onChange(hsvToHex(h, s, v));
    }

    return (
        <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">{label}</label>
            <div className="sb-colour-row">
                <div
                    className="sb-colour-swatch"
                    style={{ background: display, cursor: 'pointer', border: '2px solid var(--border)' }}
                    onClick={() => setIsOpen(o => !o)}
                />
                <input
                    className="form-input"
                    value={value || ''}
                    onChange={e => {
                        const v = e.target.value;
                        onChange(v);
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                            const hsv = hexToHsv(v);
                            setHue(hsv.h); setSat(hsv.s); setVal(hsv.v);
                        }
                    }}
                    placeholder="Default"
                    style={{ fontSize: 13, fontFamily: 'monospace', flex: 1 }}
                />
                {value && (
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={onReset} title="Reset">
                        <X size={12} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div ref={popupRef} style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    padding: 14, width: 260,
                }}>
                    {/* Saturation / Value canvas */}
                    <SatValCanvas hue={hue} sat={sat} val={val} onDrag={(s, v) => { setSat(s); setVal(v); commitColor(hue, s, v); }} />

                    {/* Hue slider */}
                    <HueSlider hue={hue} onDrag={h => { setHue(h); commitColor(h, sat, val); }} />

                    {/* Preview + hex display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                            background: hsvToHex(hue, sat, val), border: '1px solid var(--border)',
                        }} />
                        <input
                            className="form-input"
                            value={hsvToHex(hue, sat, val)}
                            onChange={e => {
                                const v = e.target.value;
                                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                                    const hsv = hexToHsv(v);
                                    setHue(hsv.h); setSat(hsv.s); setVal(hsv.v);
                                    onChange(v);
                                }
                            }}
                            style={{ fontSize: 12, fontFamily: 'monospace', flex: 1 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Saturation/Value gradient canvas
function SatValCanvas({ hue, sat, val, onDrag }) {
    const canvasRef = useRef(null);
    const size = 232;

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        // Hue base color
        const hueColor = hsvToHex(hue, 1, 1);
        // White → hue (horizontal)
        const gradH = ctx.createLinearGradient(0, 0, size, 0);
        gradH.addColorStop(0, '#ffffff');
        gradH.addColorStop(1, hueColor);
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, size, size);
        // Transparent → black (vertical)
        const gradV = ctx.createLinearGradient(0, 0, 0, size);
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, '#000000');
        ctx.fillStyle = gradV;
        ctx.fillRect(0, 0, size, size);
    }, [hue]);

    function handlePointer(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(size, e.clientX - rect.left));
        const y = Math.max(0, Math.min(size, e.clientY - rect.top));
        onDrag(x / size, 1 - y / size);
    }

    function startDrag(e) {
        handlePointer(e);
        function onMove(ev) { handlePointer(ev); }
        function onUp() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    const cx = sat * size;
    const cy = (1 - val) * size;

    return (
        <div style={{ position: 'relative', width: size, height: size, borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'crosshair' }}>
            <canvas ref={canvasRef} width={size} height={size} onPointerDown={startDrag} style={{ display: 'block', width: size, height: size }} />
            <div style={{
                position: 'absolute', left: cx - 7, top: cy - 7, width: 14, height: 14,
                borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 3px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
            }} />
        </div>
    );
}

// Hue rainbow slider
function HueSlider({ hue, onDrag }) {
    const barRef = useRef(null);
    const width = 232;

    function handlePointer(e) {
        const rect = barRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(width, e.clientX - rect.left));
        onDrag((x / width) * 360);
    }

    function startDrag(e) {
        handlePointer(e);
        function onMove(ev) { handlePointer(ev); }
        function onUp() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    const cx = (hue / 360) * width;

    return (
        <div
            ref={barRef}
            onPointerDown={startDrag}
            style={{
                position: 'relative', width, height: 14, marginTop: 10, borderRadius: 7, cursor: 'pointer',
                background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
        >
            <div style={{
                position: 'absolute', left: cx - 7, top: -1, width: 16, height: 16,
                borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 3px rgba(0,0,0,0.5)',
                background: hsvToHex(hue, 1, 1), pointerEvents: 'none',
            }} />
        </div>
    );
}

// ─── Constants ────────────────────────────────────────────────

const QUESTION_GROUPS = [
    {
        label: 'Basic',
        types: [
            { type: 'short_text', label: 'Short Answer', icon: MessageSquare },
            { type: 'long_text', label: 'Long Answer', icon: AlignLeft },
            { type: 'email', label: 'Email', icon: Mail },
            { type: 'phone', label: 'Phone', icon: Phone },
        ],
    },
    {
        label: 'Choice',
        types: [
            { type: 'multiple_choice', label: 'Multiple Choice', icon: List },
            { type: 'checkboxes', label: 'Checkboxes', icon: CheckSquare },
            { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
        ],
    },
    {
        label: 'Advanced',
        types: [
            { type: 'rating_scale', label: 'Rating Scale', icon: SlidersHorizontal },
            { type: 'file_upload', label: 'File Upload', icon: Upload },
            { type: 'date', label: 'Date', icon: Calendar },
            { type: 'section', label: 'Section', icon: Minus },
            { type: 'new_page', label: 'New Page', icon: FilePlus },
        ],
    },
];

const TYPE_MAP = Object.fromEntries(
    QUESTION_GROUPS.flatMap(g => g.types).map(t => [t.type, t])
);

const DEFAULT_SETTINGS = {
    fontFamily: '',
    bgColor: '',
    cardBgColor: '',
    cardShadow: 'md',
    progressBarColor: '',
    personalInfoFields: [],
};

const PERSONAL_INFO_FIELDS = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'referralSource', label: 'Referral Source' },
];

const FONT_OPTIONS = [
    { value: '', label: 'System Default' },
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Roboto', sans-serif", label: 'Roboto' },
    { value: "'Outfit', sans-serif", label: 'Outfit' },
    { value: "'Georgia', serif", label: 'Georgia' },
];

function defaultConfig(type) {
    switch (type) {
        case 'short_text':
        case 'long_text':
        case 'email':
        case 'phone':
            return { placeholder: '' };
        case 'multiple_choice':
        case 'checkboxes':
            return { allowOther: false, layout: 'column' };
        case 'dropdown':
            return { allowOther: false, multiSelect: false };
        case 'rating_scale':
            return { min: 1, max: 10, step: 1, minLabel: 'Not at all', maxLabel: 'Extremely', color: '#FF6100', showNumbers: true };
        case 'file_upload':
            return { accept: '', maxSizeMB: 10 };
        case 'date':
            return { includeTime: false };
        case 'section':
            return { description: '' };
        default:
            return {};
    }
}

function defaultOptions(type) {
    if (type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown') {
        return ['Option 1', 'Option 2', 'Option 3'];
    }
    return [];
}

function makeElement(type) {
    return {
        id: crypto.randomUUID(),
        type,
        label: '',
        hint: '',
        required: false,
        options: defaultOptions(type),
        config: defaultConfig(type),
    };
}

function makePage() {
    return { id: crypto.randomUUID(), name: '', elements: [] };
}

// ─── RatingScalePreview ───────────────────────────────────────

function RatingScalePreview({ config, interactive = false }) {
    const { min = 1, max = 10, step = 1, minLabel = '', maxLabel = '', color = '#FF6100', showNumbers = true } = config || {};
    const [value, setValue] = useState(Math.round((min + max) / 2));

    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

    const trackStyle = {
        background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, var(--border-light) ${pct}%, var(--border-light) 100%)`,
    };

    const thumbStyle = `
        .sb-rating-input-${color.replace('#', '')}::-webkit-slider-thumb { background: ${color}; box-shadow: 0 0 0 3px ${color}26; }
        .sb-rating-input-${color.replace('#', '')}::-moz-range-thumb { background: ${color}; }
    `;

    return (
        <div className="sb-rating-wrap">
            <style>{thumbStyle}</style>
            <div className="sb-rating-track-row">
                <span className="sb-rating-edge-val">{min}</span>
                <input
                    type="range"
                    className={`sb-rating-input sb-rating-input-${color.replace('#', '')}`}
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => interactive && setValue(Number(e.target.value))}
                    style={{
                        ...trackStyle,
                        pointerEvents: interactive ? 'auto' : 'none',
                    }}
                />
                <span className="sb-rating-edge-val">{max}</span>
            </div>
            {(minLabel || maxLabel) && (
                <div className="sb-rating-labels-row">
                    <span>{minLabel}</span>
                    <span>{maxLabel}</span>
                </div>
            )}
            {showNumbers && (
                <div className="sb-rating-current-val" style={{ color }}>
                    {value}
                </div>
            )}
        </div>
    );
}

// ─── QuestionCardPreview (mini preview inside canvas card) ────

function QuestionCardPreview({ element }) {
    const { type, options = [], config = {} } = element;

    switch (type) {
        case 'short_text':
        case 'email':
        case 'phone':
            return (
                <div className="form-input" style={{ color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none', marginTop: 4 }}>
                    {config.placeholder || (type === 'email' ? 'your@email.com' : type === 'phone' ? '+44 7000 000000' : 'Short answer…')}
                </div>
            );
        case 'long_text':
            return (
                <div className="form-textarea" style={{ color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none', marginTop: 4, minHeight: 60 }}>
                    {config.placeholder || 'Long answer…'}
                </div>
            );
        case 'multiple_choice':
            return (
                <div style={{ display: 'flex', flexDirection: config.layout === 'row' ? 'row' : 'column', flexWrap: 'wrap', gap: config.layout === 'row' ? 8 : 4, marginTop: 4 }}>
                    {options.slice(0, 3).map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border-light)', flexShrink: 0 }} />
                            {opt}
                        </div>
                    ))}
                    {options.length > 3 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{options.length - 3} more</div>}
                </div>
            );
        case 'checkboxes':
            return (
                <div style={{ display: 'flex', flexDirection: config.layout === 'row' ? 'row' : 'column', flexWrap: 'wrap', gap: config.layout === 'row' ? 8 : 4, marginTop: 4 }}>
                    {options.slice(0, 3).map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid var(--border-light)', flexShrink: 0 }} />
                            {opt}
                        </div>
                    ))}
                    {options.length > 3 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{options.length - 3} more</div>}
                </div>
            );
        case 'dropdown':
            return (
                <div className="form-select" style={{ color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {config.multiSelect ? 'Select multiple…' : (options[0] || 'Select an option…')}
                    {config.multiSelect && <span style={{ fontSize: 10, background: 'var(--primary-bg)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Multi</span>}
                </div>
            );
        case 'rating_scale':
            return <RatingScalePreview config={config} interactive={false} />;
        case 'file_upload':
            return (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    Drop a file here, or click to upload
                </div>
            );
        case 'date':
            return (
                <div className="form-input" style={{ color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none', marginTop: 4 }}>
                    DD / MM / YYYY
                </div>
            );
        case 'section':
            return config.description ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{config.description}</p>
            ) : null;
        default:
            return null;
    }
}

// ─── EditPanel ────────────────────────────────────────────────

function EditPanel({ element, onUpdate, onDelete }) {
    const typeDef = TYPE_MAP[element.type] || {};
    const Icon = typeDef.icon || MessageSquare;
    const isChoice = ['multiple_choice', 'checkboxes', 'dropdown'].includes(element.type);

    function patchConfig(key, value) {
        onUpdate({ config: { ...element.config, [key]: value } });
    }

    function addOption() {
        onUpdate({ options: [...element.options, `Option ${element.options.length + 1}`] });
    }

    function updateOption(idx, val) {
        const opts = [...element.options];
        opts[idx] = val;
        onUpdate({ options: opts });
    }

    function removeOption(idx) {
        onUpdate({ options: element.options.filter((_, i) => i !== idx) });
    }

    return (
        <>
            <div className="sb-right-header">
                <div className="sb-right-header-type">
                    <Icon size={13} />
                    <span className="sb-right-header-label">{typeDef.label || element.type}</span>
                </div>
            </div>

            <div className="sb-right-scroll">
                {/* Label */}
                {element.type !== 'section' && (
                    <div className="form-group">
                        <label className="form-label">Question</label>
                        <input
                            className="form-input"
                            value={element.label}
                            onChange={e => onUpdate({ label: e.target.value })}
                            placeholder="Your question…"
                        />
                    </div>
                )}
                {element.type === 'section' && (
                    <div className="form-group">
                        <label className="form-label">Section Title</label>
                        <input
                            className="form-input"
                            value={element.label}
                            onChange={e => onUpdate({ label: e.target.value })}
                            placeholder="Section heading…"
                        />
                    </div>
                )}

                {/* Hint */}
                <div className="form-group">
                    <label className="form-label">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <textarea
                        className="form-textarea"
                        value={element.hint}
                        onChange={e => onUpdate({ hint: e.target.value })}
                        placeholder="Add a hint or description…"
                        style={{ minHeight: 60, fontSize: 13 }}
                    />
                </div>

                {/* Required toggle */}
                {element.type !== 'section' && (
                    <div className="sb-toggle-wrap" onClick={() => onUpdate({ required: !element.required })}>
                        <span className="sb-toggle-label">Required</span>
                        <div className={`sb-toggle${element.required ? ' on' : ''}`}>
                            <div className="sb-toggle-thumb" />
                        </div>
                    </div>
                )}

                <div className="sb-right-divider" />

                {/* Placeholder (text types) */}
                {['short_text', 'long_text', 'email', 'phone'].includes(element.type) && (
                    <div className="form-group">
                        <label className="form-label">Placeholder text</label>
                        <input
                            className="form-input"
                            value={element.config.placeholder || ''}
                            onChange={e => patchConfig('placeholder', e.target.value)}
                            placeholder={element.type === 'email' ? 'your@email.com' : 'Type a placeholder…'}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                )}

                {/* Options (choice types) */}
                {isChoice && (
                    <div className="form-group">
                        <label className="form-label">Answer choices</label>
                        <div className="sb-options-list">
                            {element.options.map((opt, i) => (
                                <div key={i} className="sb-option-row">
                                    <input
                                        className="form-input"
                                        value={opt}
                                        onChange={e => updateOption(i, e.target.value)}
                                        placeholder={`Option ${i + 1}`}
                                    />
                                    <button
                                        className="btn btn-ghost btn-sm btn-icon"
                                        onClick={() => removeOption(i)}
                                        disabled={element.options.length <= 1}
                                        title="Remove option"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-xs)', width: '100%' }} onClick={addOption}>
                            <Plus size={13} />
                            Add option
                        </button>
                        {element.type === 'dropdown' && (
                            <div className="sb-toggle-wrap" style={{ marginTop: 'var(--space-sm)' }} onClick={() => patchConfig('multiSelect', !element.config.multiSelect)}>
                                <span className="sb-toggle-label">Allow multiple selections</span>
                                <div className={`sb-toggle${element.config.multiSelect ? ' on' : ''}`}>
                                    <div className="sb-toggle-thumb" />
                                </div>
                            </div>
                        )}
                        {element.type !== 'dropdown' && (
                            <>
                                {/* Layout toggle */}
                                <div className="form-group" style={{ marginTop: 'var(--space-sm)' }}>
                                    <label className="form-label">Layout</label>
                                    <div className="sb-layout-toggle">
                                        <button
                                            className={`sb-layout-btn${(element.config.layout || 'column') === 'column' ? ' active' : ''}`}
                                            onClick={() => patchConfig('layout', 'column')}
                                        >
                                            <Columns size={13} />
                                            Column
                                        </button>
                                        <button
                                            className={`sb-layout-btn${element.config.layout === 'row' ? ' active' : ''}`}
                                            onClick={() => patchConfig('layout', 'row')}
                                        >
                                            <Rows size={13} />
                                            Row
                                        </button>
                                    </div>
                                </div>
                                <div className="sb-toggle-wrap" style={{ marginTop: 'var(--space-sm)' }} onClick={() => patchConfig('allowOther', !element.config.allowOther)}>
                                    <span className="sb-toggle-label">Allow "Other"</span>
                                    <div className={`sb-toggle${element.config.allowOther ? ' on' : ''}`}>
                                        <div className="sb-toggle-thumb" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Rating Scale config */}
                {element.type === 'rating_scale' && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Scale range</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xs)' }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Min</div>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={element.config.min}
                                        onChange={e => patchConfig('min', Number(e.target.value))}
                                        style={{ fontSize: 13, textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Max</div>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={element.config.max}
                                        onChange={e => patchConfig('max', Number(e.target.value))}
                                        style={{ fontSize: 13, textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Step</div>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={element.config.step}
                                        min={1}
                                        onChange={e => patchConfig('step', Math.max(1, Number(e.target.value)))}
                                        style={{ fontSize: 13, textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Labels</label>
                            <input
                                className="form-input"
                                value={element.config.minLabel || ''}
                                onChange={e => patchConfig('minLabel', e.target.value)}
                                placeholder="Left label (e.g. Not at all)"
                                style={{ fontSize: 13, marginBottom: 'var(--space-xs)' }}
                            />
                            <input
                                className="form-input"
                                value={element.config.maxLabel || ''}
                                onChange={e => patchConfig('maxLabel', e.target.value)}
                                placeholder="Right label (e.g. Extremely)"
                                style={{ fontSize: 13 }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Colour</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <input
                                    type="color"
                                    value={element.config.color || '#FF6100'}
                                    onChange={e => patchConfig('color', e.target.value)}
                                    style={{ width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 2, background: 'var(--bg-input)' }}
                                />
                                <input
                                    className="form-input"
                                    value={element.config.color || '#FF6100'}
                                    onChange={e => patchConfig('color', e.target.value)}
                                    style={{ fontSize: 13, fontFamily: 'monospace' }}
                                />
                            </div>
                        </div>
                        <div className="sb-toggle-wrap" onClick={() => patchConfig('showNumbers', !element.config.showNumbers)}>
                            <span className="sb-toggle-label">Show current value</span>
                            <div className={`sb-toggle${element.config.showNumbers ? ' on' : ''}`}>
                                <div className="sb-toggle-thumb" />
                            </div>
                        </div>
                    </>
                )}

                {/* File upload config */}
                {element.type === 'file_upload' && (
                    <div className="form-group">
                        <label className="form-label">Accepted file types</label>
                        <input
                            className="form-input"
                            value={element.config.accept || ''}
                            onChange={e => patchConfig('accept', e.target.value)}
                            placeholder="e.g. image/*, .pdf, .docx"
                            style={{ fontSize: 13 }}
                        />
                        <label className="form-label" style={{ marginTop: 'var(--space-sm)' }}>Max file size (MB)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={element.config.maxSizeMB || 10}
                            min={1}
                            onChange={e => patchConfig('maxSizeMB', Number(e.target.value))}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                )}

                {/* Date config */}
                {element.type === 'date' && (
                    <div className="sb-toggle-wrap" onClick={() => patchConfig('includeTime', !element.config.includeTime)}>
                        <span className="sb-toggle-label">Include time</span>
                        <div className={`sb-toggle${element.config.includeTime ? ' on' : ''}`}>
                            <div className="sb-toggle-thumb" />
                        </div>
                    </div>
                )}

                {/* Section description */}
                {element.type === 'section' && (
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={element.config.description || ''}
                            onChange={e => patchConfig('description', e.target.value)}
                            placeholder="Optional descriptive text for this section…"
                            style={{ fontSize: 13 }}
                        />
                    </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
                    <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={onDelete}>
                        <Trash2 size={13} />
                        Delete question
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Preview Multi-Select Dropdown ─────────────────────────────

function PreviewMultiDropdown({ options, value, onChange }) {
    const [open, setOpen] = useState(false);
    const selected = Array.isArray(value) ? value : [];
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function toggle(opt) {
        if (selected.includes(opt)) {
            onChange(selected.filter(v => v !== opt));
        } else {
            onChange([...selected, opt]);
        }
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                className="form-select"
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', textAlign: 'left', minHeight: 38, width: '100%',
                }}
            >
                {selected.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>Select…</span>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                        {selected.map((s, i) => (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                                background: 'var(--primary-glow)', color: 'var(--primary)',
                                border: '1px solid var(--primary)',
                            }}>
                                {s}
                                <span style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}
                                    onClick={e => { e.stopPropagation(); toggle(s); }}>×</span>
                            </span>
                        ))}
                    </div>
                )}
                <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 6, opacity: 0.5 }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', maxHeight: 200, overflowY: 'auto',
                    zIndex: 50, boxShadow: 'var(--shadow-lg)',
                }}>
                    {options.map((opt, i) => {
                        const isSel = selected.includes(opt);
                        return (
                            <div
                                key={i}
                                onClick={() => toggle(opt)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                                    color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isSel ? 'var(--primary-glow)' : 'transparent',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? 'var(--primary-glow)' : 'transparent'; }}
                            >
                                <div style={{
                                    width: 14, height: 14, borderRadius: 3,
                                    border: `2px solid ${isSel ? 'var(--primary)' : 'var(--border)'}`,
                                    background: isSel ? 'var(--primary)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {isSel && <Check size={8} color="#fff" />}
                                </div>
                                {opt}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── PreviewQuestion ──────────────────────────────────────────

function PreviewQuestion({ element, value, onChange }) {
    const { type, label, hint, required, options = [], config = {} } = element;
    const [otherText, setOtherText] = useState('');

    // Both multiple_choice and checkboxes use array-based multi-select
    function toggleChoice(opt) {
        const current = Array.isArray(value) ? value : (value ? [value] : []);
        if (current.includes(opt)) {
            onChange(current.filter(v => v !== opt));
        } else {
            onChange([...current, opt]);
        }
    }

    const isOtherSelected = (Array.isArray(value) ? value : []).includes('__other__');
    const isRow = config.layout === 'row';

    return (
        <div className="sb-preview-question">
            {type === 'section' ? (
                <>
                    <div className="sb-preview-section-title">{label || 'Section'}</div>
                    {(hint || config.description) && (
                        <div className="sb-preview-section-desc">{hint || config.description}</div>
                    )}
                </>
            ) : (
                <>
                    <div className="sb-preview-q-label">
                        {label || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Untitled question</span>}
                        {required && <span className="sb-preview-q-required">*</span>}
                    </div>
                    {hint && <div className="sb-preview-q-hint">{hint}</div>}

                    {(type === 'short_text' || type === 'email' || type === 'phone') && (
                        <input
                            type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
                            className="form-input"
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                            placeholder={config.placeholder || ''}
                        />
                    )}
                    {type === 'long_text' && (
                        <textarea
                            className="form-textarea"
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                            placeholder={config.placeholder || ''}
                        />
                    )}
                    {type === 'dropdown' && !config.multiSelect && (
                        <select
                            className="form-select"
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                        >
                            <option value="">Select…</option>
                            {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    )}
                    {type === 'dropdown' && config.multiSelect && (
                        <PreviewMultiDropdown
                            options={options}
                            value={value}
                            onChange={onChange}
                        />
                    )}
                    {(type === 'multiple_choice' || type === 'checkboxes') && (
                        <>
                            <div className={`sb-preview-choices${isRow ? ' row' : ''}`}>
                                {options.map((opt, i) => {
                                    const isSelected = (Array.isArray(value) ? value : []).includes(opt);
                                    return (
                                        <div
                                            key={i}
                                            className={`sb-preview-choice${isSelected ? ' selected' : ''}`}
                                            onClick={() => toggleChoice(opt)}
                                        >
                                            {type === 'multiple_choice'
                                                ? <div className="sb-preview-choice-dot" />
                                                : <div className="sb-preview-checkbox-dot">
                                                    {isSelected && <Check size={9} color="#fff" />}
                                                </div>
                                            }
                                            {opt}
                                        </div>
                                    );
                                })}
                                {config.allowOther && (
                                    <div className={`sb-preview-choice${isOtherSelected ? ' selected' : ''}`} onClick={() => toggleChoice('__other__')}>
                                        {type === 'multiple_choice'
                                            ? <div className="sb-preview-choice-dot" />
                                            : <div className="sb-preview-checkbox-dot">
                                                {isOtherSelected && <Check size={9} color="#fff" />}
                                            </div>
                                        }
                                        Other
                                    </div>
                                )}
                            </div>
                            {config.allowOther && isOtherSelected && (
                                <input
                                    type="text"
                                    className="form-input sb-other-input"
                                    value={otherText}
                                    onChange={e => setOtherText(e.target.value)}
                                    placeholder="Please specify…"
                                    onClick={e => e.stopPropagation()}
                                    autoFocus
                                />
                            )}
                        </>
                    )}
                    {type === 'rating_scale' && (
                        <RatingScalePreview config={config} interactive={true} />
                    )}
                    {type === 'file_upload' && (
                        <div className="sb-preview-upload-zone">
                            <Upload size={24} />
                            <span>Drop your file here, or click to browse</span>
                            {config.accept && <span style={{ fontSize: 11 }}>Accepted: {config.accept}</span>}
                        </div>
                    )}
                    {type === 'date' && (
                        <DateTimePicker
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                            mode={config.includeTime ? 'datetime' : 'date'}
                        />
                    )}
                </>
            )}
        </div>
    );
}

// ─── PreviewMode ──────────────────────────────────────────────

function PreviewMode({ survey, onExit }) {
    const [previewPage, setPreviewPage] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const settings = survey.settings || {};
    const pages = survey.pages;
    const currentPage = pages[previewPage] || { elements: [] };
    const isFirst = previewPage === 0;
    const isLast = previewPage === pages.length - 1;
    const progress = pages.length > 1
        ? (submitted ? 100 : (previewPage / (pages.length - 1)) * 100)
        : (submitted ? 100 : 0);

    function setAnswer(id, val) {
        setAnswers(prev => ({ ...prev, [id]: val }));
    }

    const visibleElements = currentPage.elements;

    const previewStyle = {
        fontFamily: settings.fontFamily || undefined,
    };

    const contentBg = settings.bgColor ? { background: settings.bgColor } : {};
    const barColor = settings.progressBarColor || 'var(--primary)';

    const SHADOW_MAP = {
        none: 'none',
        sm: '0 1px 6px rgba(0,0,0,0.08)',
        md: '0 4px 24px rgba(0,0,0,0.12)',
        lg: '0 8px 40px rgba(0,0,0,0.18)',
        xl: '0 12px 60px rgba(0,0,0,0.25)',
    };
    const cardBgStyle = settings.cardBgColor ? { background: settings.cardBgColor } : {};
    const cardShadowStyle = settings.cardShadow ? { boxShadow: SHADOW_MAP[settings.cardShadow] || SHADOW_MAP.md } : {};

    const cardContent = (
        <div className="sb-preview-card" style={{ ...cardBgStyle, ...cardShadowStyle }}>
            {/* Progress bar — always visible for multi-page */}
            {pages.length > 1 && (
                <div className="sb-preview-progress-track">
                    <div
                        className="sb-preview-progress-fill"
                        style={{ width: `${progress}%`, background: barColor }}
                    />
                </div>
            )}

            <div className="sb-preview-card-body">
                {submitted ? (
                    <div className="sb-preview-thanks">
                        <div className="sb-preview-thanks-icon">
                            <Check size={26} />
                        </div>
                        <h2>Thank you!</h2>
                        <p>Your response has been recorded. We appreciate you taking the time.</p>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-md)' }} onClick={() => { setSubmitted(false); setPreviewPage(0); setAnswers({}); }}>
                            Start over
                        </button>
                    </div>
                ) : (
                    <>
                        {visibleElements.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)', fontSize: 14 }}>
                                This page has no questions yet.
                            </div>
                        ) : (
                            visibleElements.map(el => (
                                <PreviewQuestion
                                    key={el.id}
                                    element={el}
                                    value={answers[el.id]}
                                    onChange={val => setAnswer(el.id, val)}
                                />
                            ))
                        )}

                        <div className="sb-preview-nav">
                            <div>
                                {!isFirst && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewPage(p => p - 1)}>
                                        ← Back
                                    </button>
                                )}
                            </div>
                            <div>
                                {isLast ? (
                                    <button className="btn btn-primary" onClick={() => setSubmitted(true)}>
                                        Submit
                                    </button>
                                ) : (
                                    <button className="btn btn-primary btn-sm" onClick={() => setPreviewPage(p => p + 1)}>
                                        Next →
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="sb-preview-wrap" style={previewStyle}>
            {/* Exit bar */}
            <div className="sb-preview-exit-bar">
                <div className="sb-preview-dot" />
                <span className="sb-preview-exit-label">Preview</span>

                {/* Device toggle */}
                <div className="sb-preview-device-toggle">
                    <button
                        className={`sb-preview-device-btn${!isMobile ? ' active' : ''}`}
                        onClick={() => setIsMobile(false)}
                        title="Desktop view"
                    >
                        <Monitor size={14} />
                        Desktop
                    </button>
                    <button
                        className={`sb-preview-device-btn${isMobile ? ' active' : ''}`}
                        onClick={() => setIsMobile(true)}
                        title="Mobile view"
                    >
                        <Smartphone size={14} />
                        Mobile
                    </button>
                </div>

                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-sm" onClick={onExit}>
                    <EyeOff size={14} />
                    Back to editing
                </button>
            </div>

            <div className={`sb-preview-content${isMobile ? ' sb-preview-content--mobile' : ''}`} style={contentBg}>
                {isMobile ? (
                    <div className="sb-mobile-frame">
                        <div className="sb-mobile-frame-notch">
                            <div className="sb-mobile-frame-notch-cam" />
                        </div>
                        <div className="sb-mobile-frame-screen">
                            {cardContent}
                        </div>
                        <div className="sb-mobile-frame-home" />
                    </div>
                ) : (
                    cardContent
                )}
            </div>
        </div>
    );
}

// ─── Main SurveyBuilder ───────────────────────────────────────

export default function SurveyBuilder() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { state, dispatch, ACTIONS } = useData();

    const existingSurvey = (state.surveys || []).find(s => s.id === id);

    const [survey, setSurvey] = useState(() => ({
        title: existingSurvey?.title || 'Untitled Survey',
        pages: existingSurvey?.pages?.length ? existingSurvey.pages : [makePage()],
        settings: (existingSurvey?.settings && Object.keys(existingSurvey.settings).length) ? existingSurvey.settings : { ...DEFAULT_SETTINGS },
    }));
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const [activePage, setActivePage] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [isPreview, setIsPreview] = useState(false);

    // Sync title if the survey loads from context after initial render
    useEffect(() => {
        if (existingSurvey && survey.title === 'Untitled Survey' && existingSurvey.title !== 'Untitled Survey') {
            setSurvey(s => ({
                ...s,
                title: existingSurvey.title,
                pages: existingSurvey.pages?.length ? existingSurvey.pages : s.pages,
                settings: (existingSurvey.settings && Object.keys(existingSurvey.settings).length) ? existingSurvey.settings : s.settings,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingSurvey?.id]);

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only save if we have an ID and things have actually changed from the existing version
            // We do a simple stringify check for deep equality.
            if (id && existingSurvey) {
                const isChanged = JSON.stringify({ title: survey.title, pages: survey.pages, settings: survey.settings }) !==
                    JSON.stringify({ title: existingSurvey.title, pages: existingSurvey.pages, settings: existingSurvey.settings });

                if (isChanged) {
                    handleSave();
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [survey]);

    async function handleSave() {
        if (!id || saving) return;
        setSaving(true);
        try {
            const payload = { title: survey.title, pages: survey.pages, settings: survey.settings };
            console.log('[SurveyBuilder] Saving survey', id, 'with', payload.pages?.length, 'pages,',
                payload.pages?.reduce((n, p) => n + (p.elements?.length || 0), 0), 'total elements');
            const updated = await api.modifySurvey(id, payload);
            dispatch({ type: ACTIONS.UPDATE_SURVEY, payload: { ...existingSurvey, ...updated, title: survey.title, pages: survey.pages, settings: survey.settings }, _skipApi: true });
            console.log('[SurveyBuilder] Survey saved successfully');
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
        } catch (err) {
            console.error('[SurveyBuilder] Failed to save survey:', err);
        } finally {
            setSaving(false);
        }
    }

    // DnD state
    const dragSrcRef = useRef(null); // { pageIdx, elIdx }
    const [dropTargetIdx, setDropTargetIdx] = useState(null);
    const [dropPosition, setDropPosition] = useState('below'); // 'above' | 'below'
    const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);
    const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

    // Derived
    const currentPageData = survey.pages[activePage] || { elements: [] };
    const elements = currentPageData.elements;
    const selectedElement = elements.find(e => e.id === selectedId) || null;

    // Recovery survey check
    const isRecoverySurvey = existingSurvey?.type === 'recovery';
    const personalInfoFields = survey.settings?.personalInfoFields || [];

    function togglePersonalInfoField(key) {
        setSurvey(s => {
            const current = s.settings?.personalInfoFields || [];
            const next = current.includes(key)
                ? current.filter(k => k !== key)
                : [...current, key];
            return { ...s, settings: { ...s.settings, personalInfoFields: next } };
        });
    }

    // ── Survey mutations ──────────────────────────────────────

    function setSurveyTitle(title) {
        setSurvey(s => ({ ...s, title }));
    }

    function setPageName(pageIdx, name) {
        setSurvey(s => {
            const pages = s.pages.map((p, i) => i === pageIdx ? { ...p, name } : p);
            return { ...s, pages };
        });
    }

    function addPage() {
        const newPage = makePage();
        setSurvey(s => ({ ...s, pages: [...s.pages, newPage] }));
        setActivePage(survey.pages.length);
        setSelectedId(null);
    }

    function deletePage(idx) {
        if (survey.pages.length <= 1) return;
        if (elements.length > 0 && !window.confirm('Delete this page and all its questions?')) return;
        setSurvey(s => ({ ...s, pages: s.pages.filter((_, i) => i !== idx) }));
        setActivePage(prev => Math.min(prev, survey.pages.length - 2));
        setSelectedId(null);
    }

    function addElement(type, atIdx = null) {
        if (type === 'new_page') { addPage(); return; }
        const el = makeElement(type);
        setSurvey(s => {
            const pages = s.pages.map((p, i) => {
                if (i !== activePage) return p;
                const els = [...p.elements];
                if (atIdx !== null) {
                    els.splice(atIdx, 0, el);
                } else {
                    els.push(el);
                }
                return { ...p, elements: els };
            });
            return { ...s, pages };
        });
        setSelectedId(el.id);
    }

    function updateElement(id, patch) {
        setSurvey(s => {
            const pages = s.pages.map((p, pi) => {
                if (pi !== activePage) return p;
                return {
                    ...p,
                    elements: p.elements.map(el => el.id === id ? { ...el, ...patch } : el),
                };
            });
            return { ...s, pages };
        });
    }

    function deleteElement(id) {
        setSurvey(s => {
            const pages = s.pages.map((p, pi) => {
                if (pi !== activePage) return p;
                return { ...p, elements: p.elements.filter(el => el.id !== id) };
            });
            return { ...s, pages };
        });
        setSelectedId(null);
    }

    function reorderElements(pageIdx, fromIdx, toIdx) {
        if (fromIdx === toIdx) return;
        setSurvey(s => {
            const pages = s.pages.map((p, pi) => {
                if (pi !== pageIdx) return p;
                const els = [...p.elements];
                const [moved] = els.splice(fromIdx, 1);
                els.splice(toIdx, 0, moved);
                return { ...p, elements: els };
            });
            return { ...s, pages };
        });
    }

    // ── DnD handlers ─────────────────────────────────────────

    function handlePaletteDragStart(e, type) {
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
        setIsDraggingFromPalette(true);
    }

    function handlePaletteDragEnd() {
        setIsDraggingFromPalette(false);
    }

    function handleCardDragStart(e, elIdx) {
        dragSrcRef.current = { pageIdx: activePage, elIdx };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '__reorder__');
        requestAnimationFrame(() => {
            const card = e.target.closest('.sb-qcard');
            if (card) card.classList.add('sb-qcard--dragging');
        });
    }

    function handleCardDragEnd(e) {
        const card = e.target.closest('.sb-qcard');
        if (card) card.classList.remove('sb-qcard--dragging');
        dragSrcRef.current = null;
        setDropTargetIdx(null);
    }

    function handleCardDragOver(e, elIdx) {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? 'above' : 'below';
        setDropTargetIdx(elIdx);
        setDropPosition(pos);
    }

    function handleCardDrop(e, targetIdx) {
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer.getData('text/plain');
        if (data === '__reorder__' && dragSrcRef.current) {
            const { elIdx: fromIdx } = dragSrcRef.current;
            const insertAt = dropPosition === 'above' ? targetIdx : targetIdx + 1;
            const adjusted = fromIdx < insertAt ? insertAt - 1 : insertAt;
            reorderElements(activePage, fromIdx, adjusted);
        } else if (data && data !== '__reorder__') {
            const insertAt = dropPosition === 'above' ? targetIdx : targetIdx + 1;
            addElement(data, insertAt);
        }
        setDropTargetIdx(null);
        setIsDraggingFromPalette(false);
    }

    function handleCanvasDragOver(e) {
        e.preventDefault();
        setIsCanvasDragOver(true);
    }

    function handleCanvasDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsCanvasDragOver(false);
        }
    }

    function handleCanvasDrop(e) {
        e.preventDefault();
        setIsCanvasDragOver(false);
        setIsDraggingFromPalette(false);
        const data = e.dataTransfer.getData('text/plain');
        if (data && data !== '__reorder__') {
            addElement(data);
        }
    }

    // ── Page switching ────────────────────────────────────────

    function switchPage(idx) {
        setActivePage(idx);
        setSelectedId(null);
    }

    // ── Render ────────────────────────────────────────────────

    return (
        <div className={`sb-root${isPreview ? ' sb-preview-active' : ''}`}>
            {/* Topbar */}
            <div className="sb-topbar">
                <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => isPreview ? setIsPreview(false) : navigate(-1)}
                    title={isPreview ? 'Back to editing' : 'Back'}
                >
                    <ArrowLeft size={16} />
                </button>
                <div className="sb-topbar-sep" />
                <input
                    className="sb-topbar-title"
                    value={survey.title}
                    onChange={e => setSurveyTitle(e.target.value)}
                    placeholder="Survey title…"
                />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <button
                        className={`btn btn-sm ${justSaved ? 'btn-success' : 'btn-primary'}`}
                        onClick={handleSave}
                        disabled={saving}
                        style={justSaved ? { backgroundColor: 'var(--success)', borderColor: 'var(--success)' } : {}}
                    >
                        {justSaved ? <Check size={14} /> : <Save size={14} />}
                        {saving ? 'Saving…' : (justSaved ? 'Saved' : 'Save')}
                    </button>
                    <button
                        className={`btn btn-sm${isPreview ? ' btn-primary' : ' btn-secondary'}`}
                        onClick={() => setIsPreview(p => !p)}
                    >
                        <Eye size={14} />
                        {isPreview ? 'Editing' : 'Preview'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="sb-body">

                {/* Left Panel */}
                <div className="sb-left">
                    <div className="sb-left-header">
                        <div className="sb-left-title">Add to your survey</div>
                    </div>
                    <div className="sb-left-scroll">
                        {QUESTION_GROUPS.map(group => (
                            <div key={group.label} className="sb-palette-group">
                                <div className="sb-palette-group-label">{group.label}</div>
                                {group.types.map(({ type, label, icon: Icon }) => (
                                    <button
                                        key={type}
                                        className="sb-palette-item"
                                        draggable
                                        onClick={() => addElement(type)}
                                        onDragStart={e => handlePaletteDragStart(e, type)}
                                        onDragEnd={handlePaletteDragEnd}
                                    >
                                        <span className="sb-palette-item-icon">
                                            <Icon size={14} />
                                        </span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className="sb-canvas">
                    {isPreview ? (
                        <PreviewMode survey={{ ...survey, settings: survey.settings || {} }} onExit={() => setIsPreview(false)} />
                    ) : (
                        <>
                            {/* Page tabs */}
                            <div className="sb-page-tabs">
                                {survey.pages.map((page, idx) => (
                                    <button
                                        key={page.id}
                                        className={`sb-page-tab${activePage === idx ? ' active' : ''}`}
                                        onClick={() => switchPage(idx)}
                                    >
                                        <span>{page.name || `Page ${idx + 1}`}</span>
                                        {survey.pages.length > 1 && (
                                            <span
                                                className="sb-page-tab-close"
                                                onClick={e => { e.stopPropagation(); deletePage(idx); }}
                                                title="Delete page"
                                            >
                                                <X size={10} />
                                            </span>
                                        )}
                                    </button>
                                ))}
                                <button className="sb-page-add-btn" onClick={addPage}>
                                    <Plus size={12} />
                                    Add page
                                </button>
                            </div>

                            {/* Canvas scroll area */}
                            <div className="sb-canvas-scroll">
                                <div className="sb-canvas-body" key={activePage}>
                                    {/* Personal Information toggle block — recovery surveys only */}
                                    {isRecoverySurvey && activePage === 0 && (
                                        <div className="sb-personal-info-block">
                                            <div className="sb-personal-info-header">
                                                <User size={16} />
                                                <span>Personal Information Fields</span>
                                                <span className="sb-personal-info-badge">{personalInfoFields.length} selected</span>
                                            </div>
                                            <p className="sb-personal-info-desc">
                                                Toggle which standard fields to include. These will map directly to the recovery seeker's personal information.
                                            </p>
                                            <div className="sb-personal-info-grid">
                                                {PERSONAL_INFO_FIELDS.map(field => {
                                                    const isOn = personalInfoFields.includes(field.key);
                                                    return (
                                                        <div
                                                            key={field.key}
                                                            className={`sb-personal-info-toggle${isOn ? ' on' : ''}`}
                                                            onClick={() => togglePersonalInfoField(field.key)}
                                                        >
                                                            <div className={`sb-toggle${isOn ? ' on' : ''}`} style={{ width: 32, height: 18, flexShrink: 0 }}>
                                                                <div className="sb-toggle-thumb" />
                                                            </div>
                                                            <span>{field.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {elements.length === 0 ? (
                                        <div
                                            className={`sb-canvas-empty${isCanvasDragOver ? ' drag-over' : ''}`}
                                            onDragOver={handleCanvasDragOver}
                                            onDragLeave={handleCanvasDragLeave}
                                            onDrop={handleCanvasDrop}
                                        >
                                            <div className="sb-canvas-empty-icon">
                                                <MousePointerClick size={40} />
                                            </div>
                                            <h3>Start building your survey</h3>
                                            <p>Click or drag a question type from the left to begin</p>
                                        </div>
                                    ) : (
                                        <div
                                            className="sb-qcard-list"
                                            onDragOver={handleCanvasDragOver}
                                            onDragLeave={handleCanvasDragLeave}
                                            onDrop={handleCanvasDrop}
                                        >
                                            {elements.map((el, elIdx) => {
                                                const typeDef = TYPE_MAP[el.type] || {};
                                                const Icon = typeDef.icon || MessageSquare;
                                                const isSelected = el.id === selectedId;
                                                const showDropAbove = dropTargetIdx === elIdx && dropPosition === 'above';
                                                const showDropBelow = dropTargetIdx === elIdx && dropPosition === 'below';

                                                return (
                                                    <div
                                                        key={el.id}
                                                        className={[
                                                            'sb-qcard',
                                                            isSelected ? 'selected' : '',
                                                            showDropAbove ? 'sb-qcard--drop-above' : '',
                                                            showDropBelow ? 'sb-qcard--drop-below' : '',
                                                        ].filter(Boolean).join(' ')}
                                                        onClick={() => setSelectedId(isSelected ? null : el.id)}
                                                        onDragOver={e => handleCardDragOver(e, elIdx)}
                                                        onDragLeave={() => setDropTargetIdx(null)}
                                                        onDrop={e => handleCardDrop(e, elIdx)}
                                                    >
                                                        {/* Drag handle */}
                                                        <div
                                                            className="sb-qcard-handle"
                                                            draggable
                                                            onDragStart={e => { e.stopPropagation(); handleCardDragStart(e, elIdx); }}
                                                            onDragEnd={handleCardDragEnd}
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <GripVertical size={14} />
                                                        </div>

                                                        {/* Card body */}
                                                        <div className="sb-qcard-body">
                                                            <div className="sb-qcard-top">
                                                                <div className={`sb-qcard-label${!el.label ? ' placeholder' : ''}`}>
                                                                    {el.label || (el.type === 'section' ? 'Section heading…' : 'Your question…')}
                                                                </div>
                                                                {/* Hover controls */}
                                                                <div className="sb-qcard-controls">
                                                                    <button
                                                                        className="btn btn-ghost btn-sm btn-icon"
                                                                        title="Delete"
                                                                        onClick={e => { e.stopPropagation(); deleteElement(el.id); }}
                                                                        style={{ color: 'var(--danger)' }}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {el.hint && <div className="sb-qcard-hint">{el.hint}</div>}

                                                            {/* Preview */}
                                                            <QuestionCardPreview element={el} />

                                                            {/* Footer badges */}
                                                            <div className="sb-qcard-footer">
                                                                <span className="sb-qcard-type-badge">
                                                                    <Icon size={9} style={{ display: 'inline', marginRight: 3 }} />
                                                                    {typeDef.label || el.type}
                                                                </span>
                                                                {el.required && (
                                                                    <span className="sb-qcard-required-badge">Required</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Drop zone at bottom */}
                                            {isDraggingFromPalette && (
                                                <div
                                                    className={`sb-canvas-drop-zone${isCanvasDragOver ? ' drag-over' : ''}`}
                                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsCanvasDragOver(true); }}
                                                    onDrop={e => { e.stopPropagation(); handleCanvasDrop(e); }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Panel */}
                <div className="sb-right">
                    {selectedElement ? (
                        <EditPanel
                            element={selectedElement}
                            onUpdate={patch => updateElement(selectedId, patch)}
                            onDelete={() => deleteElement(selectedId)}
                        />
                    ) : (
                        <>
                            <div className="sb-right-header">
                                <Settings size={13} style={{ color: 'var(--text-muted)' }} />
                                <span className="sb-right-header-label">Survey Settings</span>
                            </div>
                            <div className="sb-right-scroll">
                                {/* ─── General ─── */}
                                <div className="sb-settings-section-label">General</div>
                                <div className="form-group">
                                    <label className="form-label">Survey title</label>
                                    <input
                                        className="form-input"
                                        value={survey.title}
                                        onChange={e => setSurveyTitle(e.target.value)}
                                        placeholder="Survey title…"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Page name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        className="form-input"
                                        value={currentPageData.name || ''}
                                        onChange={e => setPageName(activePage, e.target.value)}
                                        placeholder={`Page ${activePage + 1}`}
                                    />
                                </div>

                                <div className="sb-right-divider" />

                                {/* ─── Appearance ─── */}
                                <div className="sb-settings-section-label"><Palette size={12} /> Appearance</div>

                                <div className="form-group">
                                    <label className="form-label">Font family</label>
                                    <select
                                        className="form-select"
                                        value={survey.settings?.fontFamily || ''}
                                        onChange={e => setSurvey(s => ({ ...s, settings: { ...s.settings, fontFamily: e.target.value } }))}
                                        style={{ fontSize: 13 }}
                                    >
                                        {FONT_OPTIONS.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <SurveyColorPicker
                                    label="Page background"
                                    value={survey.settings?.bgColor || ''}
                                    defaultColor="#1a1a2e"
                                    onChange={val => setSurvey(s => ({ ...s, settings: { ...s.settings, bgColor: val } }))}
                                    onReset={() => setSurvey(s => ({ ...s, settings: { ...s.settings, bgColor: '' } }))}
                                />

                                <SurveyColorPicker
                                    label="Card background"
                                    value={survey.settings?.cardBgColor || ''}
                                    defaultColor="#1e1e30"
                                    onChange={val => setSurvey(s => ({ ...s, settings: { ...s.settings, cardBgColor: val } }))}
                                    onReset={() => setSurvey(s => ({ ...s, settings: { ...s.settings, cardBgColor: '' } }))}
                                />

                                <div className="form-group">
                                    <label className="form-label">Card shadow</label>
                                    <select
                                        className="form-select"
                                        value={survey.settings?.cardShadow || 'md'}
                                        onChange={e => setSurvey(s => ({ ...s, settings: { ...s.settings, cardShadow: e.target.value } }))}
                                        style={{ fontSize: 13 }}
                                    >
                                        <option value="none">None</option>
                                        <option value="sm">Small</option>
                                        <option value="md">Medium</option>
                                        <option value="lg">Large</option>
                                        <option value="xl">Extra Large</option>
                                    </select>
                                </div>

                                <SurveyColorPicker
                                    label="Progress bar colour"
                                    value={survey.settings?.progressBarColor || ''}
                                    defaultColor="#FF6100"
                                    onChange={val => setSurvey(s => ({ ...s, settings: { ...s.settings, progressBarColor: val } }))}
                                    onReset={() => setSurvey(s => ({ ...s, settings: { ...s.settings, progressBarColor: '' } }))}
                                />

                                <div className="sb-right-divider" />

                                <div className="sb-right-empty" style={{ flex: 'none', paddingTop: 'var(--space-md)' }}>
                                    <MousePointerClick size={28} style={{ opacity: 0.25 }} />
                                    <p>Click a question to edit its settings</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
