import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    HeartHandshake, Plus, AlertTriangle, User,
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function RecoverySeekers() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '', address: '',
        gender: '', referralSource: '', status: 'Active', riskLevel: 'Medium',
        gamblingType: '', gamblingFrequency: '', gamblingDuration: '', gamblingTriggers: '',
        notes: '',
    });

    const filtered = state.recoverySeekers.filter(s => {
        const matchesSearch = (
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.referralSource?.toLowerCase().includes(search.toLowerCase())
        );
        const matchesStatus = !filterStatus || s.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_SEEKER, payload: form });
        setForm({
            firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '', address: '',
            gender: '', referralSource: '', status: 'Active', riskLevel: 'Medium',
            gamblingType: '', gamblingFrequency: '', gamblingDuration: '', gamblingTriggers: '',
            notes: '',
        });
        setShowModal(false);
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const getRiskColor = (level) => {
        if (level === 'High') return 'var(--danger)';
        if (level === 'Medium') return 'var(--warning)';
        return 'var(--success)';
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Recovery Seekers</h1>
                    <div className="page-header-subtitle">Individual recovery seeker profiles and coaching management</div>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 140, padding: '8px 12px', fontSize: 13 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        <option>Active</option>
                        <option>On Hold</option>
                        <option>Completed</option>
                    </select>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search seekers..." />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        New Intake
                    </button>
                </div>
            </div>
            <div className="page-body">
                {/* Summary Cards */}
                <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-value">{state.recoverySeekers.filter(s => s.status === 'Active').length}</div>
                        <div className="stat-card-label">Active Seekers</div>
                        <div className="progress-bar" style={{ marginTop: 4 }}>
                            <div className="progress-bar-fill" style={{
                                width: `${(state.recoverySeekers.filter(s => s.status === 'Active').length / Math.max(state.recoverySeekers.length, 1)) * 100}%`,
                                background: 'var(--primary)'
                            }} />
                        </div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--danger)' }}>
                        <div className="stat-card-value">{state.recoverySeekers.filter(s => s.riskLevel === 'High').length}</div>
                        <div className="stat-card-label">High Risk</div>
                        <div className="progress-bar" style={{ marginTop: 4 }}>
                            <div className="progress-bar-fill" style={{
                                width: `${(state.recoverySeekers.filter(s => s.riskLevel === 'High').length / Math.max(state.recoverySeekers.length, 1)) * 100}%`,
                                background: 'var(--danger)'
                            }} />
                        </div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-value">{state.recoverySeekers.filter(s => s.status === 'Completed').length}</div>
                        <div className="stat-card-label">Completed Programme</div>
                        <div className="progress-bar" style={{ marginTop: 4 }}>
                            <div className="progress-bar-fill" style={{
                                width: `${(state.recoverySeekers.filter(s => s.status === 'Completed').length / Math.max(state.recoverySeekers.length, 1)) * 100}%`,
                                background: 'var(--success)'
                            }} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Referral Source</th>
                                    <th>Gambling Type</th>
                                    <th>Risk Level</th>
                                    <th>Sessions</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(seeker => (
                                    <tr key={seeker.id} onClick={() => navigate(`/recovery-seekers/${seeker.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 'var(--radius-full)',
                                                    background: `${getRiskColor(seeker.riskLevel)}18`,
                                                    color: getRiskColor(seeker.riskLevel),
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="table-cell-main">{seeker.firstName} {seeker.lastName}</div>
                                                    <div className="table-cell-secondary">{seeker.gender} · {seeker.dateOfBirth}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell-secondary">{seeker.referralSource}</td>
                                        <td className="table-cell-secondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {seeker.gamblingType}
                                        </td>
                                        <td><StatusBadge status={seeker.riskLevel} /></td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{seeker.coachingSessions?.length || 0}</span>
                                        </td>
                                        <td><StatusBadge status={seeker.status} /></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="empty-state">
                                                <HeartHandshake />
                                                <h3>No recovery seekers found</h3>
                                                <p>Try adjusting your search or add a new intake</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Recovery Seeker Intake" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: -4 }}>Personal Details</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" required value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" required value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => updateForm('dateOfBirth', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-select" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                                    <option value="">Select...</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Non-binary</option>
                                    <option>Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input className="form-input" value={form.address} onChange={e => updateForm('address', e.target.value)} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Referral Source</label>
                                <select className="form-select" value={form.referralSource} onChange={e => updateForm('referralSource', e.target.value)}>
                                    <option value="">Select...</option>
                                    <option>Self-referral</option>
                                    <option>GP Referral</option>
                                    <option>GamCare</option>
                                    <option>Betknowmore UK</option>
                                    <option>Bolton Council</option>
                                    <option>Family/Friend</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Risk Level</label>
                                <select className="form-select" value={form.riskLevel} onChange={e => updateForm('riskLevel', e.target.value)}>
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', marginBottom: -4 }}>Gambling Profile</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Gambling Type</label>
                                <input className="form-input" value={form.gamblingType} onChange={e => updateForm('gamblingType', e.target.value)} placeholder="e.g. Online slots, Sports betting" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <select className="form-select" value={form.gamblingFrequency} onChange={e => updateForm('gamblingFrequency', e.target.value)}>
                                    <option value="">Select...</option>
                                    <option>Daily</option>
                                    <option>3-4 times per week</option>
                                    <option>Weekly</option>
                                    <option>Monthly</option>
                                    <option>Occasional</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Duration</label>
                                <input className="form-input" value={form.gamblingDuration} onChange={e => updateForm('gamblingDuration', e.target.value)} placeholder="e.g. 3 years" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Triggers</label>
                                <input className="form-input" value={form.gamblingTriggers} onChange={e => updateForm('gamblingTriggers', e.target.value)} placeholder="e.g. Stress, Boredom" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Additional notes..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create Intake</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
