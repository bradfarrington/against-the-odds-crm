import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../lib/api';
import { ChevronRight, Star, Check } from 'lucide-react';

// ─── Answer input per question type ──────────────────────────

function QuestionInput({ question, value, onChange }) {
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
                    autoFocus
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
                    autoFocus
                    style={{ resize: 'vertical' }}
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
                    autoFocus
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
                    autoFocus
                />
            );

        case 'date':
            return (
                <input
                    className="ps-input"
                    type={settings.includeTime ? 'datetime-local' : 'date'}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    autoFocus
                    style={{ maxWidth: 280 }}
                />
            );

        case 'multiple_choice': {
            const choices = settings.choices || [];
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {choices.map((choice, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ps-choice ${value === choice ? 'ps-choice-selected' : ''}`}
                            onClick={() => onChange(choice)}
                        >
                            <span className="ps-choice-letter">{String.fromCharCode(65 + i)}</span>
                            {choice}
                        </button>
                    ))}
                    {settings.allowOther && (
                        <button
                            type="button"
                            className={`ps-choice ${typeof value === 'string' && !choices.includes(value) ? 'ps-choice-selected' : ''}`}
                            onClick={() => onChange('')}
                        >
                            <span className="ps-choice-letter">…</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {choices.map((choice, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ps-choice ${selected.includes(choice) ? 'ps-choice-selected' : ''}`}
                            onClick={() => toggle(choice)}
                        >
                            <span className="ps-choice-checkbox">{selected.includes(choice) ? '✓' : ''}</span>
                            {choice}
                        </button>
                    ))}
                </div>
            );
        }

        case 'dropdown': {
            const choices = settings.choices || [];
            return (
                <select
                    className="ps-input"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    style={{ maxWidth: 360 }}
                >
                    <option value="">{settings.placeholder || 'Select an option'}</option>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--ps-muted)' }}>
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
                                        color: filled ? '#f59e0b' : '#d1d5db',
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
                                        border: `2px solid ${selected ? '#4f46e5' : '#d1d5db'}`,
                                        background: selected ? '#4f46e5' : 'white',
                                        color: selected ? 'white' : '#374151',
                                        fontSize: 15, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                    {(settings.lowLabel || settings.highLabel) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#6b7280' }}>
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
                                    border: `2px solid ${selected ? '#4f46e5' : '#d1d5db'}`,
                                    background: selected ? '#4f46e5' : 'white',
                                    color: selected ? 'white' : '#374151',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            );

        case 'statement':
            return null;

        default:
            return null;
    }
}

// ─── Main Public Survey page ──────────────────────────────────

