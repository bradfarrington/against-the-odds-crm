import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Plus, Search, FileText, X, Calendar, Building2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Active: 'success', Expired: 'danger', Pending: 'warning', Renewed: 'info' };
const partnershipBadge = { Prevention: '#6366f1', Recovery: '#10b981', Community: '#f59e0b', Referral: '#06b6d4' };

export default function Contracts() {
    const { state, dispatch, ACTIONS } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPartnership, setFilterPartnership] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const contracts = (state.contracts || []).filter(c => {
        const q = search.toLowerCase();
        const matchesSearch = c.title.toLowerCase().includes(q) || getCompanyName(c.companyId).toLowerCase().includes(q);
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        const matchesPartnership = filterPartnership === 'All' || c.partnershipType === filterPartnership;
        return matchesSearch && matchesStatus && matchesPartnership;
    });

    function getCompanyName(id) {
        return state.companies.find(c => c.id === id)?.name || '—';
    }

    function getContactName(id) {
        const contact = state.contacts.find(c => c.id === id);
        return contact ? `${contact.firstName} ${contact.lastName}` : '—';
    }

    function getContactsForCompany(companyId) {
        return state.contacts.filter(c => c.companyId === companyId);
    }

    const totalValue = (state.contracts || []).reduce((sum, c) => sum + (c.value || 0), 0);
    const activeValue = (state.contracts || []).filter(c => c.status === 'Active').reduce((sum, c) => sum + (c.value || 0), 0);
    const activeCount = (state.contracts || []).filter(c => c.status === 'Active').length;

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.value = parseFloat(data.value) || 0;
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_CONTRACT, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_CONTRACT, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this contract?')) dispatch({ type: ACTIONS.DELETE_CONTRACT, payload: id });
    };

    const openEdit = (contract, e) => {
        e.stopPropagation();
        setEditItem(contract);
        setShowModal(true);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Contracts</h1>
                    <div className="page-header-subtitle">Manage partnership agreements, grants, and service contracts</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search contracts…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Active</option>
                        <option>Pending</option>
                        <option>Expired</option>
                        <option>Renewed</option>
                    </select>
                    <select className="form-select" style={{ flex: 1 }} value={filterPartnership} onChange={e => setFilterPartnership(e.target.value)}>
                        <option value="All">All Types</option>
                        <option>Prevention</option>
                        <option>Recovery</option>
                        <option>Community</option>
                        <option>Referral</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Contract
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total Contracts</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{(state.contracts || []).length}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Active Contracts</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{activeCount}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--info)' }}>
                        <div className="stat-card-label">Active Value</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{activeValue.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                        <div className="stat-card-label">Total Value</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{totalValue.toLocaleString()}</div>
                    </div>
                </div>
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Contract</th>
                                    <th>Partnership</th>
                                    <th>Organisation</th>
                                    <th>Agreed With</th>
                                    <th>Value</th>
                                    <th>Start Date</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {contracts.map(c => (
                                    <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                                                    background: 'var(--primary-glow)', color: 'var(--primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <FileText style={{ width: 16, height: 16 }} />
                                                </div>
                                                <div>
                                                    <div className="table-cell-main">{c.title}</div>
                                                    <div className="table-cell-secondary">{c.type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em',
                                                background: `${partnershipBadge[c.partnershipType] || 'var(--text-muted)'}18`,
                                                color: partnershipBadge[c.partnershipType] || 'var(--text-muted)',
                                                border: `1px solid ${partnershipBadge[c.partnershipType] || 'var(--text-muted)'}30`
                                            }}>
                                                {c.partnershipType || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Building2 style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
                                                <span className="table-cell-secondary">{getCompanyName(c.companyId)}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell-secondary">{getContactName(c.contactId)}</td>
                                        <td className="table-cell-main">{c.value ? `£${c.value.toLocaleString()}` : '—'}</td>
                                        <td className="table-cell-secondary">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Calendar style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                                                {formatDate(c.startDate)}
                                            </div>
                                        </td>
                                        <td><StatusBadge status={c.status} map={statusMap} /></td>
                                        <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => openEdit(c, e)} title="Edit">
                                                <FileText style={{ width: 14, height: 14 }} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(c.id, e)}>
                                                <X style={{ width: 14, height: 14 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {contracts.length === 0 && (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                                <FileText />
                                                <h3>No contracts found</h3>
                                                <p>Try adjusting your filters or add a new contract</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Contract' : 'Add Contract'} large>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Contract Title</label>
                                <input className="form-input" name="title" defaultValue={editItem?.title} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Organisation</label>
                                    <select className="form-select" name="companyId" defaultValue={editItem?.companyId || ''} required>
                                        <option value="">Select…</option>
                                        {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Agreed With (Contact)</label>
                                    <select className="form-select" name="contactId" defaultValue={editItem?.contactId || ''}>
                                        <option value="">Select…</option>
                                        {state.contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {getCompanyName(c.companyId)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Contract Type</label>
                                    <select className="form-select" name="type" defaultValue={editItem?.type || 'Service Agreement'}>
                                        <option>Service Agreement</option>
                                        <option>Grant Agreement</option>
                                        <option>Partnership Agreement</option>
                                        <option>Referral Agreement</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Partnership Type</label>
                                    <select className="form-select" name="partnershipType" defaultValue={editItem?.partnershipType || 'Prevention'}>
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
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Pending'}>
                                        <option>Pending</option>
                                        <option>Active</option>
                                        <option>Expired</option>
                                        <option>Renewed</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Value (£)</label>
                                    <input className="form-input" name="value" type="number" defaultValue={editItem?.value} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input className="form-input" name="startDate" type="date" defaultValue={editItem?.startDate} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input className="form-input" name="endDate" type="date" defaultValue={editItem?.endDate} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Renewal Date</label>
                                <input className="form-input" name="renewalDate" type="date" defaultValue={editItem?.renewalDate} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" name="notes" defaultValue={editItem?.notes} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Contract'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
