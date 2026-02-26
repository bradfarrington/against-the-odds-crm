import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { Users, Plus, Mail, Phone, Building2, Edit2, Trash2, Star } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';

// ─── Star Rating Component ──────────────────────────────────────

function StarRating({ value = 0, max = 5, onChange, readOnly = false, size: starSize = 16 }) {
    const [hovered, setHovered] = useState(0);
    const display = hovered || value;

    return (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {Array.from({ length: max }, (_, i) => {
                const n = i + 1;
                return (
                    <Star
                        key={i}
                        size={starSize}
                        style={{
                            cursor: readOnly ? 'default' : 'pointer',
                            color: n <= display ? '#F59E0B' : 'var(--border)',
                            fill: n <= display ? '#F59E0B' : 'none',
                            transition: 'color 0.15s, fill 0.15s',
                        }}
                        onClick={() => !readOnly && onChange && onChange(n === value ? 0 : n)}
                        onMouseEnter={() => !readOnly && setHovered(n)}
                        onMouseLeave={() => !readOnly && setHovered(0)}
                    />
                );
            })}
            {value > 0 && <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{value}/{max}</span>}
        </div>
    );
}

// ─── Contacts Page ──────────────────────────────────────────────

export default function Contacts() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        firstName: '', lastName: '', role: '', email: '', phone: '', companyId: '', atorRating: 0, notes: ''
    });
    const [editingContact, setEditingContact] = useState(null);
    const [editForm, setEditForm] = useState({});

    const getCompanyName = (companyId) => {
        const company = state.companies.find(c => c.id === companyId);
        return company ? company.name : '—';
    };

    const filtered = state.contacts.filter(c => {
        const matchesSearch = (
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.role.toLowerCase().includes(search.toLowerCase())
        );
        const matchesCompany = !filterCompany || c.companyId === filterCompany;
        return matchesSearch && matchesCompany;
    });

    const handleOpenEdit = (contact, e) => {
        e.stopPropagation();
        setEditingContact(contact);
        setEditForm({
            firstName: contact.firstName, lastName: contact.lastName,
            role: contact.role || '', email: contact.email || '', phone: contact.phone || '',
            companyId: contact.companyId || '', atorRating: contact.atorRating || 0, notes: contact.notes || ''
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: { ...editingContact, ...editForm } });
        setEditingContact(null);
    };

    const handleDelete = (contactId, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this contact?')) {
            dispatch({ type: ACTIONS.DELETE_CONTACT, payload: contactId });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_CONTACT, payload: form });
        setForm({ firstName: '', lastName: '', role: '', email: '', phone: '', companyId: '', atorRating: 0, notes: '' });
        setShowModal(false);
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Contacts</h1>
                    <div className="page-header-subtitle">Manage contacts across all companies and organisations</div>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ flex: 1 }} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
                        <option value="">All Companies</option>
                        {state.companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search contacts..." />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        Add Contact
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Company</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>ATOR</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(contact => (
                                    <tr key={contact.id} onClick={() => navigate(`/contacts/${contact.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 'var(--radius-full)',
                                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0
                                                }}>
                                                    {contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}
                                                </div>
                                                <div className="table-cell-main">{contact.firstName} {contact.lastName}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                                <span className="table-cell-secondary">{getCompanyName(contact.companyId)}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell-secondary">{contact.role}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span className="table-cell-secondary">{contact.email}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell-secondary">{contact.phone}</td>
                                        <td>
                                            <StarRating value={contact.atorRating || 0} max={10} readOnly size={14} />
                                        </td>
                                        <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleOpenEdit(contact, e)} title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(contact.id, e)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="empty-state">
                                                <Users />
                                                <h3>No contacts found</h3>
                                                <p>Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Contact Modal */}
            <Modal isOpen={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
                <form onSubmit={handleEditSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" required value={editForm.firstName || ''} onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" required value={editForm.lastName || ''} onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company *</label>
                            <select className="form-select" required value={editForm.companyId || ''} onChange={e => setEditForm(prev => ({ ...prev, companyId: e.target.value }))}>
                                <option value="">Select company...</option>
                                {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role *</label>
                            <input className="form-input" required value={editForm.role || ''} onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={editForm.email || ''} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ATOR Rating</label>
                            <StarRating
                                value={editForm.atorRating || 0}
                                max={10}
                                onChange={val => setEditForm(prev => ({ ...prev, atorRating: val }))}
                                size={22}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingContact(null)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </Modal>

            {/* Add Contact Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Contact">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" required value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" required value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company *</label>
                            <select className="form-select" required value={form.companyId} onChange={e => updateForm('companyId', e.target.value)}>
                                <option value="">Select company...</option>
                                {state.companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role *</label>
                            <input className="form-input" required value={form.role} onChange={e => updateForm('role', e.target.value)} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ATOR Rating</label>
                            <StarRating
                                value={form.atorRating || 0}
                                max={10}
                                onChange={val => updateForm('atorRating', val)}
                                size={22}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Contact</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
