import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

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

// ─── Saturation/Value Canvas ──────────────────────────────────

function SatValCanvas({ hue, sat, val, onDrag }) {
    const canvasRef = useRef(null);
    const size = 200;

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const hueColor = hsvToHex(hue, 1, 1);
        const gradH = ctx.createLinearGradient(0, 0, size, 0);
        gradH.addColorStop(0, '#ffffff');
        gradH.addColorStop(1, hueColor);
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, size, size);
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

// ─── Hue Slider ───────────────────────────────────────────────

function HueSlider({ hue, onDrag }) {
    const barRef = useRef(null);
    const width = 200;

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

// ─── Preset Colors ────────────────────────────────────────────

const PRESET_COLORS = [
    '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#64748b',
];

// ─── ColorSwatchPicker ────────────────────────────────────────

export default function ColorSwatchPicker({ value, onChange }) {
    const [showCustom, setShowCustom] = useState(false);
    const popupRef = useRef(null);
    const triggerRef = useRef(null);
    const [popupStyle, setPopupStyle] = useState({});

    const isCustomColor = value && !PRESET_COLORS.includes(value);
    const display = value || '#6366f1';

    const initial = hexToHsv(display);
    const [hue, setHue] = useState(initial.h);
    const [sat, setSat] = useState(initial.s);
    const [val, setVal] = useState(initial.v);

    // Sync HSV when value changes externally
    useEffect(() => {
        const hsv = hexToHsv(display);
        setHue(hsv.h);
        setSat(hsv.s);
        setVal(hsv.v);
    }, [display]);

    // Position popup so it doesn't clip out of the viewport
    useEffect(() => {
        if (!showCustom || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const popupW = 228;
        const popupH = 310;

        // Try to position above the trigger
        let top = rect.top - popupH - 8;
        let left = rect.left;

        // If above would clip, position below
        if (top < 8) {
            top = rect.bottom + 8;
        }
        // If below would clip, just anchor to the bottom with some margin
        if (top + popupH > window.innerHeight - 8) {
            top = window.innerHeight - popupH - 8;
        }
        // Keep within horizontal bounds
        if (left + popupW > window.innerWidth - 8) {
            left = window.innerWidth - popupW - 8;
        }
        if (left < 8) left = 8;

        setPopupStyle({ position: 'fixed', top, left, zIndex: 9999 });
    }, [showCustom]);

    // Close on click outside
    useEffect(() => {
        function handler(e) {
            if (
                popupRef.current && !popupRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setShowCustom(false);
            }
        }
        if (showCustom) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCustom]);

    function commitColor(h, s, v) {
        onChange(hsvToHex(h, s, v));
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {/* Preset swatches */}
            {PRESET_COLORS.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => { onChange(c); setShowCustom(false); }}
                    style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        border: value === c ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                        cursor: 'pointer', padding: 0, outline: 'none',
                        boxShadow: value === c ? '0 0 0 2px var(--bg-primary)' : 'none',
                        transition: 'transform 0.1s, border-color 0.15s',
                        transform: value === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                />
            ))}

            {/* Custom colour trigger — rainbow circle with plus icon */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setShowCustom(o => !o)}
                style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isCustomColor
                        ? value
                        : 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                    padding: 0, cursor: 'pointer', outline: 'none',
                    border: (showCustom || isCustomColor)
                        ? '3px solid var(--text-primary)'
                        : '2px solid var(--border)',
                    boxShadow: (showCustom || isCustomColor) ? '0 0 0 2px var(--bg-primary)' : 'none',
                    transform: (showCustom || isCustomColor) ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.1s, border-color 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                }}
                title="Custom colour"
            >
                {!isCustomColor && (
                    <Plus size={12} strokeWidth={3} style={{ color: '#ffffff', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} />
                )}
            </button>

            {/* Custom colour picker popup — rendered as fixed so it can't be clipped */}
            {showCustom && (
                <div ref={popupRef} style={{
                    ...popupStyle,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                    padding: 14, width: 228,
                }}>
                    {/* Saturation / Value canvas */}
                    <SatValCanvas hue={hue} sat={sat} val={val} onDrag={(s, v) => { setSat(s); setVal(v); commitColor(hue, s, v); }} />

                    {/* Hue slider */}
                    <HueSlider hue={hue} onDrag={h => { setHue(h); commitColor(h, sat, val); }} />

                    {/* Preview + hex input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 'var(--radius-sm)', flexShrink: 0,
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
                            style={{ fontSize: 12, fontFamily: 'monospace', flex: 1, padding: '4px 8px' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
