import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as api from '../lib/api';
import Modal from '../components/Modal';
import {
    ArrowLeft, Save, Eye, Plus, ChevronUp, ChevronDown,
    Type, AlignLeft, ListOrdered, CheckSquare, ChevronDown as ChevronDownIcon,
    Star, Sliders, ToggleLeft, Calendar, MessageSquare, Mail, Hash,
    Settings, Check,
} from 'lucide-react';

// ─── Question type definitions ────────────────────────────────

const QUESTION_TYPES = [
    { type: 'short_text',      label: 'Short Text',      icon: Type,           description: 'Single line answer' },
    { type: 'long_text',       label: 'Long Text',        icon: AlignLeft,      description: 'Multi-line paragraph' },
    { type: 'multiple_choice', label: 'Multiple Choice',  icon: ListOrdered,    description: 'Pick one option' },
    { type: 'checkboxes',      label: 'Checkboxes',       icon: CheckSquare,    description: 'Pick multiple options' },
    { type: 'dropdown',        label: 'Dropdown',         icon: ChevronDownIcon,description: 'Select from a list' },
    { type: 'rating',          label: 'Rating',           icon: Star,           description: 'Star or icon rating' },
    { type: 'opinion_scale',   label: 'Opinion Scale',    icon: Sliders,        description: 'Numbered 1–10 scale' },
    { type: 'yes_no',          label: 'Yes / No',         icon: ToggleLeft,     description: 'Binary choice' },
    { type: 'date',            label: 'Date',             icon: Calendar,       description: 'Date picker' },
    { type: 'statement',       label: 'Statement',        icon: MessageSquare,  description: 'Display text, no input' },
    { type: 'email',           label: 'Email',            icon: Mail,           description: 'Email address' },
    { type: 'number',          label: 'Number',           icon: Hash,           description: 'Numeric input' },
];

const TYPE_MAP = Object.fromEntries(QUESTION_TYPES.map(t => [t.type, t]));

function defaultSettings(type) {
    switch (type) {
        case 'short_text':      return { placeholder: '', maxLength: null };
        case 'long_text':       return { placeholder: '', maxLength: null, minRows: 4 };
        case 'multiple_choice': return { choices: ['Option 1', 'Option 2'], allowOther: false, randomizeOrder: false };
        case 'checkboxes':      return { choices: ['Option 1', 'Option 2'], allowOther: false, randomizeOrder: false, minSelections: null, maxSelections: null };
        case 'dropdown':        return { choices: ['Option 1', 'Option 2'], placeholder: 'Select an option', allowOther: false };
        case 'rating':          return { steps: 5, shape: 'star', startAtOne: true, lowLabel: '', highLabel: '' };
        case 'opinion_scale':   return { steps: 10, startAtOne: true, lowLabel: '', highLabel: '' };
        case 'yes_no':          return { yesLabel: 'Yes', noLabel: 'No' };
        case 'date':            return { format: 'DD/MM/YYYY', includeTime: false };
        case 'statement':       return { buttonText: 'Continue', hideButton: false };
        case 'email':           return { placeholder: 'name@example.com' };
        case 'number':          return { placeholder: '', min: null, max: null, decimalPlaces: null };
        default:                return {};
    }
}

const DEFAULT_SURVEY_SETTINGS = {
    welcomeScreen: { enabled: false, title: '', description: '', buttonText: 'Start' },
    thankYouScreen: { enabled: true, title: 'Thank you!', description: '', buttonText: 'Submit another' },
    showProgressBar: true,
    shuffleQuestions: false,
};

// ─── Question Preview ─────────────────────────────────────────

