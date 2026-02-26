import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    ArrowLeft, Users, Mail, Phone, Building2, Globe, Calendar,
    MapPin, Receipt, BookOpen, ExternalLink, Edit2, Trash2,
    Linkedin, Twitter, Instagram, Facebook, Link, Star, Plus
} from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DateTimePicker from '../components/DateTimePicker';
import EmailTimeline from '../components/EmailTimeline';
import AppointmentList from '../components/AppointmentList';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';

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

const SOCIAL_LINKS = [
    { key: 'linkedinUrl', Icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
    { key: 'twitterUrl', Icon: Twitter, label: 'X / Twitter', color: '#1DA1F2' },
    { key: 'instagramUrl', Icon: Instagram, label: 'Instagram', color: '#E1306C' },
    { key: 'facebookUrl', Icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { key: 'websiteUrl', Icon: Globe, label: 'Website', color: 'var(--primary)' },
];

export default function ContactDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();

    const [activeTab, setActiveTab] = useState('overview');
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [socialForm, setSocialForm] = useState({
        linkedinUrl: '', twitterUrl: '', instagramUrl: '', facebookUrl: '', websiteUrl: ''
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const meetingSort = useTableSort();
    const invoiceSort = useTableSort();
    const workshopSort = useTableSort();

    const contact = state.contacts.find(c => c.id === id);
    const company = contact ? state.companies.find(c => c.id === contact.companyId) : null;
    const meetings = state.meetingNotes.filter(m => m.contactIds?.includes(id));
    const workshops = state.preventionSchedule.filter(w => w.contactId === id);
    const workshopIds = new Set(workshops.map(w => w.id));
    const invoices = contact ? state.invoices.filter(i => i.contactId === id || (i.workshopId && workshopIds.has(i.workshopId))) : [];

    if (!contact) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <Users />
                    <h3>Contact not found</h3>
                    <p>This contact may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/contacts')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Contacts
                    </button>
                </div>
            </div>
        );
    }

    const handleOpenEdit = () => {
        setEditForm({ firstName: contact.firstName, lastName: contact.lastName, role: contact.role || '', email: contact.email || '', phone: contact.phone || '', companyId: contact.companyId || '', atorRating: contact.atorRating || 0, notes: contact.notes || '' });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: { ...contact, ...editForm } });
        setShowEditModal(false);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this contact? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_CONTACT, payload: contact.id });
            navigate('/contacts');
        }
    };

    const openSocialModal = () => {
        setSocialForm({
            linkedinUrl: contact.linkedinUrl || '',
            twitterUrl: contact.twitterUrl || '',
            instagramUrl: contact.instagramUrl || '',
            facebookUrl: contact.facebookUrl || '',
            websiteUrl: contact.websiteUrl || '',
        });
        setShowSocialModal(true);
    };

    const handleSaveSocial = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: { ...contact, ...socialForm } });
        setShowSocialModal(false);
    };

    const initials = `${contact.firstName[0]}${contact.lastName[0]}`;
    const hasSocialLinks = SOCIAL_LINKS.some(s => contact[s.key]);

    const handleAtorChange = (rating) => {
        dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: { ...contact, atorRating: rating } });
    };

    const fmtDate = (d) => d
        ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/contacts')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0
                        }}>
                            {initials}
                        </div>
                        <div>
                            <h1>{contact.firstName} {contact.lastName}</h1>
                            <div className="page-header-subtitle">
                                {contact.role || 'No role'}{company ? ` · ${company.name}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={handleOpenEdit}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        Overview
                    </button>
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
                    <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
                        Appointments
                    </button>
                    <button className={`tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>
                        Emails
                    </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="detail-sections">

                        {/* Contact Info */}
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Users size={18} /> Contact Information
                                </h3>
                            </div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Full Name</span>
                                        <span className="info-value">{contact.firstName} {contact.lastName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Job Title</span>
                                        <span className="info-value">{contact.role || '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                                            {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Phone</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                                            {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">ATOR RATING</span>
                                        <span className="info-value">
                                            <StarRating value={contact.atorRating || 0} max={10} onChange={handleAtorChange} label="" />
                                        </span>
                                    </div>
                                    {contact.notes && (
                                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Notes</span>
                                            <span className="info-value">{contact.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Company */}
                        {company && (
                            <div className="card detail-section">
                                <div className="card-header">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <Building2 size={18} /> Company
                                    </h3>
                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/companies/${company.id}`)}>
                                        <ExternalLink size={14} /> View Company
                                    </button>
                                </div>
                                <div className="card-body">
                                    {company.logoUrl && (
                                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                                            <img
                                                src={company.logoUrl}
                                                alt={`${company.name} logo`}
                                                style={{ height: 48, maxWidth: 160, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '6px 10px', background: 'var(--bg-input)' }}
                                                onError={e => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Company Name</span>
                                            <span className="info-value">{company.name}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Type</span>
                                            <span className="info-value"><span className="badge badge-neutral">{company.type}</span></span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Industry</span>
                                            <span className="info-value">{company.industry || '—'}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Email</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {company.email || '—'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Phone</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {company.phone || '—'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Website</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                                                {company.website
                                                    ? <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a>
                                                    : '—'}
                                            </span>
                                        </div>
                                        {company.address && (
                                            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                                <span className="info-label">Address</span>
                                                <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {company.address}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Link size={18} /> Social Links
                                </h3>
                                <button className="btn btn-secondary btn-sm" onClick={openSocialModal}>
                                    <Edit2 size={14} /> Edit
                                </button>
                            </div>
                            <div className="card-body">
                                {hasSocialLinks ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                        {SOCIAL_LINKS.map(({ key, Icon, label, color }) =>
                                            contact[key] ? (
                                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <Icon size={16} style={{ color, flexShrink: 0 }} />
                                                    <span className="info-label" style={{ width: 90, flexShrink: 0 }}>{label}</span>
                                                    <a
                                                        href={contact[key]}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ fontSize: 13, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    >
                                                        {contact[key]}
                                                    </a>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Link />
                                        <h3>No social links added</h3>
                                        <p>Click Edit to add LinkedIn, X, and other profiles</p>
                                    </div>
                                )}
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
                                    <Calendar size={18} /> Meetings Attended
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
                                                <tr key={m.id}>
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
                                        <p>This contact hasn't been linked to any meeting notes yet</p>
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
                                                    <td className="table-cell-secondary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {inv.description || '—'}
                                                    </td>
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
                                        <p>No invoices are linked to this contact</p>
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
                        data.contactId = id;
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
                                    <select className="form-select" name="companyId" defaultValue={contact?.companyId || ''} required>
                                        <option value="">Select…</option>
                                        {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                    {(state.preventionSchedule || []).map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact</label>
                                <select className="form-select" name="contactId" defaultValue={id} disabled>
                                    <option value={id}>{contact?.firstName} {contact?.lastName}</option>
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
                                                <SortableHeader label="Status" sortKey="status" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                                <SortableHeader label="Attendees" sortKey="attendeeCount" sortConfig={workshopSort.sortConfig} onSort={workshopSort.requestSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workshopSort.sortedData(workshops, {
                                                date: w => w.date ? new Date(w.date) : null,
                                                attendeeCount: w => w.attendeeCount ?? 0,
                                            }).map(w => {
                                                const stage = (state.workshopStages || []).find(s => s.name === w.status);
                                                return (
                                                    <tr key={w.id} onClick={() => navigate(`/workshops/${w.id}`)} style={{ cursor: 'pointer' }}>
                                                        <td className="table-cell-main">{w.title}</td>
                                                        <td className="table-cell-secondary">{w.workshopType}</td>
                                                        <td className="table-cell-secondary">{fmtDate(w.date)}</td>
                                                        <td className="table-cell-secondary">{w.location || '—'}</td>
                                                        <td>
                                                            {stage ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                                                    {stage.label}
                                                                </span>
                                                            ) : (
                                                                <span className="badge badge-neutral">{w.status || '—'}</span>
                                                            )}
                                                        </td>
                                                        <td className="table-cell-secondary">
                                                            {w.attendeeCount ?? '—'}{w.maxCapacity ? ` / ${w.maxCapacity}` : ''}
                                                        </td>
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
                                        <p>This contact hasn't been assigned to a workshop yet</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="detail-sections">
                        <AppointmentList linkedId={contact.id} linkedType="contact" />
                    </div>
                )}

                {/* Emails Tab */}
                {activeTab === 'emails' && (
                    <div className="detail-sections">
                        <EmailTimeline contactId={contact.id} contactEmail={contact.email} />
                    </div>
                )}
            </div>

            {/* Edit Contact Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact" size="lg">
                <form onSubmit={handleEditSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" required value={editForm.firstName || ''} onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" required value={editForm.lastName || ''} onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company *</label>
                            <select className="form-select" required value={editForm.companyId || ''} onChange={e => setEditForm(p => ({ ...p, companyId: e.target.value }))}>
                                <option value="">Select company...</option>
                                {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role / Job Title *</label>
                            <input className="form-input" required value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ATOR Rating</label>
                            <StarRating value={editForm.atorRating || 0} max={10} onChange={val => setEditForm(p => ({ ...p, atorRating: val }))} label="" />
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

            {/* Edit Social Links Modal */}
            <Modal isOpen={showSocialModal} onClose={() => setShowSocialModal(false)} title="Edit Social Links" size="lg">
                <form onSubmit={handleSaveSocial}>
                    <div className="modal-body">
                        {SOCIAL_LINKS.map(({ key, Icon, label, color }) => (
                            <div className="form-group" key={key}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Icon size={14} style={{ color }} /> {label}
                                </label>
                                <input
                                    className="form-input"
                                    type="url"
                                    value={socialForm[key]}
                                    onChange={e => setSocialForm(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="https://"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowSocialModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Links</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
