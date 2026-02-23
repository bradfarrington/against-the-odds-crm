import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    FileText, ArrowLeft, Building2, Calendar, User, PoundSterling,
    Edit2, Trash2, Clock, FileCheck, Upload, MessageSquare
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const statusMap = { Active: 'success', Expired: 'danger', Pending: 'warning', Renewed: 'info' };
const partnershipColors = { Prevention: '#6366f1', Recovery: '#10b981', Community: '#f59e0b', Referral: '#06b6d4' };

export default function ContractDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});

    const contract = (state.contracts || []).find(c => c.id === id);
    const company = contract ? state.companies.find(c => c.id === contract.companyId) : null;
    const contact = contract ? state.contacts.find(c => c.id === contract.contactId) : null;

    if (!contract) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <FileText />
                    <h3>Contract not found</h3>
                    <p>This contract may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/contracts')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Contracts
                    </button>
                </div>
            </div>
        );
    }

    const handleOpenEdit = () => {
        setEditForm({
            title: contract.title,
            companyId: contract.companyId || '',
            contactId: contract.contactId || '',
            type: contract.type || 'Service Agreement',
            partnershipType: contract.partnershipType || 'Prevention',
            status: contract.status || 'Pending',
            value: contract.value || 0,
            startDate: contract.startDate || '',
            endDate: contract.endDate || '',
            renewalDate: contract.renewalDate || '',
            notes: contract.notes || '',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        dispatch({
            type: ACTIONS.UPDATE_CONTRACT,
            payload: { ...contract, ...editForm, value: parseFloat(editForm.value) || 0 }
        });
        setShowEditModal(false);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this contract? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_CONTRACT, payload: contract.id });
            navigate('/contracts');
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const formatShortDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

    const daysRemaining = () => {
        if (!contract.endDate) return null;
        const end = new Date(contract.endDate);
        const now = new Date();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const remaining = daysRemaining();
    const pColor = partnershipColors[contract.partnershipType] || 'var(--text-muted)';

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/contracts')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FileText size={22} style={{ color: 'var(--primary)' }} />
                            {contract.title}
                        </h1>
                        <div className="page-header-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            {contract.type}
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span style={{
                                display: 'inline-block', padding: '1px 8px', borderRadius: 'var(--radius-full)',
                                fontSize: '0.7rem', fontWeight: 600,
                                background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}30`
                            }}>
                                {contract.partnershipType || 'General'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <StatusBadge status={contract.status} map={statusMap} />
                    <button className="btn btn-secondary" onClick={handleOpenEdit}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Quick stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Contract Value</div>
                        <div className="stat-card-value">{contract.value ? `£${contract.value.toLocaleString()}` : '£0'}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Start Date</div>
                        <div className="stat-card-value">{formatShortDate(contract.startDate)}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                        <div className="stat-card-label">End Date</div>
                        <div className="stat-card-value">{formatShortDate(contract.endDate)}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': remaining !== null && remaining < 30 ? 'var(--danger)' : 'var(--info)' }}>
                        <div className="stat-card-label">Days Remaining</div>
                        <div className="stat-card-value">{remaining !== null ? (remaining > 0 ? remaining : 'Expired') : '—'}</div>
                    </div>
                </div>

                <div className="detail-sections">
                    {/* Contract Information */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3>Contract Information</h3>
                        </div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Contract Type</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                                        {contract.type || '—'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Partnership Type</span>
                                    <span className="info-value">
                                        <span style={{
                                            display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem', fontWeight: 600,
                                            background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}30`
                                        }}>
                                            {contract.partnershipType || '—'}
                                        </span>
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Organisation</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                        {company ? (
                                            <a
                                                onClick={(e) => { e.preventDefault(); navigate(`/companies/${company.id}`); }}
                                                href="#"
                                                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}
                                            >
                                                {company.name}
                                            </a>
                                        ) : '—'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Agreed With</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                                        {contact ? (
                                            <a
                                                onClick={(e) => { e.preventDefault(); navigate(`/contacts/${contact.id}`); }}
                                                href="#"
                                                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}
                                            >
                                                {contact.firstName} {contact.lastName}
                                            </a>
                                        ) : '—'}
                                        {contact?.role && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({contact.role})</span>}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Value</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        <PoundSterling size={14} style={{ color: 'var(--text-muted)' }} />
                                        {contract.value ? contract.value.toLocaleString() : '0 (Non-financial)'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Status</span>
                                    <span className="info-value">
                                        <StatusBadge status={contract.status} map={statusMap} />
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Start Date</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        {formatDate(contract.startDate)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">End Date</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        {formatDate(contract.endDate)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Renewal Date</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                                        {formatDate(contract.renewalDate)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Created</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                                        {formatDate(contract.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <MessageSquare size={18} />
                                Notes
                            </h3>
                        </div>
                        <div className="card-body">
                            {contract.notes ? (
                                <div style={{
                                    padding: 'var(--space-lg)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-raised)',
                                    border: '1px solid var(--border)',
                                    lineHeight: 1.7,
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {contract.notes}
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: 'var(--space-xl)',
                                    color: 'var(--text-muted)', textAlign: 'center', gap: 'var(--space-xs)'
                                }}>
                                    <MessageSquare size={20} style={{ opacity: 0.4 }} />
                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No notes added yet. Click Edit to add notes to this contract.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contract Document */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <FileCheck size={18} />
                                Contract Document
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: 'var(--space-2xl) var(--space-xl)',
                                borderRadius: 'var(--radius-lg)',
                                border: '2px dashed var(--border)',
                                background: 'var(--bg-raised)',
                                textAlign: 'center',
                                gap: 'var(--space-sm)',
                            }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                                    background: 'var(--primary-glow)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 'var(--space-sm)'
                                }}>
                                    <Upload size={24} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No document attached</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 340 }}>
                                    Signable PDF documents will be available here in a future update. You'll be able to create, send for signature, and view signed contracts.
                                </p>
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-sm)', opacity: 0.5, cursor: 'not-allowed' }} disabled>
                                    <Upload size={14} /> Upload Document (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contract" size="lg">
                <form onSubmit={handleEditSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Contract Title *</label>
                            <input className="form-input" required value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Organisation</label>
                                <select className="form-select" value={editForm.companyId || ''} onChange={e => setEditForm(p => ({ ...p, companyId: e.target.value }))} required>
                                    <option value="">Select…</option>
                                    {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Agreed With (Contact)</label>
                                <select className="form-select" value={editForm.contactId || ''} onChange={e => setEditForm(p => ({ ...p, contactId: e.target.value }))}>
                                    <option value="">Select…</option>
                                    {state.contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {state.companies.find(co => co.id === c.companyId)?.name || ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Contract Type</label>
                                <select className="form-select" value={editForm.type || 'Service Agreement'} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                                    <option>Service Agreement</option>
                                    <option>Grant Agreement</option>
                                    <option>Partnership Agreement</option>
                                    <option>Referral Agreement</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Partnership Type</label>
                                <select className="form-select" value={editForm.partnershipType || 'Prevention'} onChange={e => setEditForm(p => ({ ...p, partnershipType: e.target.value }))}>
                                    <option>Prevention</option>
                                    <option>Recovery</option>
                                    <option>Community</option>
                                    <option>Referral</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={editForm.status || 'Pending'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                    <option>Pending</option>
                                    <option>Active</option>
                                    <option>Expired</option>
                                    <option>Renewed</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Value (£)</label>
                                <input className="form-input" type="number" value={editForm.value || ''} onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input className="form-input" type="date" value={editForm.startDate || ''} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input className="form-input" type="date" value={editForm.endDate || ''} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Renewal Date</label>
                            <input className="form-input" type="date" value={editForm.renewalDate || ''} onChange={e => setEditForm(p => ({ ...p, renewalDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
