import { useState, useEffect } from 'react';
import { useData, ACTIONS } from '../context/DataContext';
import { Trash2 } from 'lucide-react';
import Modal from './Modal';
import DateTimePicker from './DateTimePicker';

export default function RecoverySeekerModal({ isOpen, onClose, item = null, pipelineId }) {
    const { state, dispatch } = useData();

    const [form, setForm] = useState({
        firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '', address: '',
        gender: '', referralSource: '', status: '', riskLevel: 'Medium',
        gamblingType: '', gamblingFrequency: '', gamblingDuration: '', gamblingTriggers: '',
        notes: '',
    });

    // Get treatment pipelines and their stages from Supabase
    const treatmentPipelines = (state.pipelines || []).filter(p => p.trackerType === 'treatment').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const allStages = state.workshopStages || [];

    // Get the first stage of the active pipeline as default
    const activePipelineStages = allStages.filter(s => s.pipelineId === pipelineId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const defaultStatus = activePipelineStages[0]?.name || '';

    useEffect(() => {
        if (isOpen) {
            if (item) {
                setForm({ ...item, status: item.status || defaultStatus });
            } else {
                setForm({
                    firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '', address: '',
                    gender: '', referralSource: '', status: defaultStatus, riskLevel: 'Medium',
                    gamblingType: '', gamblingFrequency: '', gamblingDuration: '', gamblingTriggers: '',
                    notes: '',
                });
            }
        }
    }, [isOpen, item, defaultStatus]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (item) {
            dispatch({ type: ACTIONS.UPDATE_SEEKER, payload: { id: item.id, ...form } });
        } else {
            const data = { ...form, created_at: new Date().toISOString() };
            if (!data.status) data.status = defaultStatus;
            if (pipelineId) data.pipelineId = pipelineId;
            dispatch({ type: ACTIONS.ADD_SEEKER, payload: data });
        }
        onClose();
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this intake?')) {
            dispatch({ type: ACTIONS.DELETE_SEEKER, payload: item.id });
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Seeker' : 'New Recovery Seeker Intake'} size="lg">
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
                            <DateTimePicker mode="date" value={form.dateOfBirth} onChange={e => updateForm('dateOfBirth', e.target.value)} />
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
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Stage</label>
                            <select className="form-select" value={form.status} onChange={e => updateForm('status', e.target.value)}>
                                {treatmentPipelines.map(pipeline => {
                                    const stages = allStages.filter(s => s.pipelineId === pipeline.id).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                                    if (stages.length === 0) return null;
                                    return (
                                        <optgroup key={pipeline.id} label={pipeline.name}>
                                            {stages.map(s => <option key={s.id} value={s.name}>{s.label}</option>)}
                                        </optgroup>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Additional notes..." />
                    </div>
                </div>
                <div className="modal-footer">
                    {item ? (
                        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={handleDelete}>
                            <Trash2 size={16} /> Delete
                        </button>
                    ) : <div />}
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{item ? 'Save Changes' : 'Create Intake'}</button>
                </div>
            </form>
        </Modal>
    );
}
