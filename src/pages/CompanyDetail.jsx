import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    Building2, ArrowLeft, Mail, Phone, Globe, MapPin, Users,
    Plus, Edit2, Trash2, Calendar, Receipt, BookOpen, Star, Upload, X
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import WorkshopModal from '../components/WorkshopModal';
import DateTimePicker from '../components/DateTimePicker';
import { supabase } from '../lib/supabaseClient';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';

// ─── Star Rating Component ──────────────────────────────────────

function StarRating({ value = 0, max = 10, onChange, label = 'ATOR Rating', readOnly = false }) {
    const [hovered, setHovered] = useState(0);
    const display = hovered || value;

    return (
        <div>
            {label && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {Array.from({ length: max }, (_, i) => {
                    const starNum = i + 1;
                    return (
                        <Star
                            key={i}
                            size={readOnly ? 16 : 20}
                            style={{
                                cursor: readOnly ? 'default' : 'pointer',
                                color: starNum <= display ? '#F59E0B' : 'var(--border)',
                                fill: starNum <= display ? '#F59E0B' : 'none',
                                transition: 'color 0.15s, fill 0.15s',
                            }}
                            onClick={() => !readOnly && onChange && onChange(starNum === value ? 0 : starNum)}
                            onMouseEnter={() => !readOnly && setHovered(starNum)}
                            onMouseLeave={() => !readOnly && setHovered(0)}
                        />
                    );
                })}
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {value}/{max}
                </span>
            </div>
        </div>
    );
}

// ─── Logo Upload ──────────────────────────────────────────────

function LogoUpload({ preview, onFileSelect, onClear }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) onFileSelect(file);
    };

    const handleClick = () => inputRef.current?.click();

    if (preview) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <img src={preview} alt="Logo preview" style={{ height: 56, maxWidth: 180, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '6px 10px', background: 'var(--bg-input)' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onClear(); if (inputRef.current) inputRef.current.value = ''; }} style={{ color: 'var(--danger)' }}>
                    <X size={14} /> Remove
                </button>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onFileSelect(f); }} />
            </div>
        );
    }

    return (
        <>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onFileSelect(f); }} />
            <div className="file-upload-zone" onClick={handleClick} onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} style={{ cursor: 'pointer', borderColor: dragOver ? 'var(--primary)' : undefined, background: dragOver ? 'var(--primary-glow)' : undefined }}>
                <label className="file-upload-label" style={{ pointerEvents: 'none' }}>
                    <Upload style={{ width: 24, height: 24, color: 'var(--text-muted)' }} />
                    <span>Click to upload or drag and drop</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, SVG up to 5MB</span>
                </label>
            </div>
        </>
    );
}

// ─── Company Detail Page ──────────────────────────────────────

