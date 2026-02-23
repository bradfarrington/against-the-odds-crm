import { useState } from 'react';
import { useData, ACTIONS } from '../context/DataContext';
import { Users, Plus, Mail, Phone, Building2 } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function Contacts() {
    const { state, dispatch } = useData();
    const [search, setSearch] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        firstName: '', lastName: '', role: '', email: '', phone: '', companyId: '', status: 'Active', notes: ''
    });

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

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_CONTACT, payload: form });
        setForm({ firstName: '', lastName: '', role: '', email: '', phone: '', companyId: '', status: 'Active', notes: '' });
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
                    <select className="form-select" style={{ width: 200, padding: '8px 12px', fontSize: 13 }} value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
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
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(contact => (
                                    <tr key={contact.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 'var(--radius-full)',
                                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0
                                                }}>
                                                    {contact.firstName[0]}{contact.lastName[0]}
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
                                        <td><StatusBadge status={contact.status} /></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
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
                            <label className="form-label">Company</label>
                            <select className="form-select" value={form.companyId} onChange={e => updateForm('companyId', e.target.value)}>
                                <option value="">Select company...</option>
                                {state.companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input className="form-input" value={form.role} onChange={e => updateForm('role', e.target.value)} placeholder="e.g. Wellbeing Lead" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                            </div>
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
