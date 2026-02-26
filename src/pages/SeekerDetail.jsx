import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import * as api from '../lib/api';
import {
    ArrowLeft, Mail, Phone, MapPin, User, Calendar,
    AlertTriangle, HeartHandshake, Plus, Pill, Star,
    FileText, Shield, ClipboardList, Download,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmailTimeline from '../components/EmailTimeline';
import CoachingSessionModal from '../components/CoachingSessionModal';

export default function SeekerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [showSubstanceModal, setShowSubstanceModal] = useState(false);
    const [substanceForm, setSubstanceForm] = useState({ substance: '', frequency: '', duration: '', notes: '' });
    const [activeTab, setActiveTab] = useState('overview');

    // Survey fill-in modal state
    const [showSurveyModal, setShowSurveyModal] = useState(false);
    const [activeSurveyId, setActiveSurveyId] = useState(null);
    const [surveyFormAnswers, setSurveyFormAnswers] = useState({});
    const [savingSurvey, setSavingSurvey] = useState(false);

    const seeker = state.recoverySeekers.find(s => s.id === id);

    if (!seeker) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <HeartHandshake />
                    <h3>Recovery seeker not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/recovery-seekers')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Recovery Seekers
                    </button>
                </div>
            </div>
        );
    }

    const getRiskColor = (level) => {
        if (level === 'High') return '#EF4444';
        if (level === 'Medium') return '#FBBF24';
        return '#22C55E';
    };

    const handleEditSession = (session) => {
        setEditingSession(session);
        setIsEditingSession(true);
        setShowSessionModal(true);
    };

    const handleDeleteSession = (sessionId) => {
        if (window.confirm("Are you sure you want to delete this session?")) {
            dispatch({
                type: ACTIONS.DELETE_COACHING_SESSION,
                payload: {
                    seekerId: id,
                    sessionId: sessionId
                }
            });
        }
    };

    const handleAddSubstance = (e) => {
        e.preventDefault();
        const updated = { ...seeker, substanceUse: [...(seeker.substanceUse || []), substanceForm] };
        dispatch({ type: ACTIONS.UPDATE_SEEKER, payload: updated });
        setSubstanceForm({ substance: '', frequency: '', duration: '', notes: '' });
        setShowSubstanceModal(false);
    };

    const avgProgress = seeker.coachingSessions?.length
        ? Math.round(seeker.coachingSessions.reduce((s, c) => s + c.progressRating, 0) / seeker.coachingSessions.length * 10)
        : 0;

    // Recovery surveys for dynamic tabs
    const recoverySurveys = (state.surveys || []).filter(s => s.type === 'recovery');

    const PERSONAL_INFO_LABELS = {
        firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
        address: 'Address', dateOfBirth: 'Date of Birth', gender: 'Gender', referralSource: 'Referral Source',
    };

    function openSurveyFillIn(surveyId) {
        const survey = recoverySurveys.find(s => s.id === surveyId);
        if (!survey) return;
        // Pre-fill with existing answers if available
        const existing = (seeker.surveyAnswers || []).find(sa => sa.surveyId === surveyId);
        const initial = existing?.answers || {};
        // Also pre-fill personal info from seeker data
        const piFields = survey.settings?.personalInfoFields || [];
        piFields.forEach(key => {
            if (seeker[key] && !initial[`__pi_${key}`]) {
                initial[`__pi_${key}`] = seeker[key];
            }
        });
        setSurveyFormAnswers(initial);
        setActiveSurveyId(surveyId);
        setShowSurveyModal(true);
    }

    async function saveSurveyAnswers() {
        if (!activeSurveyId || savingSurvey) return;
        setSavingSurvey(true);
        try {
            const survey = recoverySurveys.find(s => s.id === activeSurveyId);
            const piFields = survey?.settings?.personalInfoFields || [];

            // Extract personal info and custom answers
            const personalInfo = {};
            const customAnswers = {};
            for (const [key, val] of Object.entries(surveyFormAnswers)) {
                if (key.startsWith('__pi_')) {
                    personalInfo[key.replace('__pi_', '')] = val;
                } else {
                    customAnswers[key] = val;
                }
            }

            // Update seeker personal info
            if (Object.keys(personalInfo).length > 0) {
                dispatch({ type: ACTIONS.UPDATE_SEEKER, payload: { id: seeker.id, ...personalInfo } });
            }

            // Save custom answers
            await api.upsertSeekerSurveyAnswers(seeker.id, activeSurveyId, customAnswers);
            dispatch({
                type: ACTIONS.UPDATE_SEEKER_SURVEY_ANSWERS,
                payload: { seekerId: seeker.id, surveyId: activeSurveyId, answers: customAnswers },
                _skipApi: true,
            });

            setShowSurveyModal(false);
        } catch (err) {
            console.error('Failed to save survey answers:', err);
        } finally {
            setSavingSurvey(false);
        }
    }

    function downloadPDF(surveyId) {
        const survey = recoverySurveys.find(s => s.id === surveyId);
        if (!survey) return;
        const answers = (seeker.surveyAnswers || []).find(sa => sa.surveyId === surveyId)?.answers || {};
        const piFields = survey.settings?.personalInfoFields || [];
        const elements = (survey.pages || []).flatMap(p => p.elements || []);

        // Build printable HTML
        let html = `<html><head><title>${survey.title} - ${seeker.firstName} ${seeker.lastName}</title>`;
        html += `<style>body{font-family:system-ui,-apple-system,sans-serif;padding:40px;color:#1a1a2e;max-width:700px;margin:0 auto}`;
        html += `h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;color:#6b7280;margin-bottom:24px;font-weight:400}`;
        html += `.field{margin-bottom:16px}.label{font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px}`;
        html += `.value{font-size:15px;color:#1a1a2e;padding:8px 0;border-bottom:1px solid #e5e7eb}`;
        html += `.section{margin-top:24px;padding-top:16px;border-top:2px solid #e5e7eb}`;
        html += `</style></head><body>`;
        html += `<h1>${survey.title}</h1>`;
        html += `<h2>${seeker.firstName} ${seeker.lastName} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>`;

        if (piFields.length) {
            html += `<div class="section"><div style="font-weight:600;font-size:14px;margin-bottom:12px">Personal Information</div>`;
            piFields.forEach(key => {
                html += `<div class="field"><div class="label">${PERSONAL_INFO_LABELS[key] || key}</div><div class="value">${seeker[key] || '—'}</div></div>`;
            });
            html += `</div>`;
        }

        if (elements.length) {
            html += `<div class="section"><div style="font-weight:600;font-size:14px;margin-bottom:12px">Survey Responses</div>`;
            elements.forEach(el => {
                if (el.type === 'section') {
                    html += `<div style="font-weight:600;font-size:15px;margin-top:20px;margin-bottom:8px">${el.label || 'Section'}</div>`;
                } else {
                    const val = answers[el.id];
                    const display = Array.isArray(val) ? val.join(', ') : (val || '—');
                    html += `<div class="field"><div class="label">${el.label || 'Untitled'}</div><div class="value">${display}</div></div>`;
                }
            });
            html += `</div>`;
        }

        html += `</body></html>`;

        const printWin = window.open('', '_blank');
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); }, 300);
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/recovery-seekers')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            {seeker.firstName} {seeker.lastName}
                        </h1>
                        <div className="page-header-subtitle" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            <StatusBadge status={seeker.status} />
                            <StatusBadge status={seeker.riskLevel} />
                            <span>· {seeker.referralSource}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={`tab ${activeTab === 'gambling' ? 'active' : ''}`} onClick={() => setActiveTab('gambling')}>Gambling Profile</button>
                    <button className={`tab ${activeTab === 'substance' ? 'active' : ''}`} onClick={() => setActiveTab('substance')}>Substance Use</button>
                    <button className={`tab ${activeTab === 'coaching' ? 'active' : ''}`} onClick={() => setActiveTab('coaching')}>Coaching Sessions</button>
                    <button className={`tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>Emails</button>
                    {recoverySurveys.map(survey => (
                        <button
                            key={survey.id}
                            className={`tab ${activeTab === `survey_${survey.id}` ? 'active' : ''}`}
                            onClick={() => setActiveTab(`survey_${survey.id}`)}
                        >
                            <ClipboardList size={13} style={{ marginRight: 4 }} />
                            {survey.title}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="detail-sections fade-in-up">
                        {/* Quick Stats */}
                        <div className="grid-3">
                            <div className="stat-card">
                                <div className="stat-card-label">Coaching Sessions</div>
                                <div className="stat-card-value">{seeker.coachingSessions?.length || 0}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Avg Progress</div>
                                <div className="stat-card-value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    {avgProgress}%
                                    <div className="progress-bar" style={{ flex: 1, height: 8 }}>
                                        <div className="progress-bar-fill" style={{
                                            width: `${avgProgress}%`,
                                            background: avgProgress > 60 ? 'var(--success)' : avgProgress > 30 ? 'var(--warning)' : 'var(--danger)'
                                        }} />
                                    </div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-label">Substances Recorded</div>
                                <div className="stat-card-value">{seeker.substanceUse?.length || 0}</div>
                            </div>
                        </div>

                        {/* Personal Info */}
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <User size={18} /> Personal Information
                                </h3>
                            </div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Full Name</span>
                                        <span className="info-value">{seeker.firstName} {seeker.lastName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Date of Birth</span>
                                        <span className="info-value">{seeker.dateOfBirth || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Gender</span>
                                        <span className="info-value">{seeker.gender || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Referral Source</span>
                                        <span className="info-value">{seeker.referralSource || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {seeker.email || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Phone</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {seeker.phone || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="info-label">Address</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {seeker.address || '—'}
                                        </span>
                                    </div>
                                    {seeker.notes && (
                                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Notes</span>
                                            <span className="info-value">{seeker.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gambling Profile Tab */}
                {activeTab === 'gambling' && (
                    <div className="detail-sections fade-in-up">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <AlertTriangle size={18} style={{ color: getRiskColor(seeker.riskLevel) }} />
                                    Gambling Profile
                                </h3>
                                <StatusBadge status={seeker.riskLevel} />
                            </div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Gambling Type</span>
                                        <span className="info-value">{seeker.gamblingType || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Frequency</span>
                                        <span className="info-value">{seeker.gamblingFrequency || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Duration</span>
                                        <span className="info-value">{seeker.gamblingDuration || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Triggers</span>
                                        <span className="info-value">{seeker.gamblingTriggers || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Substance Use Tab */}
                {activeTab === 'substance' && (
                    <div className="detail-sections fade-in-up">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Pill size={18} /> Substance Use
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowSubstanceModal(true)}>
                                    <Plus size={14} /> Add Record
                                </button>
                            </div>
                            {seeker.substanceUse && seeker.substanceUse.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Substance</th>
                                                <th>Frequency</th>
                                                <th>Duration</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {seeker.substanceUse.map((s, i) => (
                                                <tr key={i}>
                                                    <td className="table-cell-main">{s.substance}</td>
                                                    <td className="table-cell-secondary">{s.frequency}</td>
                                                    <td className="table-cell-secondary">{s.duration}</td>
                                                    <td className="table-cell-secondary">{s.notes || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Shield />
                                        <h3>No substance use recorded</h3>
                                        <p>Add substance use records for this recovery seeker</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Coaching Sessions Tab */}
                {activeTab === 'coaching' && (
                    <div className="detail-sections fade-in-up">
                        <div className="section-header">
                            <h3>Coaching Sessions</h3>
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                setEditingSession(null);
                                setIsEditingSession(false);
                                setShowSessionModal(true);
                            }}>
                                <Plus size={14} /> Log Session
                            </button>
                        </div>
                        {seeker.coachingSessions && seeker.coachingSessions.length > 0 ? (
                            <div className="card-body">
                                <div className="activity-list">
                                    {[...seeker.coachingSessions].reverse().map((session, i) => (
                                        <div key={i} className="activity-item" style={{ padding: 'var(--space-md) 0' }}>
                                            <div className="activity-icon" style={{
                                                background: session.progressRating >= 6 ? 'var(--success-bg)' : session.progressRating >= 4 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                                                color: session.progressRating >= 6 ? 'var(--success)' : session.progressRating >= 4 ? 'var(--warning)' : 'var(--danger)',
                                            }}>
                                                <Star size={16} />
                                            </div>
                                            <div className="activity-content" style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                                                            {session.date ? new Date(session.date).toLocaleString('en-GB', {
                                                                weekday: 'short',
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: false
                                                            }).replace(/,/g, '') : 'No Date Set'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Progress:</span>
                                                        <div className="progress-bar" style={{ width: 80, height: 6 }}>
                                                            <div className="progress-bar-fill" style={{
                                                                width: `${session.progressRating * 10}%`,
                                                                background: session.progressRating >= 6 ? 'var(--success)' : session.progressRating >= 4 ? 'var(--warning)' : 'var(--danger)'
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{session.progressRating}/10</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginLeft: 'var(--space-md)' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditSession(session)}>Edit</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSession(session.id)}>Delete</button>
                                                    </div>
                                                </div>
                                                <div className="activity-text" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{session.notes}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="card-body">
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <FileText />
                                    <h3>No coaching sessions</h3>
                                    <p>Log the first coaching session for this recovery seeker</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Emails Tab */}
                {activeTab === 'emails' && (
                    <div className="detail-sections">
                        <EmailTimeline contactId={seeker.id} contactEmail={seeker.email} linkedType="seeker" />
                    </div>
                )}

                {/* Dynamic Survey Tabs */}
                {recoverySurveys.map(survey => {
                    if (activeTab !== `survey_${survey.id}`) return null;
                    const existingAnswers = (seeker.surveyAnswers || []).find(sa => sa.surveyId === survey.id);
                    const hasAnswers = existingAnswers && Object.keys(existingAnswers.answers || {}).length > 0;
                    const piFields = survey.settings?.personalInfoFields || [];
                    const elements = (survey.pages || []).flatMap(p => p.elements || []);

                    return (
                        <div key={survey.id} className="detail-sections fade-in-up">
                            {hasAnswers ? (
                                <>
                                    {/* Personal info from survey */}
                                    {piFields.length > 0 && (
                                        <div className="card detail-section">
                                            <div className="card-header">
                                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <User size={18} /> Personal Information
                                                </h3>
                                            </div>
                                            <div className="card-body">
                                                <div className="info-grid">
                                                    {piFields.map(key => (
                                                        <div className="info-item" key={key}>
                                                            <span className="info-label">{PERSONAL_INFO_LABELS[key]}</span>
                                                            <span className="info-value">{seeker[key] || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom answers */}
                                    {elements.length > 0 && (
                                        <div className="card detail-section">
                                            <div className="card-header">
                                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <ClipboardList size={18} /> Survey Responses
                                                </h3>
                                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => openSurveyFillIn(survey.id)}>
                                                        Edit Answers
                                                    </button>
                                                    <button className="btn btn-primary btn-sm" onClick={() => downloadPDF(survey.id)}>
                                                        <Download size={14} /> Download PDF
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="card-body">
                                                <div className="info-grid">
                                                    {elements.filter(el => el.type !== 'section').map(el => {
                                                        const val = existingAnswers.answers[el.id];
                                                        const display = Array.isArray(val) ? val.join(', ') : (val || '—');
                                                        return (
                                                            <div className="info-item" key={el.id}>
                                                                <span className="info-label">{el.label || 'Untitled'}</span>
                                                                <span className="info-value">{display}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {existingAnswers?.submittedAt && (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', marginTop: 'var(--space-sm)' }}>
                                            Last submitted: {new Date(existingAnswers.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="card">
                                    <div className="card-body">
                                        <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                                            <ClipboardList size={40} style={{ opacity: 0.3 }} />
                                            <h3>No responses yet</h3>
                                            <p>Fill in this survey for {seeker.firstName} {seeker.lastName}</p>
                                            <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => openSurveyFillIn(survey.id)}>
                                                <Plus size={16} /> Fill In Survey
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <CoachingSessionModal
                isOpen={showSessionModal}
                onClose={() => {
                    setShowSessionModal(false);
                    setIsEditingSession(false);
                    setEditingSession(null);
                }}
                seekerId={id}
                session={isEditingSession ? editingSession : null}
            />

            {/* Add Substance Modal */}
            <Modal isOpen={showSubstanceModal} onClose={() => setShowSubstanceModal(false)} title="Add Substance Use Record">
                <form onSubmit={handleAddSubstance}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Substance *</label>
                            <select className="form-select" required value={substanceForm.substance} onChange={e => setSubstanceForm(prev => ({ ...prev, substance: e.target.value }))}>
                                <option value="">Select...</option>
                                <option>Alcohol</option>
                                <option>Cannabis</option>
                                <option>Cocaine</option>
                                <option>MDMA</option>
                                <option>Opioids</option>
                                <option>Benzodiazepines</option>
                                <option>Amphetamines</option>
                                <option>Nicotine</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <select className="form-select" value={substanceForm.frequency} onChange={e => setSubstanceForm(prev => ({ ...prev, frequency: e.target.value }))}>
                                    <option value="">Select...</option>
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                    <option>Weekend use</option>
                                    <option>Monthly</option>
                                    <option>Occasional</option>
                                    <option>Formerly used</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Duration</label>
                                <input className="form-input" value={substanceForm.duration} onChange={e => setSubstanceForm(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 3 years" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={substanceForm.notes} onChange={e => setSubstanceForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional context..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowSubstanceModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Record</button>
                    </div>
                </form>
            </Modal>

            {/* Survey Fill-In Modal */}
            {showSurveyModal && activeSurveyId && (() => {
                const survey = recoverySurveys.find(s => s.id === activeSurveyId);
                if (!survey) return null;
                const piFields = survey.settings?.personalInfoFields || [];
                const elements = (survey.pages || []).flatMap(p => p.elements || []);
                return (
                    <Modal isOpen={showSurveyModal} onClose={() => setShowSurveyModal(false)} title={survey.title} size="lg">
                        <div className="modal-body">
                            {piFields.length > 0 && (
                                <>
                                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: -4 }}>Personal Information</h4>
                                    <div className="form-row" style={{ flexWrap: 'wrap' }}>
                                        {piFields.map(key => (
                                            <div className="form-group" key={key} style={{ flex: '1 1 45%', minWidth: 200 }}>
                                                <label className="form-label">{PERSONAL_INFO_LABELS[key]}</label>
                                                {key === 'gender' ? (
                                                    <select className="form-select" value={surveyFormAnswers[`__pi_${key}`] || ''} onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [`__pi_${key}`]: e.target.value }))}>
                                                        <option value="">Select...</option>
                                                        <option>Male</option>
                                                        <option>Female</option>
                                                        <option>Non-binary</option>
                                                        <option>Prefer not to say</option>
                                                    </select>
                                                ) : key === 'referralSource' ? (
                                                    <select className="form-select" value={surveyFormAnswers[`__pi_${key}`] || ''} onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [`__pi_${key}`]: e.target.value }))}>
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
                                                    <input type="date" className="form-input" value={surveyFormAnswers[`__pi_${key}`] || ''} onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [`__pi_${key}`]: e.target.value }))} />
                                                ) : (
                                                    <input className="form-input" type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={surveyFormAnswers[`__pi_${key}`] || ''} onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [`__pi_${key}`]: e.target.value }))} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {elements.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: 'var(--space-md) 0' }} />}
                                </>
                            )}

                            {elements.length > 0 && (
                                <>
                                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: -4 }}>Survey Questions</h4>
                                    {elements.map(el => {
                                        if (el.type === 'section') {
                                            return (
                                                <div key={el.id} style={{ marginTop: 'var(--space-md)' }}>
                                                    <h4 style={{ color: 'var(--text-primary)', marginBottom: 4 }}>{el.label || 'Section'}</h4>
                                                    {(el.hint || el.config?.description) && (
                                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{el.hint || el.config?.description}</p>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="form-group" key={el.id}>
                                                <label className="form-label">
                                                    {el.label || 'Untitled'}
                                                    {el.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                                                </label>
                                                {el.hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{el.hint}</div>}
                                                {(el.type === 'short_text' || el.type === 'email' || el.type === 'phone') && (
                                                    <input
                                                        className="form-input"
                                                        type={el.type === 'email' ? 'email' : el.type === 'phone' ? 'tel' : 'text'}
                                                        value={surveyFormAnswers[el.id] || ''}
                                                        onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [el.id]: e.target.value }))}
                                                        placeholder={el.config?.placeholder || ''}
                                                    />
                                                )}
                                                {el.type === 'long_text' && (
                                                    <textarea
                                                        className="form-textarea"
                                                        value={surveyFormAnswers[el.id] || ''}
                                                        onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [el.id]: e.target.value }))}
                                                        placeholder={el.config?.placeholder || ''}
                                                    />
                                                )}
                                                {el.type === 'dropdown' && !el.config?.multiSelect && (
                                                    <select
                                                        className="form-select"
                                                        value={surveyFormAnswers[el.id] || ''}
                                                        onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [el.id]: e.target.value }))}
                                                    >
                                                        <option value="">Select…</option>
                                                        {(el.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                                    </select>
                                                )}
                                                {el.type === 'dropdown' && el.config?.multiSelect && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                                        {(el.options || []).map((opt, i) => {
                                                            const current = Array.isArray(surveyFormAnswers[el.id]) ? surveyFormAnswers[el.id] : [];
                                                            const isChecked = current.includes(opt);
                                                            return (
                                                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            const next = isChecked ? current.filter(v => v !== opt) : [...current, opt];
                                                                            setSurveyFormAnswers(prev => ({ ...prev, [el.id]: next }));
                                                                        }}
                                                                    />
                                                                    {opt}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {(el.type === 'multiple_choice' || el.type === 'checkboxes') && (
                                                    <div style={{ display: 'flex', flexDirection: el.config?.layout === 'row' ? 'row' : 'column', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                                                        {(el.options || []).map((opt, i) => {
                                                            const current = Array.isArray(surveyFormAnswers[el.id]) ? surveyFormAnswers[el.id] : [];
                                                            const isChecked = current.includes(opt);
                                                            return (
                                                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            const next = isChecked ? current.filter(v => v !== opt) : [...current, opt];
                                                                            setSurveyFormAnswers(prev => ({ ...prev, [el.id]: next }));
                                                                        }}
                                                                    />
                                                                    {opt}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {el.type === 'date' && (
                                                    <input
                                                        type={el.config?.includeTime ? 'datetime-local' : 'date'}
                                                        className="form-input"
                                                        value={surveyFormAnswers[el.id] || ''}
                                                        onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [el.id]: e.target.value }))}
                                                    />
                                                )}
                                                {el.type === 'rating_scale' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{el.config?.minLabel}</span>
                                                        <input
                                                            type="range"
                                                            min={el.config?.min || 1}
                                                            max={el.config?.max || 10}
                                                            step={el.config?.step || 1}
                                                            value={surveyFormAnswers[el.id] || el.config?.min || 1}
                                                            onChange={e => setSurveyFormAnswers(prev => ({ ...prev, [el.id]: Number(e.target.value) }))}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{el.config?.maxLabel}</span>
                                                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', minWidth: 24, textAlign: 'center' }}>
                                                            {surveyFormAnswers[el.id] || el.config?.min || 1}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowSurveyModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={saveSurveyAnswers} disabled={savingSurvey}>
                                {savingSurvey ? 'Saving…' : 'Save Answers'}
                            </button>
                        </div>
                    </Modal>
                );
            })()}
        </>
    );
}
