import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Receipt, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Draft: 'neutral', Sent: 'info', Paid: 'success', Overdue: 'danger' };

export default function Invoices({ category }) {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const allInvoices = (state.invoices || []).filter(inv => !category || inv.category === category);

    const invoices = allInvoices
        .filter(inv => {
            const q = search.toLowerCase();
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(q) || inv.description.toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';

    const totalInvoiced = allInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = allInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
    const totalOutstanding = allInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);
    const totalDraft = allInvoices.filter(i => i.status === 'Draft').reduce((s, i) => s + (i.amount || 0), 0);

    const pageTitle = category ? `${category} Invoices` : 'Invoice Overview';

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.amount = parseFloat(data.amount) || 0;
        if (!data.dateIssued) data.dateIssued = null;
        if (!data.dateDue) data.dateDue = null;
        if (!data.datePaid) data.datePaid = null;
        if (category) data.category = category;
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_INVOICE, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_INVOICE, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id) => {
        if (confirm('Delete this invoice?')) dispatch({ type: ACTIONS.DELETE_INVOICE, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>{pageTitle}</h1>
                    <div className="page-header-subtitle">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Draft</option>
                        <option>Sent</option>
                        <option>Paid</option>
                        <option>Overdue</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> New Invoice
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total Invoiced</div>
                        <div className="stat-card-value">£{totalInvoiced.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Paid</div>
                        <div className="stat-card-value">£{totalPaid.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                        <div className="stat-card-label">Outstanding</div>
                        <div className="stat-card-value">£{totalOutstanding.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--text-muted)' }}>
                        <div className="stat-card-label">Draft</div>
                        <div className="stat-card-value">£{totalDraft.toLocaleString()}</div>
                    </div>
                </div>
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Organisation</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                    <th>Issued</th>
                                    <th>Due</th>
                                    <th>Paid</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id} onClick={() => { setEditItem(inv); setShowModal(true); }}>
                                        <td>
                                            <div className="table-cell-main"><Receipt style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--primary)' }} />{inv.invoiceNumber}</div>
                                        </td>
                                        <td className="table-cell-secondary">{getCompanyName(inv.companyId)}</td>
                                        <td className="table-cell-secondary" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description}</td>
                                        <td><StatusBadge status={inv.status} map={statusMap} /></td>
                                        <td className="table-cell-main">£{(inv.amount || 0).toLocaleString()}</td>
                                        <td className="table-cell-secondary">{inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td className="table-cell-secondary">{inv.dateDue ? new Date(inv.dateDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td className="table-cell-secondary">{inv.datePaid ? new Date(inv.datePaid).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(inv.id)}><X style={{ width: 14, height: 14 }} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No invoices found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Invoice' : 'New Invoice'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Invoice Number</label>
                                    <input className="form-input" name="invoiceNumber" defaultValue={editItem?.invoiceNumber || `ATO-2026-${String((state.invoices || []).length + 1).padStart(3, '0')}`} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Draft'}>
                                        <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                                    </select>
                                </div>
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
                                    <label className="form-label">Amount (£)</label>
                                    <input className="form-input" name="amount" type="number" defaultValue={editItem?.amount} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem?.description} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date Issued</label>
                                    <input className="form-input" name="dateIssued" type="date" defaultValue={editItem?.dateIssued} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date Due</label>
                                    <input className="form-input" name="dateDue" type="date" defaultValue={editItem?.dateDue} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date Paid</label>
                                <input className="form-input" name="datePaid" type="date" defaultValue={editItem?.datePaid} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" name="notes" defaultValue={editItem?.notes} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Create Invoice'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
