import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as api from '../lib/api';
import {
    ArrowLeft, Eye, EyeOff, Plus, Trash2, GripVertical,
    MessageSquare, AlignLeft, Mail, Phone, List, CheckSquare,
    ChevronDown, SlidersHorizontal, Upload, Calendar, Minus,
    FilePlus, Check, X, MousePointerClick, Save,
} from 'lucide-react';

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

function defaultConfig(type) {
    switch (type) {
        case 'short_text':
        case 'long_text':
        case 'email':
        case 'phone':
            return { placeholder: '' };
        case 'multiple_choice':
        case 'checkboxes':
        case 'dropdown':
            return { allowOther: false };
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
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
                <div className="form-select" style={{ color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none', marginTop: 4 }}>
                    {options[0] || 'Select an option…'}
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
                        {element.type !== 'dropdown' && (
                            <div className="sb-toggle-wrap" style={{ marginTop: 'var(--space-sm)' }} onClick={() => patchConfig('allowOther', !element.config.allowOther)}>
                                <span className="sb-toggle-label">Allow "Other"</span>
                                <div className={`sb-toggle${element.config.allowOther ? ' on' : ''}`}>
                                    <div className="sb-toggle-thumb" />
                                </div>
                            </div>
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

// ─── PreviewQuestion ──────────────────────────────────────────

function PreviewQuestion({ element, value, onChange }) {
    const { type, label, hint, required, options = [], config = {} } = element;

    function toggleChoice(opt) {
        if (type === 'multiple_choice') {
            onChange(opt === value ? '' : opt);
        } else {
            const current = Array.isArray(value) ? value : [];
            onChange(current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt]);
        }
    }

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
                    {type === 'dropdown' && (
                        <select
                            className="form-select"
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                        >
                            <option value="">Select…</option>
                            {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    )}
                    {(type === 'multiple_choice' || type === 'checkboxes') && (
                        <div className="sb-preview-choices">
                            {options.map((opt, i) => {
                                const isSelected = type === 'multiple_choice'
                                    ? value === opt
                                    : (Array.isArray(value) ? value : []).includes(opt);
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
                                <div className={`sb-preview-choice${value === '__other__' ? ' selected' : ''}`} onClick={() => toggleChoice('__other__')}>
                                    {type === 'multiple_choice'
                                        ? <div className="sb-preview-choice-dot" />
                                        : <div className="sb-preview-checkbox-dot">
                                            {(Array.isArray(value) ? value : []).includes('__other__') && <Check size={9} color="#fff" />}
                                        </div>
                                    }
                                    Other
                                </div>
                            )}
                        </div>
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
                        <input
                            type={config.includeTime ? 'datetime-local' : 'date'}
                            className="form-input"
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
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

    const pages = survey.pages;
    const currentPage = pages[previewPage] || { elements: [] };
    const isFirst = previewPage === 0;
    const isLast = previewPage === pages.length - 1;
    const progress = pages.length > 1 ? (previewPage / (pages.length - 1)) * 100 : submitted ? 100 : 0;

    function setAnswer(id, val) {
        setAnswers(prev => ({ ...prev, [id]: val }));
    }

    // Filter out section-type elements from visible questions (they don't count as pages/navigation)
    const visibleElements = currentPage.elements;

    return (
        <div className="sb-preview-wrap">
            {/* Exit bar */}
            <div className="sb-preview-exit-bar">
                <div className="sb-preview-dot" />
                <span className="sb-preview-exit-label">Preview</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-sm" onClick={onExit}>
                    <EyeOff size={14} />
                    Back to editing
                </button>
            </div>

            <div className="sb-preview-content">
                <div className="sb-preview-card">
                    {/* Progress bar */}
                    {pages.length > 1 && (
                        <div className="sb-preview-progress-track">
                            <div className="sb-preview-progress-fill" style={{ width: `${progress}%` }} />
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
                                {pages.length > 1 && (
                                    <div className="sb-preview-page-label">
                                        {currentPage.name || `Page ${previewPage + 1}`} of {pages.length}
                                    </div>
                                )}

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
        pages: existingSurvey?.pages || [makePage()],
    }));
    const [saving, setSaving] = useState(false);

    const [activePage, setActivePage] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [isPreview, setIsPreview] = useState(false);

    // Sync title if the survey loads from context after initial render
    useEffect(() => {
        if (existingSurvey && survey.title === 'Untitled Survey') {
            setSurvey(s => ({ ...s, title: existingSurvey.title, pages: existingSurvey.pages || s.pages }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingSurvey?.id]);

    async function handleSave() {
        if (!id || saving) return;
        setSaving(true);
        try {
            const updated = await api.modifySurvey(id, { title: survey.title, pages: survey.pages });
            dispatch({ type: ACTIONS.UPDATE_SURVEY, payload: { ...existingSurvey, ...updated, title: survey.title, pages: survey.pages } });
        } catch (err) {
            console.error('Failed to save survey:', err);
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
                        className="btn btn-primary btn-sm"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={14} />
                        {saving ? 'Saving…' : 'Save'}
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
                        <PreviewMode survey={survey} onExit={() => setIsPreview(false)} />
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
                                <span className="sb-right-header-label">Survey settings</span>
                            </div>
                            <div className="sb-right-scroll">
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
                                <div className="sb-right-empty" style={{ flex: 'none', paddingTop: 'var(--space-xl)' }}>
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
