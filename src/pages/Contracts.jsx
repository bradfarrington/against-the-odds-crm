import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, FileText, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Active: 'success', Expired: 'danger', Pending: 'warning', Renewed: 'info' };

export default function Contracts() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const contracts = (state.contracts || []).filter(c => {
        const q = search.toLowerCase();
        const matchesSearch = c.title.toLowerCase().includes(q);
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';
    const totalValue = (state.contracts || []).reduce((sum, c) => sum + (c.value || 0), 0);
    const activeValue = (state.contracts || []).filter(c => c.status === 'Active').reduce((sum, c) => sum + (c.value || 0), 0);

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

    const handleDelete = (id) => {
        if (confirm('Delete this contract?')) dispatch({ type: ACTIONS.DELETE_CONTRACT, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Contracts</h1>
                    <div className="page-header-subtitle">{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search contracts…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Active</option>
                        <option>Pending</option>
                        <option>Expired</option>
                        <option>Renewed</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Contract
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total Contracts</div>
                        <div className="stat-card-value">{(state.contracts || []).length}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Active Value</div>
                        <div className="stat-card-value">£{activeValue.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--info)' }}>
                        <div className="stat-card-label">Total Value</div>
                        <div className="stat-card-value">£{totalValue.toLocaleString()}</div>
                    </div>
                </div>
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Contract</th>
                                    <th>Type</th>
                                    <th>Organisation</th>
                                    <th>Status</th>
                                    <th>Value</th>
                                    <th>Duration</th>
                                    <th>Renewal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {contracts.map(c => (
                                    <tr key={c.id} onClick={() => { setEditItem(c); setShowModal(true); }}>
                                        <td>
                                            <div className="table-cell-main"><FileText style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--primary)' }} />{c.title}</div>
                                        </td>
                                        <td className="table-cell-secondary">{c.type}</td>
                                        <td className="table-cell-secondary">{getCompanyName(c.companyId)}</td>
                                        <td><StatusBadge status={c.status} map={statusMap} /></td>
                                        <td className="table-cell-main">{c.value ? `£${c.value.toLocaleString()}` : '—'}</td>
                                        <td className="table-cell-secondary">
                                            {c.startDate && c.endDate ? `${new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })} — ${new Date(c.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}` : '—'}
                                        </td>
                                        <td className="table-cell-secondary">{c.renewalDate ? new Date(c.renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><X style={{ width: 14, height: 14 }} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {contracts.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No contracts found</td></tr>}
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
                                    <label className="form-label">Type</label>
                                    <select className="form-select" name="type" defaultValue={editItem?.type || 'Service Agreement'}>
                                        <option>Service Agreement</option><option>Grant Agreement</option><option>Partnership Agreement</option><option>Referral Agreement</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Pending'}>
                                        <option>Pending</option><option>Active</option><option>Expired</option><option>Renewed</option>
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