function QuestionPreview({ question }) {
    const { type, settings = {} } = question;

    switch (type) {
        case 'short_text':
        case 'email':
            return <input className="form-input" placeholder={settings.placeholder || 'Type your answer…'} readOnly style={{ pointerEvents: 'none' }} />;
        case 'long_text':
            return <textarea className="form-input" placeholder={settings.placeholder || 'Type your answer…'} readOnly rows={settings.minRows || 3} style={{ pointerEvents: 'none', resize: 'none' }} />;
        case 'number':
            return <input type="number" className="form-input" placeholder={settings.placeholder || 'Enter a number'} readOnly style={{ pointerEvents: 'none' }} />;
        case 'multiple_choice':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(settings.choices || []).map((c, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', color: 'var(--text-secondary)', fontSize: 14 }}>
                            <input type="radio" readOnly style={{ pointerEvents: 'none' }} /> {c}
                        </label>
                    ))}
                    {settings.allowOther && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', color: 'var(--text-muted)', fontSize: 14 }}>
                            <input type="radio" readOnly style={{ pointerEvents: 'none' }} /> Other…
                        </label>
                    )}
                </div>
            );
        case 'checkboxes':
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(settings.choices || []).map((c, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', color: 'var(--text-secondary)', fontSize: 14 }}>
                            <input type="checkbox" readOnly style={{ pointerEvents: 'none' }} /> {c}
                        </label>
                    ))}
                    {settings.allowOther && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', color: 'var(--text-muted)', fontSize: 14 }}>
                            <input type="checkbox" readOnly style={{ pointerEvents: 'none' }} /> Other…
                        </label>
                    )}
                </div>
            );
        case 'dropdown':
            return (
                <select className="form-input" style={{ pointerEvents: 'none' }}>
                    <option>{settings.placeholder || 'Select an option'}</option>
                    {(settings.choices || []).map((c, i) => <option key={i}>{c}</option>)}
                </select>
            );
        case 'rating': {
            const steps = settings.steps || 5;
            const ShapeChar = settings.shape === 'heart' ? '♥' : settings.shape === 'circle' ? '●' : '★';
            return (
                <div style={{ display: 'flex', gap: 6 }}>
                    {Array.from({ length: steps }).map((_, i) => (
                        <span key={i} style={{ fontSize: 24, color: 'var(--text-muted)', opacity: 0.4 }}>{ShapeChar}</span>
                    ))}
                </div>
            );
        }
        case 'opinion_scale': {
            const steps = settings.steps || 10;
            const start = settings.startAtOne ? 1 : 0;
            return (
                <div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: steps }).map((_, i) => (
                            <div key={i} style={{
                                width: 36, height: 36, borderRadius: 6, border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, color: 'var(--text-muted)',
                            }}>
                                {start + i}
                            </div>
                        ))}
                    </div>
                    {(settings.lowLabel || settings.highLabel) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
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
                    <div style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14 }}>{settings.yesLabel || 'Yes'}</div>
                    <div style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14 }}>{settings.noLabel || 'No'}</div>
                </div>
            );
        case 'date':
            return <input type={settings.includeTime ? 'datetime-local' : 'date'} className="form-input" readOnly style={{ pointerEvents: 'none', maxWidth: 240 }} />;
        case 'statement':
            return settings.hideButton ? null : (
                <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>{settings.buttonText || 'Continue'}</button>
            );
        default:
            return null;
    }
}

// ─── Settings Panel per type ──────────────────────────────────