export default function PublicSurvey() {
    const { token } = useParams();

    const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'not_found' | 'closed'
    const [survey, setSurvey] = useState(null);
    const [questions, setQuestions] = useState([]);

    // -1 = welcome screen, 0..N-1 = question index, N = thank you screen
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
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
            const initialStep = result.survey.settings?.welcomeScreen?.enabled ? -1 : 0;
            setCurrentStep(initialStep);
            setLoadState('ready');
        }
        load();
    }, [token]);

    function setAnswer(questionId, value) {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        setError('');
    }

    function validateCurrent() {
        if (currentStep < 0 || currentStep >= questions.length) return true;
        const q = questions[currentStep];
        if (!q.required) return true;

        const val = answers[q.id];

        if (q.type === 'checkboxes') {
            if (!Array.isArray(val) || val.length === 0) {
                setError('Please select at least one option.');
                return false;
            }
            const { minSelections } = q.settings || {};
            if (minSelections && val.length < minSelections) {
                setError(`Please select at least ${minSelections} options.`);
                return false;
            }
        } else if (q.type === 'email') {
            if (!val || !val.includes('@')) {
                setError('Please enter a valid email address.');
                return false;
            }
        } else if (q.type === 'number') {
            if (val == null || val === '') {
                setError('Please enter a number.');
                return false;
            }
            const { min, max } = q.settings || {};
            if (min != null && val < min) { setError(`Minimum value is ${min}.`); return false; }
            if (max != null && val > max) { setError(`Maximum value is ${max}.`); return false; }
        } else if (q.type === 'yes_no') {
            if (val === undefined || val === null) {
                setError('Please make a selection.');
                return false;
            }
        } else if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'rating' || q.type === 'opinion_scale') {
            if (val == null || val === '') {
                setError('Please make a selection.');
                return false;
            }
        } else if (q.type === 'statement') {
            return true;
        } else {
            if (!val || String(val).trim() === '') {
                setError('This field is required.');
                return false;
            }
        }

        return true;
    }

    function advance() {
        if (!validateCurrent()) return;
        setError('');
        setCurrentStep(prev => prev + 1);
    }

    async function handleSubmit() {
        if (!validateCurrent()) return;
        setSubmitting(true);
        try {
            const answersArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
            const metadata = { userAgent: navigator.userAgent };
            await api.submitPublicSurveyResponse(survey.id, answersArray, metadata);
            setCurrentStep(questions.length); // advance to thank you
        } catch (err) {
            console.error('Submit failed:', err);
            setError('Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // Auto-advance for multiple_choice and yes_no
    function handleAnswerChange(questionId, value) {
        setAnswer(questionId, value);
        const q = questions[currentStep];
        if (q && (q.type === 'multiple_choice' || q.type === 'yes_no')) {
            // Short delay so the selection is visible before advancing
            setTimeout(() => {
                setError('');
                setCurrentStep(prev => {
                    const isLast = prev === questions.length - 1;
                    if (isLast) {
                        // Submit on last question auto-advance
                        const answersArray = Object.entries({ ...answers, [questionId]: value }).map(([qId, v]) => ({ questionId: qId, value: v }));
                        api.submitPublicSurveyResponse(survey.id, answersArray, { userAgent: navigator.userAgent })
                            .then(() => setCurrentStep(questions.length))
                            .catch(e => { console.error(e); setError('Submission failed.'); });
                        return prev; // stay while submitting
                    }
                    return prev + 1;
                });
            }, 350);
        }
    }

    const progressPct = questions.length === 0 ? 0 : Math.round(((Math.max(currentStep, 0)) / questions.length) * 100);

    // ── Render states ──────────────────────────────────────────

    if (loadState === 'loading') {
        return (
            <div style={pageStyle}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</div>
            </div>
        );
    }

    if (loadState === 'not_found') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <h1 style={headingStyle}>Survey not found</h1>
                    <p style={bodyStyle}>This survey link is invalid or has been removed.</p>
                </div>
            </div>
        );
    }

    if (loadState === 'closed') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <h1 style={headingStyle}>Survey closed</h1>
                    <p style={bodyStyle}>This survey is no longer accepting responses.</p>
                </div>
            </div>
        );
    }

    const settings = survey?.settings || {};

    // Welcome screen
    if (currentStep === -1) {
        const ws = settings.welcomeScreen || {};
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <h1 style={headingStyle}>{ws.title || survey.title}</h1>
                    {ws.description && <p style={bodyStyle}>{ws.description}</p>}
                    <button style={btnStyle} onClick={() => setCurrentStep(0)}>
                        {ws.buttonText || 'Start'} <ChevronRight style={{ width: 18, height: 18 }} />
                    </button>
                </div>
            </div>
        );
    }

    // Thank you screen
    if (currentStep >= questions.length) {
        const ty = settings.thankYouScreen || {};
        return (
            <div style={pageStyle}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Check style={{ width: 30, height: 30, color: '#16a34a' }} />
                    </div>
                    <h1 style={headingStyle}>{ty.title || 'Thank you!'}</h1>
                    {ty.description && <p style={bodyStyle}>{ty.description}</p>}
                </div>
            </div>
        );
    }

    // Question screen
    const q = questions[currentStep];
    const isLastQuestion = currentStep === questions.length - 1;
    const currentAnswer = answers[q.id];
    const autoAdvanceTypes = ['multiple_choice', 'yes_no'];

    return (
        <div style={pageStyle}>
            {/* Progress bar */}
            {settings.showProgressBar !== false && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, background: '#e5e7eb', zIndex: 100 }}>
                    <div style={{ height: '100%', background: '#4f46e5', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
                </div>
            )}

            <div style={cardStyle}>
                {/* Question number */}
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16, fontWeight: 500 }}>
                    {currentStep + 1} / {questions.length}
                </p>

                {/* Question */}
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8, lineHeight: 1.3 }}>
                    {q.title || 'Question'}
                    {q.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </h2>

                {q.description && (
                    <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>{q.description}</p>
                )}

                {/* Input */}
                <div style={{ marginBottom: 24 }}>
                    <QuestionInput
                        question={q}
                        value={currentAnswer}
                        onChange={val => {
                            if (autoAdvanceTypes.includes(q.type)) {
                                handleAnswerChange(q.id, val);
                            } else {
                                setAnswer(q.id, val);
                            }
                        }}
                    />
                </div>

                {/* Error */}
                {error && (
                    <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{error}</p>
                )}

                {/* Navigation */}
                {!autoAdvanceTypes.includes(q.type) && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {isLastQuestion ? (
                            <button style={btnStyle} onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Submitting…' : 'Submit'}
                                {!submitting && <Check style={{ width: 16, height: 16 }} />}
                            </button>
                        ) : (
                            <button style={btnStyle} onClick={advance}>
                                {q.type === 'statement' ? (settings.thankYouScreen?.buttonText || 'Continue') : 'Next'}
                                <ChevronRight style={{ width: 18, height: 18 }} />
                            </button>
                        )}
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={() => { setCurrentStep(p => p - 1); setError(''); }}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: 0 }}
                            >
                                ← Back
                            </button>
                        )}
                    </div>
                )}

                {/* Keyboard hint */}
                {!autoAdvanceTypes.includes(q.type) && q.type !== 'statement' && (
                    <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 16 }}>Press Enter ↵ to continue</p>
                )}
            </div>

            <style>{`
                .ps-input {
                    width: 100%;
                    padding: 12px 0;
                    border: none;
                    border-bottom: 2px solid #e5e7eb;
                    font-size: 18px;
                    color: #111827;
                    background: transparent;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .ps-input:focus {
                    border-bottom-color: #4f46e5;
                }
                .ps-input option { color: #111827; }
                .ps-choice {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    background: white;
                    font-size: 15px;
                    color: #374151;
                    cursor: pointer;
                    text-align: left;
                    transition: border-color 0.15s, background 0.15s;
                }
                .ps-choice:hover {
                    border-color: #4f46e5;
                    background: #f5f3ff;
                }
                .ps-choice-selected {
                    border-color: #4f46e5;
                    background: #ede9fe;
                    color: #3730a3;
                    font-weight: 600;
                }
                .ps-choice-letter {
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    border: 1px solid currentColor;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    flex-shrink: 0;
                    opacity: 0.7;
                }
                .ps-choice-checkbox {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    border: 2px solid currentColor;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    flex-shrink: 0;
                }
            `}</style>
        </div>
    );
}

// ─── Inline styles ────────────────────────────────────────────

const pageStyle = {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const cardStyle = {
    width: '100%',
    maxWidth: 640,
    background: 'white',
    borderRadius: 16,
    padding: '48px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};

const headingStyle = {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
    lineHeight: 1.3,
};

const bodyStyle = {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    lineHeight: 1.6,
};

const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
};
