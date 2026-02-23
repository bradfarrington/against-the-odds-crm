import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    Building2, ArrowLeft, Mail, Phone, Globe, MapPin, Users,
    Plus, Edit2, Trash2, Calendar
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function CompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', role: '', email: '', phone: '', status: 'Active', notes: '' });

    const company = state.companies.find(c => c.id === id);
    const contacts = state.contacts.filter(c => c.companyId === id);

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

    const handleAddContact = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_CONTACT, payload: { ...contactForm, companyId: id } });
        setContactForm({ firstName: '', lastName: '', role: '', email: '', phone: '', status: 'Active', notes: '' });
        setShowContactModal(false);
    };

    const handleDeleteContact = (contactId) => {
        if (confirm('Are you sure you want to remove this contact?')) {
            dispatch({ type: ACTIONS.DELETE_CONTACT, payload: contactId });
        }
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/companies')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1>{company.name}</h1>
                        <div className="page-header-subtitle">{company.type} · {company.industry}</div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <StatusBadge status={company.status} />
                </div>
            </div>

            <div className="page-body">
                <div className="detail-sections">
                    {/* Company Info */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3>Company Information</h3>
                        </div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Address</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {company.address || '—'}
                                    </span>
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
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Notes</span>
                                    <span className="info-value">{company.notes || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contacts */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <Users size={18} />
                                Contacts
                                <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{contacts.length}</span>
                            </h3>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowContactModal(true)}>
                                <Plus size={14} />
                                Add Contact
                            </button>
                        </div>
                        {contacts.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts.map(contact => (
                                            <tr key={contact.id}>
                                                <td className="table-cell-main">{contact.firstName} {contact.lastName}</td>
                                                <td className="table-cell-secondary">{contact.role}</td>
                                                <td className="table-cell-secondary">{contact.email}</td>
                                                <td className="table-cell-secondary">{contact.phone}</td>
                                                <td><StatusBadge status={contact.status} /></td>
                                                <td>
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
            </div>

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
                            <label className="form-label">Role</label>
                            <input className="form-input" value={contactForm.role} onChange={e => setContactForm(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
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
        </>
    );
}