function QuestionSettingsPanel({ question, onChange }) {
    const { type, settings = {}, required } = question;

    function set(key, value) {
        onChange({ settings: { ...settings, [key]: value } });
    }

    function setChoice(index, value) {
        const choices = [...(settings.choices || [])];
        choices[index] = value;
        set('choices', choices);
    }

    function addChoice() {
        set('choices', [...(settings.choices || []), `Option ${(settings.choices || []).length + 1}`]);
    }

    function removeChoice(index) {
        const choices = (settings.choices || []).filter((_, i) => i !== index);
        set('choices', choices);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    Required
                    <input
                        type="checkbox"
                        checked={!!required}
                        onChange={e => onChange({ required: e.target.checked })}
                        style={{ width: 16, height: 16 }}
                    />
                </label>
            </div>

            {/* Placeholder (short_text, long_text, email, number, dropdown) */}
            {['short_text', 'long_text', 'email', 'number', 'dropdown'].includes(type) && (
                <div className="form-group">
                    <label className="form-label">Placeholder</label>
                    <input className="form-input" value={settings.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />
                </div>
            )}

            {/* Max length */}
            {['short_text', 'long_text'].includes(type) && (
                <div className="form-group">
                    <label className="form-label">Max characters</label>
                    <input type="number" className="form-input" value={settings.maxLength || ''} placeholder="No limit"
                        onChange={e => set('maxLength', e.target.value ? parseInt(e.target.value) : null)} />
                </div>
            )}

            {/* Choices (multiple_choice, checkboxes, dropdown) */}
            {['multiple_choice', 'checkboxes', 'dropdown'].includes(type) && (
                <div className="form-group">
                    <label className="form-label">Choices</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(settings.choices || []).map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: 4 }}>
                                <input className="form-input" value={c} onChange={e => setChoice(i, e.target.value)} style={{ flex: 1 }} />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-icon"
                                    onClick={() => removeChoice(i)}
                                    disabled={(settings.choices || []).length <= 1}
                                    style={{ color: 'var(--danger)' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addChoice} style={{ alignSelf: 'flex-start' }}>
                            + Add choice
                        </button>
                    </div>
                </div>
            )}

            {/* Allow other */}
            {['multiple_choice', 'checkboxes'].includes(type) && (
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Allow "Other"
                        <input type="checkbox" checked={!!settings.allowOther} onChange={e => set('allowOther', e.target.checked)} style={{ width: 16, height: 16 }} />
                    </label>
                </div>
            )}

            {/* Checkboxes min/max selections */}
            {type === 'checkboxes' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Min selections</label>
                        <input type="number" className="form-input" value={settings.minSelections || ''} placeholder="None"
                            onChange={e => set('minSelections', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Max selections</label>
                        <input type="number" className="form-input" value={settings.maxSelections || ''} placeholder="None"
                            onChange={e => set('maxSelections', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                </>
            )}

            {/* Rating */}
            {type === 'rating' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Steps (max rating)</label>
                        <select className="form-input" value={settings.steps || 5} onChange={e => set('steps', parseInt(e.target.value))}>
                            {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Icon shape</label>
                        <select className="form-input" value={settings.shape || 'star'} onChange={e => set('shape', e.target.value)}>
                            <option value="star">Star ★</option>
                            <option value="heart">Heart ♥</option>
                            <option value="circle">Circle ●</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Low label</label>
                        <input className="form-input" value={settings.lowLabel || ''} onChange={e => set('lowLabel', e.target.value)} placeholder="e.g. Poor" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">High label</label>
                        <input className="form-input" value={settings.highLabel || ''} onChange={e => set('highLabel', e.target.value)} placeholder="e.g. Excellent" />
                    </div>
                </>
            )}

            {/* Opinion scale */}
            {type === 'opinion_scale' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Steps</label>
                        <select className="form-input" value={settings.steps || 10} onChange={e => set('steps', parseInt(e.target.value))}>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Start at 1
                            <input type="checkbox" checked={settings.startAtOne !== false} onChange={e => set('startAtOne', e.target.checked)} style={{ width: 16, height: 16 }} />
                        </label>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Low label</label>
                        <input className="form-input" value={settings.lowLabel || ''} onChange={e => set('lowLabel', e.target.value)} placeholder="e.g. Not likely" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">High label</label>
                        <input className="form-input" value={settings.highLabel || ''} onChange={e => set('highLabel', e.target.value)} placeholder="e.g. Very likely" />
                    </div>
                </>
            )}

            {/* Yes/No labels */}
            {type === 'yes_no' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Yes label</label>
                        <input className="form-input" value={settings.yesLabel || 'Yes'} onChange={e => set('yesLabel', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">No label</label>
                        <input className="form-input" value={settings.noLabel || 'No'} onChange={e => set('noLabel', e.target.value)} />
                    </div>
                </>
            )}

            {/* Date */}
            {type === 'date' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Date format</label>
                        <select className="form-input" value={settings.format || 'DD/MM/YYYY'} onChange={e => set('format', e.target.value)}>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Include time
                            <input type="checkbox" checked={!!settings.includeTime} onChange={e => set('includeTime', e.target.checked)} style={{ width: 16, height: 16 }} />
                        </label>
                    </div>
                </>
            )}

            {/* Statement */}
            {type === 'statement' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Button text</label>
                        <input className="form-input" value={settings.buttonText || 'Continue'} onChange={e => set('buttonText', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Hide button
                            <input type="checkbox" checked={!!settings.hideButton} onChange={e => set('hideButton', e.target.checked)} style={{ width: 16, height: 16 }} />
                        </label>
                    </div>
                </>
            )}

            {/* Number */}
            {type === 'number' && (
                <>
                    <div className="form-group">
                        <label className="form-label">Minimum</label>
                        <input type="number" className="form-input" value={settings.min ?? ''} placeholder="No minimum"
                            onChange={e => set('min', e.target.value !== '' ? Number(e.target.value) : null)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Maximum</label>
                        <input type="number" className="form-input" value={settings.max ?? ''} placeholder="No maximum"
                            onChange={e => set('max', e.target.value !== '' ? Number(e.target.value) : null)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Decimal places</label>
                        <input type="number" className="form-input" value={settings.decimalPlaces ?? ''} placeholder="Any"
                            onChange={e => set('decimalPlaces', e.target.value !== '' ? parseInt(e.target.value) : null)} />
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Survey Settings Panel (no question selected) ─────────────

function SurveySettingsPanel({ settings, onChange }) {
    const ws = settings.welcomeScreen || {};
    const ty = settings.thankYouScreen || {};

    function setWs(key, value) {
        onChange({ welcomeScreen: { ...ws, [key]: value } });
    }
    function setTy(key, value) {
        onChange({ thankYouScreen: { ...ty, [key]: value } });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>General</div>
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Show progress bar
                        <input type="checkbox" checked={!!settings.showProgressBar} onChange={e => onChange({ showProgressBar: e.target.checked })} style={{ width: 16, height: 16 }} />
                    </label>
                </div>
            </div>

            <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>Welcome Screen</div>
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Enable
                        <input type="checkbox" checked={!!ws.enabled} onChange={e => setWs('enabled', e.target.checked)} style={{ width: 16, height: 16 }} />
                    </label>
                </div>
                {ws.enabled && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="form-input" value={ws.title || ''} onChange={e => setWs('title', e.target.value)} placeholder="Welcome!" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-input" rows={2} value={ws.description || ''} onChange={e => setWs('description', e.target.value)} placeholder="Intro text…" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Button text</label>
                            <input className="form-input" value={ws.buttonText || 'Start'} onChange={e => setWs('buttonText', e.target.value)} />
                        </div>
                    </>
                )}
            </div>

            <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>Thank You Screen</div>
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Enable
                        <input type="checkbox" checked={ty.enabled !== false} onChange={e => setTy('enabled', e.target.checked)} style={{ width: 16, height: 16 }} />
                    </label>
                </div>
                {ty.enabled !== false && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="form-input" value={ty.title || 'Thank you!'} onChange={e => setTy('title', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-input" rows={2} value={ty.description || ''} onChange={e => setTy('description', e.target.value)} placeholder="Closing message…" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Builder ─────────────────────────────────────────────

export default function SurveyBuilder() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { state, dispatch, ACTIONS } = useData();

    // Determine survey type from the URL path
    const surveyType = location.pathname.startsWith('/prevention') ? 'prevention' : 'recovery';

    const [survey, setSurvey] = useState({
        id: null,
        title: '',
        description: '',
        type: surveyType,
        status: 'draft',
        publicToken: null,
        settings: { ...DEFAULT_SURVEY_SETTINGS },
    });
    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(!!id);

    const activeQuestion = questions.find(q => q.id === activeQuestionId) ?? null;
    const backPath = `/${surveyType}/surveys`;

    // Load existing survey
    useEffect(() => {
        if (!id) {
            setLoadingInitial(false);
            return;
        }
        async function load() {
            const existing = state.surveys.find(s => s.id === id);
            if (existing) {
                setSurvey({
                    id: existing.id,
                    title: existing.title || '',
                    description: existing.description || '',
                    type: existing.type,
                    status: existing.status,
                    publicToken: existing.publicToken,
                    settings: existing.settings || { ...DEFAULT_SURVEY_SETTINGS },
                });
            }
            try {
                const qs = await api.fetchSurveyQuestions(id);
                setQuestions(qs);
            } catch (e) {
                console.error('Failed to load questions', e);
            }
            setLoadingInitial(false);
        }
        load();
    }, [id]);

    // ── Update helpers ─────────────────────────────────────────

    function updateSurvey(patch) {
        setSurvey(prev => ({ ...prev, ...patch }));
        setIsDirty(true);
    }

    function updateSurveySettings(patch) {
        setSurvey(prev => ({ ...prev, settings: { ...prev.settings, ...patch } }));
        setIsDirty(true);
    }

    function updateQuestion(qId, patch) {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...patch } : q));
        setIsDirty(true);
    }

    // ── Question management ────────────────────────────────────

    function addQuestion(type) {
        const newQ = {
            id: crypto.randomUUID(),
            _isNew: true,
            surveyId: survey.id || null,
            sortOrder: questions.length,
            type,
            title: '',
            description: '',
            required: false,
            settings: defaultSettings(type),
        };
        setQuestions(prev => [...prev, newQ]);
        setActiveQuestionId(newQ.id);
        setShowTypePicker(false);
        setIsDirty(true);
    }

    function deleteQuestion(qId) {
        setQuestions(prev => prev.filter(q => q.id !== qId).map((q, i) => ({ ...q, sortOrder: i })));
        if (activeQuestionId === qId) setActiveQuestionId(null);
        setIsDirty(true);
    }

    function moveQuestion(qId, direction) {
        setQuestions(prev => {
            const idx = prev.findIndex(q => q.id === qId);
            if (direction === 'up' && idx === 0) return prev;
            if (direction === 'down' && idx === prev.length - 1) return prev;
            const next = [...prev];
            const swap = direction === 'up' ? idx - 1 : idx + 1;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next.map((q, i) => ({ ...q, sortOrder: i }));
        });
        setIsDirty(true);
    }

    // ── Save ──────────────────────────────────────────────────

    async function handleSave() {
        setSaving(true);
        try {
            let savedSurvey;
            const surveyPayload = {
                title: survey.title || 'Untitled Survey',
                description: survey.description,
                type: survey.type,
                status: survey.status,
                settings: survey.settings,
            };

            if (!survey.id) {
                // New survey
                savedSurvey = await api.createSurvey(surveyPayload);
                setSurvey(prev => ({ ...prev, id: savedSurvey.id, publicToken: savedSurvey.publicToken }));
                dispatch({ type: ACTIONS.ADD_SURVEY, payload: { ...savedSurvey, questionCount: 0 } });
                // Update URL to edit route without triggering a re-mount
                window.history.replaceState({}, '', `/${surveyType}/surveys/${savedSurvey.id}/edit`);
            } else {
                savedSurvey = await api.modifySurvey(survey.id, surveyPayload);
                dispatch({ type: ACTIONS.UPDATE_SURVEY, payload: { id: survey.id, ...surveyPayload } });
            }

            const surveyId = savedSurvey.id || survey.id;

            // Save questions
            for (const q of questions) {
                const qPayload = {
                    surveyId,
                    sortOrder: q.sortOrder,
                    type: q.type,
                    title: q.title,
                    description: q.description || '',
                    required: q.required,
                    settings: q.settings,
                };
                if (q._isNew) {
                    const saved = await api.createSurveyQuestion(qPayload);
                    setQuestions(prev => prev.map(p => p.id === q.id ? { ...saved, _isNew: false } : p));
                } else {
                    await api.modifySurveyQuestion(q.id, qPayload);
                }
            }

            // Update questionCount in global state
            dispatch({ type: ACTIONS.UPDATE_SURVEY, payload: { id: surveyId, questionCount: questions.length } });

            setIsDirty(false);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    function handlePreview() {
        if (survey.publicToken) {
            window.open(`/survey/${survey.publicToken}`, '_blank');
        } else {
            alert('Save the survey first to generate a preview link.');
        }
    }

    const statusOptions = ['draft', 'active', 'closed'];
    const statusColors = { draft: 'var(--text-muted)', active: 'var(--success)', closed: 'var(--danger)' };

    if (loadingInitial) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Loading…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                padding: '12px var(--space-lg)',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                flexShrink: 0,
            }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(backPath)} title="Back to surveys">
                    <ArrowLeft style={{ width: 16, height: 16 }} />
                </button>

                <input
                    value={survey.title}
                    onChange={e => updateSurvey({ title: e.target.value })}
                    placeholder="Untitled Survey"
                    style={{
                        flex: 1, border: 'none', background: 'transparent',
                        fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
                        outline: 'none', padding: '4px 0',
                    }}
                />

                {/* Status selector */}
                <select
                    value={survey.status}
                    onChange={e => updateSurvey({ status: e.target.value })}
                    style={{
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px', fontSize: 12, fontWeight: 600,
                        color: statusColors[survey.status],
                        background: 'var(--bg-card)', cursor: 'pointer',
                    }}
                >
                    {statusOptions.map(s => (
                        <option key={s} value={s} style={{ color: 'var(--text-primary)' }}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                    ))}
                </select>

                <button className="btn btn-ghost btn-sm" onClick={handlePreview} title="Preview survey in new tab">
                    <Eye style={{ width: 14, height: 14 }} />
                    Preview
                </button>

                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                >
                    {saving ? (
                        <><Save style={{ width: 14, height: 14 }} /> Saving…</>
                    ) : isDirty ? (
                        <><Save style={{ width: 14, height: 14 }} /> Save</>
                    ) : (
                        <><Check style={{ width: 14, height: 14 }} /> Saved</>
                    )}
                </button>
            </div>

            {/* Three-panel body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left panel — Question list */}
                <div style={{
                    width: 260, flexShrink: 0,
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-card)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '12px var(--space-md)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Questions ({questions.length})
                        </span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-sm)' }}>
                        {questions.length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                                No questions yet.<br />Add one below.
                            </p>
                        )}
                        {questions.map((q, idx) => {
                            const typeDef = TYPE_MAP[q.type];
                            const Icon = typeDef?.icon;
                            const isActive = q.id === activeQuestionId;
                            return (
                                <div
                                    key={q.id}
                                    onClick={() => setActiveQuestionId(q.id)}
                                    style={{
                                        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                                        marginBottom: 2, cursor: 'pointer',
                                        background: isActive ? 'var(--primary)' : 'transparent',
                                        color: isActive ? '#fff' : 'var(--text-primary)',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, minWidth: 18, textAlign: 'center' }}>{idx + 1}</span>
                                    {Icon && <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {q.title || <em style={{ opacity: 0.5 }}>Untitled</em>}
                                        </div>
                                        <div style={{ fontSize: 10, opacity: 0.6 }}>{typeDef?.label}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <button
                                            onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'up'); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: 'inherit', opacity: idx === 0 ? 0.2 : 0.6 }}
                                            disabled={idx === 0}
                                        ><ChevronUp style={{ width: 10, height: 10 }} /></button>
                                        <button
                                            onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'down'); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: 'inherit', opacity: idx === questions.length - 1 ? 0.2 : 0.6 }}
                                            disabled={idx === questions.length - 1}
                                        ><ChevronDown style={{ width: 10, height: 10 }} /></button>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--danger)', opacity: 0.7 }}
                                        title="Delete question"
                                    >×</button>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ padding: 'var(--space-sm)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowTypePicker(true)} style={{ width: '100%' }}>
                            <Plus style={{ width: 13, height: 13 }} /> Add Question
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setActiveQuestionId(null)}
                            style={{ width: '100%', color: !activeQuestionId ? 'var(--primary)' : undefined }}
                        >
                            <Settings style={{ width: 13, height: 13 }} /> Survey Settings
                        </button>
                    </div>
                </div>

                {/* Center panel — Editor */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-xl)', background: 'var(--bg-primary)' }}>
                    {activeQuestion ? (
                        <div style={{ maxWidth: 640, margin: '0 auto' }}>
                            {/* Type badge */}
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '3px 8px',
                                    borderRadius: 'var(--radius-sm)', background: 'var(--primary)',
                                    color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                    {TYPE_MAP[activeQuestion.type]?.label}
                                </span>
                            </div>

                            {/* Question title */}
                            <input
                                value={activeQuestion.title}
                                onChange={e => updateQuestion(activeQuestion.id, { title: e.target.value })}
                                placeholder="Your question…"
                                style={{
                                    width: '100%', border: 'none', background: 'transparent',
                                    fontSize: 22, fontWeight: 600, color: 'var(--text-primary)',
                                    outline: 'none', marginBottom: 'var(--space-sm)',
                                    lineHeight: 1.3,
                                }}
                            />

                            {/* Description */}
                            <textarea
                                value={activeQuestion.description || ''}
                                onChange={e => updateQuestion(activeQuestion.id, { description: e.target.value })}
                                placeholder="Add a description or hint (optional)…"
                                rows={2}
                                style={{
                                    width: '100%', border: 'none', background: 'transparent',
                                    fontSize: 14, color: 'var(--text-secondary)',
                                    outline: 'none', resize: 'none', marginBottom: 'var(--space-lg)',
                                }}
                            />

                            {/* Preview */}
                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <QuestionPreview question={activeQuestion} />
                            </div>

                            {/* Required badge */}
                            {activeQuestion.required && (
                                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 'var(--space-sm)' }}>* Required</p>
                            )}
                        </div>
                    ) : (
                        <div style={{ maxWidth: 640, margin: '0 auto' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>Survey Settings</h2>

                            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                                <div className="form-group">
                                    <label className="form-label">Survey Title</label>
                                    <input className="form-input" value={survey.title} onChange={e => updateSurvey({ title: e.target.value })} placeholder="Untitled Survey" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-input" rows={3} value={survey.description || ''} onChange={e => updateSurvey({ description: e.target.value })} placeholder="Describe what this survey is for…" />
                                </div>
                            </div>

                            {questions.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>
                                    <Plus style={{ width: 40, height: 40, marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                                    <p style={{ fontWeight: 500 }}>Add your first question</p>
                                    <p style={{ fontSize: 13, marginTop: 4 }}>Click "Add Question" in the left panel.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right panel — Settings */}
                <div style={{
                    width: 280, flexShrink: 0,
                    borderLeft: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    overflowY: 'auto',
                    padding: 'var(--space-md)',
                }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-md)' }}>
                        {activeQuestion ? 'Question Settings' : 'Survey Options'}
                    </div>
                    {activeQuestion ? (
                        <QuestionSettingsPanel
                            question={activeQuestion}
                            onChange={patch => updateQuestion(activeQuestion.id, patch)}
                        />
                    ) : (
                        <SurveySettingsPanel
                            settings={survey.settings}
                            onChange={updateSurveySettings}
                        />
                    )}
                </div>
            </div>

            {/* Question Type Picker Modal */}
            <Modal isOpen={showTypePicker} onClose={() => setShowTypePicker(false)} title="Choose a question type" size="lg">
                <div className="modal-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                        {QUESTION_TYPES.map(({ type, label, icon: Icon, description }) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => addQuestion(type)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                    gap: 4, padding: 'var(--space-md)',
                                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-primary)', cursor: 'pointer',
                                    textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                            >
                                <Icon style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
