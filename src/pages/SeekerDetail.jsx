import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    ArrowLeft, Mail, Phone, MapPin, User, Calendar,
    AlertTriangle, HeartHandshake, Plus, Pill, Star,
    FileText, Shield,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function SeekerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showSubstanceModal, setShowSubstanceModal] = useState(false);
    const [sessionForm, setSessionForm] = useState({ date: '', notes: '', progressRating: 5 });
    const [substanceForm, setSubstanceForm] = useState({ substance: '', frequency: '', duration: '', notes: '' });
    const [activeTab, setActiveTab] = useState('overview');

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

    const handleAddSession = (e) => {
        e.preventDefault();
        dispatch({
            type: ACTIONS.ADD_COACHING_SESSION,
            payload: {
                seekerId: id,
                session: { ...sessionForm, progressRating: parseInt(sessionForm.progressRating) }
            }
        });
        setSessionForm({ date: '', notes: '', progressRating: 5 });
        setShowSessionModal(false);
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
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FileText size={18} /> Coaching Sessions
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowSessionModal(true)}>
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
                                                            <span style={{ fontSize: 13, fontWeight: 500 }}>{session.date}</span>
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
                    </div>
                )}
            </div>

            {/* Add Session Modal */}
            <Modal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} title="Log Coaching Session">
                <form onSubmit={handleAddSession}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={sessionForm.date} onChange={e => setSessionForm(prev => ({ ...prev, date: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Progress Rating (1-10)</label>
                                <input className="form-input" type="number" min="1" max="10" value={sessionForm.progressRating} onChange={e => setSessionForm(prev => ({ ...prev, progressRating: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Session Notes *</label>
                            <textarea className="form-textarea" required rows={4} value={sessionForm.notes} onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Describe the session, progress, and any actions..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowSessionModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Log Session</button>
                    </div>
                </form>
            </Modal>

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
        </>
    );
}
