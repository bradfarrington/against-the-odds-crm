import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Receipt, X, Settings2, FileDown, Send, Eye, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DateTimePicker from '../components/DateTimePicker';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';
import { generateInvoicePdf } from '../lib/invoicePdf';

const statusMap = { Draft: 'neutral', Sent: 'info', Paid: 'success', Overdue: 'danger' };

export default function Invoices({ category }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [sending, setSending] = useState(null); // invoice id being sent
    const { sortConfig, requestSort, sortedData } = useTableSort();

    const allInvoices = (state.invoices || []).filter(inv => !category || inv.category === category);

    const invoices = allInvoices
        .filter(inv => {
            const q = search.toLowerCase();
            const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.description || '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';
    const getCompany = (id) => state.companies.find(c => c.id === id);
    const getContact = (id) => (state.contacts || []).find(c => c.id === id);

    const totalInvoiced = allInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = allInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
    const totalOutstanding = allInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);
    const totalDraft = allInvoices.filter(i => i.status === 'Draft').reduce((s, i) => s + (i.amount || 0), 0);

    const pageTitle = category ? `${category} Invoices` : 'Invoice Overview';

    // ─── Line Items helpers ───
    const addLineItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
    const removeLineItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));
    const updateLineItem = (idx, field, value) => {
        setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    };
    const lineItemsTotal = lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0), 0);

    const openCreate = () => {
        setEditItem(null);
        setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
        setShowModal(true);
    };

    const openEdit = (inv) => {
        setEditItem(inv);
        setLineItems(inv.lineItems?.length ? inv.lineItems.map(li => ({
            description: li.description || '',
            quantity: li.quantity || 1,
            unitPrice: li.unitPrice || 0,
        })) : [{ description: inv.description || '', quantity: 1, unitPrice: inv.amount || 0 }]);
        setShowModal(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.amount = lineItemsTotal;
        if (!data.dateIssued) data.dateIssued = null;
        if (!data.dateDue) data.dateDue = null;
        if (!data.datePaid) data.datePaid = null;
        if (category) data.category = category;
        if (!data.seekerId) data.seekerId = null;
        if (!data.workshopId) data.workshopId = null;
        if (!data.contactId) data.contactId = null;
        data.lineItems = lineItems.filter(li => li.description.trim());
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_INVOICE, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_INVOICE, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e?.stopPropagation();
        if (confirm('Delete this invoice?')) dispatch({ type: ACTIONS.DELETE_INVOICE, payload: id });
    };

    // ─── PDF Actions ───
    const getInvoicePdfData = (inv) => {
        const company = getCompany(inv.companyId);
        const contact = getContact(inv.contactId);
        const items = inv.lineItems?.length ? inv.lineItems : [];
        return generateInvoicePdf({
            template: state.invoiceTemplate || {},
            invoice: inv,
            lineItems: items,
            company,
            contact,
        });
    };

    const handleViewPdf = (inv, e) => {
        e?.stopPropagation();
        const { blob } = getInvoicePdfData(inv);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const handleDownloadPdf = (inv, e) => {
        e?.stopPropagation();
        const { blob, filename } = getInvoicePdfData(inv);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSendInvoice = async (inv, e) => {
        e?.stopPropagation();
        if (!user) { alert('Not logged in.'); return; }

        // Check Outlook connection
        const { data: connection } = await supabase
            .from('user_oauth_connections')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!connection) {
            alert('Please connect your Outlook account in Settings before sending invoices.');
            navigate('/settings');
            return;
        }

        const contact = getContact(inv.contactId);
        const company = getCompany(inv.companyId);
        const recipientEmail = contact?.email || company?.email;
        if (!recipientEmail) {
            alert('No email address found for this invoice\'s contact or organisation. Please add one first.');
            return;
        }

        if (!confirm(`Send invoice ${inv.invoiceNumber} to ${recipientEmail}?`)) return;

        setSending(inv.id);
        try {
            const { base64, filename } = getInvoicePdfData(inv);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const payload = {
                userId: user.id,
                action: 'sendMail',
                linkedId: inv.companyId,
                linkedType: 'company',
                toRecipients: [recipientEmail],
                subject: `Invoice ${inv.invoiceNumber} from ${state.invoiceTemplate?.companyName || 'Against the Odds'}`,
                bodyHtml: `<p>Please find attached invoice <strong>${inv.invoiceNumber}</strong>.</p><p>Amount: <strong>£${(inv.amount || 0).toFixed(2)}</strong></p><p>Due: <strong>${inv.dateDue ? new Date(inv.dateDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'On receipt'}</strong></p><p>Thank you.</p>`,
                attachments: [{ name: filename, contentType: 'application/pdf', contentBytes: base64 }],
            };

            const res = await fetch(`${supabaseUrl}/functions/v1/outlook-api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText);
            }

            // Update status to Sent
            dispatch({ type: ACTIONS.UPDATE_INVOICE, payload: { id: inv.id, status: 'Sent', dateIssued: inv.dateIssued || new Date().toISOString() } });
            alert(`Invoice ${inv.invoiceNumber} sent to ${recipientEmail}!`);
        } catch (err) {
            console.error('Send invoice failed:', err);
            alert('Failed to send invoice: ' + err.message);
        } finally {
            setSending(null);
        }
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
                    <select className="form-select" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Draft</option>
                        <option>Sent</option>
                        <option>Paid</option>
                        <option>Overdue</option>
                    </select>
                    <button className="btn btn-secondary" onClick={() => navigate('/invoice-settings')} title="Invoice Template Settings">
                        <Settings2 size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus /> New Invoice
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total Invoiced</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{totalInvoiced.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Paid</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{totalPaid.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                        <div className="stat-card-label">Outstanding</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{totalOutstanding.toLocaleString()}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--text-muted)' }}>
                        <div className="stat-card-label">Draft</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>£{totalDraft.toLocaleString()}</div>
                    </div>
                </div>
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <SortableHeader label="Invoice" sortKey="invoiceNumber" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Organisation" sortKey="organisation" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Description" sortKey="description" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Amount" sortKey="amount" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Issued" sortKey="dateIssued" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Due" sortKey="dateDue" sortConfig={sortConfig} onSort={requestSort} />
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData(invoices, {
                                    organisation: inv => getCompanyName(inv.companyId),
                                    dateIssued: inv => inv.dateIssued ? new Date(inv.dateIssued) : null,
                                    dateDue: inv => inv.dateDue ? new Date(inv.dateDue) : null,
                                }).map(inv => (
                                    <tr key={inv.id} onClick={() => openEdit(inv)}>
                                        <td>
                                            <div className="table-cell-main"><Receipt style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--primary)' }} />{inv.invoiceNumber}</div>
                                        </td>
                                        <td className="table-cell-secondary">{getCompanyName(inv.companyId)}</td>
                                        <td className="table-cell-secondary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {inv.lineItems?.length ? `${inv.lineItems.length} item${inv.lineItems.length > 1 ? 's' : ''}` : inv.description}
                                        </td>
                                        <td><StatusBadge status={inv.status} map={statusMap} /></td>
                                        <td className="table-cell-main">£{(inv.amount || 0).toLocaleString()}</td>
                                        <td className="table-cell-secondary">{inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td className="table-cell-secondary">{inv.dateDue ? new Date(inv.dateDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={(e) => handleViewPdf(inv, e)} title="View PDF">
                                                    <Eye style={{ width: 14, height: 14 }} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={(e) => handleDownloadPdf(inv, e)} title="Download PDF">
                                                    <FileDown style={{ width: 14, height: 14 }} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => handleSendInvoice(inv, e)}
                                                    title="Send via Outlook"
                                                    disabled={sending === inv.id}
                                                    style={{ color: sending === inv.id ? 'var(--text-muted)' : 'var(--primary)' }}
                                                >
                                                    <Send style={{ width: 14, height: 14 }} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(inv.id, e)} title="Delete">
                                                    <X style={{ width: 14, height: 14 }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No invoices found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <Modal isOpen={true} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Invoice' : 'New Invoice'} large>
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
                                    <label className="form-label">Contact</label>
                                    <select className="form-select" name="contactId" defaultValue={editItem?.contactId || ''}>
                                        <option value="">None</option>
                                        {(state.contacts || []).map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input className="form-input" name="description" defaultValue={editItem?.description} placeholder="Brief summary (e.g. Workshop delivery — Feb 2026)" />
                            </div>

                            {category === 'Recovery' && (
                                <div className="form-group">
                                    <label className="form-label">Recovery Seeker</label>
                                    <select className="form-select" name="seekerId" defaultValue={editItem?.seekerId || ''}>
                                        <option value="">None</option>
                                        {(state.recoverySeekers || []).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                            )}
                            {category === 'Prevention' && (
                                <div className="form-group">
                                    <label className="form-label">Link to Workshop (optional)</label>
                                    <select className="form-select" name="workshopId" defaultValue={editItem?.workshopId || ''}>
                                        <option value="">None</option>
                                        {(state.preventionSchedule || []).map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Line Items */}
                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                    <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Line Items</label>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {/* Header row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 'var(--space-sm)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '0 0 4px 0' }}>
                                        <span>Description</span>
                                        <span style={{ textAlign: 'center' }}>Qty</span>
                                        <span style={{ textAlign: 'right' }}>Unit Price</span>
                                        <span style={{ textAlign: 'right' }}>Total</span>
                                        <span></span>
                                    </div>
                                    {lineItems.map((li, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                            <input
                                                className="form-input"
                                                value={li.description}
                                                onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                                placeholder="Item description…"
                                                style={{ fontSize: 13 }}
                                            />
                                            <input
                                                className="form-input"
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={li.quantity}
                                                onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                                style={{ textAlign: 'center', fontSize: 13 }}
                                            />
                                            <input
                                                className="form-input"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={li.unitPrice}
                                                onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                                                style={{ textAlign: 'right', fontSize: 13 }}
                                            />
                                            <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                                £{((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)).toFixed(2)}
                                            </div>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLineItem(idx)} style={{ padding: 4 }}>
                                                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                                            </button>
                                        </div>
                                    ))}
                                    {lineItems.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-md)', fontSize: 13 }}>
                                            No line items yet. Click "Add Item" to start.
                                        </div>
                                    )}
                                </div>
                                {/* Total */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total:</span>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>£{lineItemsTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-row" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Date Issued</label>
                                    <DateTimePicker name="dateIssued" mode="date" value={editItem?.dateIssued || ''} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date Due</label>
                                    <DateTimePicker name="dateDue" mode="date" value={editItem?.dateDue || ''} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date Paid</label>
                                <DateTimePicker name="datePaid" mode="date" value={editItem?.datePaid || ''} />
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
