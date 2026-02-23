import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    Building2, ArrowLeft, Mail, Phone, Globe, MapPin, Users,
    Plus, Edit2, Trash2, Calendar
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

export default function CompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', role: '', email: '', phone: '', status: 'Active', notes: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editLogoFile, setEditLogoFile] = useState(null);
    const [editLogoPreview, setEditLogoPreview] = useState('');
    const [uploading, setUploading] = useState(false);

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

    const handleOpenEdit = () => {
        setEditForm({ name: company.name, type: company.type, industry: company.industry || '', address: company.address || '', phone: company.phone || '', email: company.email || '', website: company.website || '', status: company.status, notes: company.notes || '' });
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
                    <button className="btn btn-secondary" onClick={handleOpenEdit}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDeleteCompany} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
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
                            {company.logoUrl && (
                                <div style={{ marginBottom: 'var(--space-lg)' }}>
                                    <img
                                        src={company.logoUrl}
                                        alt={`${company.name} logo`}
                                        style={{ height: 56, maxWidth: 200, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '6px 10px', background: 'var(--bg-input)' }}
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                </div>
                            )}
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

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Company" size="lg">
                <form onSubmit={handleEditSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Company Name *</label>
                                <input className="form-input" required value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={editForm.type || 'Company'} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                                    <option>Company</option>
                                    <option>University</option>
                                    <option>College</option>
                                    <option>Charity</option>
                                    <option>Local Authority</option>
                                    <option>NHS Trust</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Industry</label>
                                <input className="form-input" value={editForm.industry || ''} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={editForm.status || 'Active'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                    <option>Active</option>
                                    <option>Partner</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input className="form-input" value={editForm.address || ''} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input className="form-input" value={editForm.website || ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Logo</label>
                            {editLogoPreview && (
                                <img src={editLogoPreview} alt="Current logo" style={{ display: 'block', marginBottom: 8, height: 40, maxWidth: 160, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '4px 8px', background: 'var(--bg-input)' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                            )}
                            <input type="file" accept="image/*" className="form-input" onChange={e => { const f = e.target.files[0]; if (f) { setEditLogoFile(f); setEditLogoPreview(URL.createObjectURL(f)); } }} style={{ padding: '6px 12px' }} />
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