export default function CompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [activeTab, setActiveTab] = useState('overview');
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', role: '', email: '', phone: '', notes: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editLogoFile, setEditLogoFile] = useState(null);
    const [editLogoPreview, setEditLogoPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showWorkshopModal, setShowWorkshopModal] = useState(false);
    const [selectedWorkshop, setSelectedWorkshop] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const meetingSort = useTableSort();
    const invoiceSort = useTableSort();
    const workshopSort = useTableSort();
    const contactSort = useTableSort();

    const companyTypes = state.companyTypes || [];
    const companyIndustries = state.companyIndustries || [];
    const companyStatuses = state.companyStatuses || [];

    const company = state.companies.find(c => c.id === id);
    const contacts = state.contacts.filter(c => c.companyId === id);
    const contactIds = contacts.map(c => c.id);
    const meetings = state.meetingNotes.filter(m => m.contactIds?.some(cid => contactIds.includes(cid)));
    const workshops = state.preventionSchedule.filter(w => w.companyId === id || contactIds.includes(w.contactId));
    const workshopIds = new Set(workshops.map(w => w.id));
    const invoices = state.invoices.filter(i => i.companyId === id || (i.workshopId && workshopIds.has(i.workshopId)));
    const allWorkshopStages = state.workshopStages || [];

    const getStageInfo = (status) => {
        const stage = allWorkshopStages.find(s => s.name === status);
        return stage ? { label: stage.label, color: stage.color } : null;
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    if (!company) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <Building2 />
                    <h3>Company not found</h3>
                    <p>This company may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/companies')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Companies
                    </button>
                </div>
            </div>
        );
    }

    const handleOpenEdit = () => {
        setEditForm({
            name: company.name, type: company.type, industry: company.industry || '',
            city: company.city || '', postcode: company.postcode || '',
            phone: company.phone || '', email: company.email || '', website: company.website || '',
            status: company.status, notes: company.notes || ''
        });
        setEditLogoFile(null);
        setEditLogoPreview(company.logoUrl || '');
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        let logoUrl = company.logoUrl || '';
        if (editLogoFile) {
            setUploading(true);
            const path = `${Date.now()}-${editLogoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { error } = await supabase.storage.from('company-logos').upload(path, editLogoFile);
            if (!error) {
                const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
                logoUrl = data.publicUrl;
            }
            setUploading(false);
        } else if (!editLogoPreview) {
            logoUrl = '';
        }
        dispatch({ type: ACTIONS.UPDATE_COMPANY, payload: { ...company, ...editForm, logoUrl } });
        setShowEditModal(false);
    };

    const handleDeleteCompany = () => {
        if (confirm('Are you sure you want to delete this company? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_COMPANY, payload: company.id });
            navigate('/companies');
        }
    };

    const handleAddContact = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_CONTACT, payload: { ...contactForm, companyId: id } });
        setContactForm({ firstName: '', lastName: '', role: '', email: '', phone: '', notes: '' });
        setShowContactModal(false);
    };

    const handleDeleteContact = (contactId) => {
        if (confirm('Are you sure you want to remove this contact?')) {
            dispatch({ type: ACTIONS.DELETE_CONTACT, payload: contactId });
        }
    };

    const handleAtorChange = (rating) => {
        dispatch({ type: ACTIONS.UPDATE_COMPANY, payload: { ...company, atorRating: rating } });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/companies')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        {company.logoUrl && (
                            <img src={company.logoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border)', padding: 4, background: 'var(--bg-input)' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <div>
                            <h1>{company.name}</h1>
                            <div className="page-header-subtitle">{company.type} · {company.industry}</div>
                        </div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <StatusBadge status={company.status} />
                    <button className="btn btn-secondary" onClick={handleOpenEdit}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDeleteCompany} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={`tab ${activeTab === 'meetings' ? 'active' : ''}`} onClick={() => setActiveTab('meetings')}>
                        Meetings
                        {meetings.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{meetings.length}</span>}
                    </button>
                    <button className={`tab ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                        Invoices
                        {invoices.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{invoices.length}</span>}
                    </button>
                    <button className={`tab ${activeTab === 'workshops' ? 'active' : ''}`} onClick={() => setActiveTab('workshops')}>
                        Workshops
                        {workshops.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{workshops.length}</span>}
                    </button>
                    <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
                        Contacts
                        {contacts.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{contacts.length}</span>}
                    </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="detail-sections">
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3>Company Information</h3>
                            </div>
                            <div className="card-body">
                                {company.logoUrl && (
                                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                                        <img src={company.logoUrl} alt={`${company.name} logo`} style={{ height: 120, maxWidth: 360, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    </div>
                                )}
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">City / Town</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {company.city || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Postcode</span>
                                        <span className="info-value">{company.postcode || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Phone</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {company.phone || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {company.email || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Website</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                                            {company.website ? <a href={company.website} target="_blank" rel="noopener">{company.website}</a> : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">ATOR Rating</span>
                                        <span className="info-value">
                                            <StarRating value={company.atorRating || 0} max={10} onChange={handleAtorChange} label="" />
                                        </span>
                                    </div>
                                    {company.notes && (
                                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Notes</span>
                                            <span className="info-value">{company.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Meetings Tab */}
                {activeTab === 'meetings' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Calendar size={18} /> Meetings
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{meetings.length}</span>
                                </h3>
                            </div>
                            {meetings.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortableHeader label="Title" sortKey="title" sortConfig={meetingSort.sortConfig} onSort={meetingSort.requestSort} />
                                                <SortableHeader label="Type" sortKey="meetingType" sortConfig={meetingSort.sortConfig} onSort={meetingSort.requestSort} />
                                                <SortableHeader label="Date" sortKey="date" sortConfig={meetingSort.sortConfig} onSort={meetingSort.requestSort} />
                                                <SortableHeader label="Location" sortKey="location" sortConfig={meetingSort.sortConfig} onSort={meetingSort.requestSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {meetingSort.sortedData(meetings, {
                                                date: m => m.date ? new Date(m.date) : null,
                                            }).map(m => (
                                                <tr key={m.id} onClick={() => navigate(`/meeting-notes/${m.id}`)} style={{ cursor: 'pointer' }}>
                                                    <td className="table-cell-main">{m.title}</td>
                                                    <td><span className="badge badge-neutral">{m.meetingType}</span></td>
                                                    <td className="table-cell-secondary">{fmtDate(m.date)}</td>
                                                    <td className="table-cell-secondary">{m.location || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Calendar />
                                        <h3>No meetings recorded</h3>
                                        <p>No meeting notes are linked to this company's contacts</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Receipt size={18} /> Invoices
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{invoices.length}</span>
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowInvoiceModal(true)}>
                                    <Plus size={16} /> New Invoice
                                </button>
                            </div>
                            {invoices.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortableHeader label="Invoice #" sortKey="invoiceNumber" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Description" sortKey="description" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Amount" sortKey="amount" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Status" sortKey="status" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Issued" sortKey="dateIssued" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Due" sortKey="dateDue" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceSort.sortedData(invoices, {
                                                dateIssued: inv => inv.dateIssued ? new Date(inv.dateIssued) : null,
                                                dateDue: inv => inv.dateDue ? new Date(inv.dateDue) : null,
                                            }).map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="table-cell-main">{inv.invoiceNumber}</td>
                                                    <td className="table-cell-secondary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description || '—'}</td>
                                                    <td className="table-cell-main">£{(inv.amount || 0).toLocaleString()}</td>
                                                    <td><StatusBadge status={inv.status} /></td>
                                                    <td className="table-cell-secondary">{fmtDate(inv.dateIssued)}</td>
                                                    <td className="table-cell-secondary">{fmtDate(inv.dateDue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Receipt />
                                        <h3>No invoices found</h3>
                                        <p>No invoices are linked to this company</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="New Invoice">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const data = Object.fromEntries(fd);
                        data.amount = parseFloat(data.amount) || 0;
                        if (!data.dateIssued) data.dateIssued = null;
                        if (!data.dateDue) data.dateDue = null;
                        if (!data.datePaid) data.datePaid = null;
                        data.category = 'Prevention';
                        data.companyId = id;
                        if (!data.contactId) data.contactId = null;
                        if (!data.workshopId) data.workshopId = null;
                        dispatch({ type: ACTIONS.ADD_INVOICE, payload: data });
                        setShowInvoiceModal(false);
                    }}>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Invoice Number</label>
                                    <input className="form-input" name="invoiceNumber" defaultValue={`ATO-2026-${String((state.invoices || []).length + 1).padStart(3, '0')}`} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue="Draft">
                                        <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Organisation</label>
                                    <select className="form-select" name="companyId" defaultValue={id} disabled>
                                        <option value={id}>{company?.name}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (£)</label>
                                    <input className="form-input" name="amount" type="number" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Link to Workshop (optional)</label>
                                <select className="form-select" name="workshopId" defaultValue="">
                                    <option value="">None</option>
                                    {(state.preventionSchedule || []).filter(w => w.companyId === id || contactIds.includes(w.contactId)).map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact</label>
                                <select className="form-select" name="contactId" defaultValue="">
                                    <option value="">None</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date Issued</label>
                                    <DateTimePicker name="dateIssued" mode="date" value="" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date Due</label>
                                    <DateTimePicker name="dateDue" mode="date" value="" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date Paid</label>
                                <DateTimePicker name="datePaid" mode="date" value="" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" name="notes" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Create Invoice</button>
                        </div>
                    </form>
                </Modal>

                {/* Workshops Tab */}
                {activeTab === 'workshops' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <BookOpen size={18} /> Workshops
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{workshops.length}</span>
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedWorkshop(null); setShowWorkshopModal(true); }}>
                                    <Plus size={14} /> Add Workshop
                                </button>
                            </div>
                            {workshops.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortableHeader label="Title" sortKey="title" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Type" sortKey="workshopType" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Date" sortKey="date" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Location" sortKey="location" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Stage" sortKey="status" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Attendees" sortKey="attendeeCount" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workshopSort.sortedData(workshops, {
                                                date: w => w.date ? new Date(w.date) : null,
                                                attendeeCount: w => w.attendeeCount ?? 0,
                                            }).map(w => {
                                                const stageInfo = getStageInfo(w.status);
                                                return (
                                                    <tr key={w.id} onClick={() => navigate(`/workshops/${w.id}`)} style={{ cursor: 'pointer' }}>
                                                        <td className="table-cell-main">{w.title}</td>
                                                        <td className="table-cell-secondary">{w.workshopType}</td>
                                                        <td className="table-cell-secondary">{fmtDate(w.date)}</td>
                                                        <td className="table-cell-secondary">{w.location || '—'}</td>
                                                        <td>
                                                            {stageInfo ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                                                                    {stageInfo.label}
                                                                </span>
                                                            ) : (
                                                                <span className="badge badge-neutral">{w.status || '—'}</span>
                                                            )}
                                                        </td>
                                                        <td className="table-cell-secondary">{w.attendeeCount ?? '—'}{w.maxCapacity ? ` / ${w.maxCapacity}` : ''}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <BookOpen />
                                        <h3>No workshops linked</h3>
                                        <p>No workshops are associated with this company</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Contacts Tab */}
                {activeTab === 'contacts' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Users size={18} /> Contacts
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{contacts.length}</span>
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowContactModal(true)}>
                                    <Plus size={14} /> Add Contact
                                </button>
                            </div>
                            {contacts.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortableHeader label="Name" sortKey="name" sortConfig={contactSort.sortConfig} onSort={contactSort.requestSort} />
                                                <SortableHeader label="Role" sortKey="role" sortConfig={contactSort.sortConfig} onSort={contactSort.requestSort} />
                                                <SortableHeader label="Email" sortKey="email" sortConfig={contactSort.sortConfig} onSort={contactSort.requestSort} />
                                                <SortableHeader label="Phone" sortKey="phone" sortConfig={contactSort.sortConfig} onSort={contactSort.requestSort} />
                                                <SortableHeader label="ATOR" sortKey="atorRating" sortConfig={contactSort.sortConfig} onSort={contactSort.requestSort} />
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contactSort.sortedData(contacts, {
                                                name: c => `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                                                atorRating: c => c.atorRating || 0,
                                            }).map(contact => (
                                                <tr key={contact.id} onClick={() => navigate(`/contacts/${contact.id}`)} style={{ cursor: 'pointer' }}>
                                                    <td className="table-cell-main">{contact.firstName} {contact.lastName}</td>
                                                    <td className="table-cell-secondary">{contact.role}</td>
                                                    <td className="table-cell-secondary">{contact.email}</td>
                                                    <td className="table-cell-secondary">{contact.phone}</td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        <StarRating
                                                            value={contact.atorRating || 0}
                                                            max={10}
                                                            label=""
                                                            onChange={(val) => dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: { ...contact, atorRating: val } })}
                                                        />
                                                    </td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteContact(contact.id)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Users />
                                        <h3>No contacts yet</h3>
                                        <p>Add contacts associated with this company</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Company Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Company" size="lg">
                <form onSubmit={handleEditSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Company Name *</label>
                                <input className="form-input" required value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select className="form-select" required value={editForm.type || ''} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                                    <option value="">Select type…</option>
                                    {companyTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Industry *</label>
                                <select className="form-select" required value={editForm.industry || ''} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))}>
                                    <option value="">Select industry…</option>
                                    {companyIndustries.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status *</label>
                                <select className="form-select" required value={editForm.status || ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                    <option value="">Select status…</option>
                                    {companyStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">City / Town *</label>
                                <input className="form-input" required value={editForm.city || ''} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Postcode *</label>
                                <input className="form-input" required value={editForm.postcode || ''} onChange={e => setEditForm(p => ({ ...p, postcode: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input className="form-input" value={editForm.website || ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Logo *</label>
                            <LogoUpload
                                preview={editLogoPreview}
                                onFileSelect={(f) => { setEditLogoFile(f); setEditLogoPreview(URL.createObjectURL(f)); }}
                                onClear={() => { setEditLogoFile(null); setEditLogoPreview(''); }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>

            {/* Add Contact Modal */}
            <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Add Contact">
                <form onSubmit={handleAddContact}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" required value={contactForm.firstName} onChange={e => setContactForm(prev => ({ ...prev, firstName: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" required value={contactForm.lastName} onChange={e => setContactForm(prev => ({ ...prev, lastName: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role *</label>
                            <input className="form-input" required value={contactForm.role} onChange={e => setContactForm(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Contact</button>
                    </div>
                </form>
            </Modal>

            {/* Add Workshop Modal */}
            <WorkshopModal
                isOpen={showWorkshopModal}
                onClose={() => { setShowWorkshopModal(false); setSelectedWorkshop(null); }}
                editItem={selectedWorkshop}
                defaultCompanyId={id}
            />
        </>
    );
}
