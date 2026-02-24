import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    ArrowLeft, Users, Mail, Phone, Building2, Globe, Calendar,
    MapPin, Receipt, BookOpen, ExternalLink, Edit2, Trash2,
    Linkedin, Twitter, Instagram, Facebook, Link
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmailTimeline from '../components/EmailTimeline';

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
    const [socialForm, setSocialForm] = useState({
        linkedinUrl: '', twitterUrl: '', instagramUrl: '', facebookUrl: '', websiteUrl: ''
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});

    const contact = state.contacts.find(c => c.id === id);
    const company = contact ? state.companies.find(c => c.id === contact.companyId) : null;
    const meetings = state.meetingNotes.filter(m => m.contactIds?.includes(id));
    const invoices = contact ? state.invoices.filter(i => i.companyId === contact.companyId) : [];
    const workshops = state.preventionSchedule.filter(w => w.contactId === id);

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
        setEditForm({ firstName: contact.firstName, lastName: contact.lastName, role: contact.role || '', email: contact.email || '', phone: contact.phone || '', companyId: contact.companyId || '', status: contact.status || 'Active', notes: contact.notes || '' });
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
                    <StatusBadge status={contact.status} />
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
                                        <span className="info-label">Status</span>
                                        <span className="info-value"><StatusBadge status={contact.status} /></span>
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
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Date</th>
                                                <th>Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...meetings]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map(m => (
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
                                    <Receipt size={18} /> Company Invoices
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{invoices.length}</span>
                                </h3>
                                {company && (
                                    <span className="table-cell-secondary" style={{ fontSize: 12 }}>
                                        Showing invoices for {company.name}
                                    </span>
                                )}
                            </div>
                            {invoices.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Invoice #</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Issued</th>
                                                <th>Due</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...invoices]
                                                .sort((a, b) => new Date(b.dateIssued) - new Date(a.dateIssued))
                                                .map(inv => (
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
                                        <p>{company ? `No invoices exist for ${company.name}` : 'This contact has no associated company'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Date</th>
                                                <th>Location</th>
                                                <th>Status</th>
                                                <th>Attendees</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...workshops]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map(w => (
                                                    <tr key={w.id}>
                                                        <td className="table-cell-main">{w.title}</td>
                                                        <td className="table-cell-secondary">{w.workshopType}</td>
                                                        <td className="table-cell-secondary">{fmtDate(w.date)}</td>
                                                        <td className="table-cell-secondary">{w.location || '—'}</td>
                                                        <td><StatusBadge status={w.status} /></td>
                                                        <td className="table-cell-secondary">
                                                            {w.attendeeCount ?? '—'}{w.maxCapacity ? ` / ${w.maxCapacity}` : ''}
                                                        </td>
                                                    </tr>
                                                ))}
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
                            <label className="form-label">Company</label>
                            <select className="form-select" value={editForm.companyId || ''} onChange={e => setEditForm(p => ({ ...p, companyId: e.target.value }))}>
                                <option value="">Select company...</option>
                                {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role / Job Title</label>
                            <input className="form-input" value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-select" value={editForm.status || 'Active'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
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
