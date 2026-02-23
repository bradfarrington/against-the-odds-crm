import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { Building2, Plus, MapPin, Edit2, Trash2 } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

export default function Companies() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '', type: 'Company', industry: '', address: '', phone: '', email: '', website: '', status: 'Active', notes: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLogoFile, setEditLogoFile] = useState(null);
    const [editLogoPreview, setEditLogoPreview] = useState('');

    const filtered = state.companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.type.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase())
    );

    const contactCountFor = (companyId) => state.contacts.filter(c => c.companyId === companyId).length;

    const handleOpenEdit = (company, e) => {
        e.stopPropagation();
        setEditingCompany(company);
        setEditForm({ name: company.name, type: company.type, industry: company.industry || '', address: company.address || '', phone: company.phone || '', email: company.email || '', website: company.website || '', status: company.status, notes: company.notes || '' });
        setEditLogoFile(null);
        setEditLogoPreview(company.logoUrl || '');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        let logoUrl = editingCompany.logoUrl || '';
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
        dispatch({ type: ACTIONS.UPDATE_COMPANY, payload: { ...editingCompany, ...editForm, logoUrl } });
        setEditingCompany(null);
    };

    const handleDelete = (companyId, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this company? All associated data will be unlinked.')) {
            dispatch({ type: ACTIONS.DELETE_COMPANY, payload: companyId });
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let logoUrl = '';
        if (logoFile) {
            setUploading(true);
            const path = `${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { error } = await supabase.storage.from('company-logos').upload(path, logoFile);
            if (!error) {
                const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
                logoUrl = data.publicUrl;
            }
            setUploading(false);
        }
        dispatch({ type: ACTIONS.ADD_COMPANY, payload: { ...form, logoUrl } });
        setForm({ name: '', type: 'Company', industry: '', address: '', phone: '', email: '', website: '', status: 'Active', notes: '' });
        setLogoFile(null);
        setLogoPreview('');
        setShowModal(false);
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Companies</h1>
                    <div className="page-header-subtitle">Manage organisations, colleges, and partner companies</div>
                </div>
                <div className="page-header-actions">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search companies..." />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        Add Company
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Type</th>
                                    <th>Industry</th>
                                    <th>Contacts</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(company => (
                                    <tr key={company.id} onClick={() => navigate(`/companies/${company.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                {company.logoUrl ? (
                                                    <img
                                                        src={company.logoUrl}
                                                        alt={company.name}
                                                        style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '1px solid var(--border)', background: 'var(--bg-input)', padding: 4, flexShrink: 0 }}
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                                        background: 'var(--primary-glow)', color: 'var(--primary)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                    }}>
                                                        <Building2 size={18} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="table-cell-main">{company.name}</div>
                                                    {company.address && (
                                                        <div className="table-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <MapPin size={12} /> {company.address.split(',')[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-neutral">{company.type}</span></td>
                                        <td className="table-cell-secondary">{company.industry}</td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{contactCountFor(company.id)}</span>
                                            <span className="table-cell-secondary"> contacts</span>
                                        </td>
                                        <td><StatusBadge status={company.status} /></td>
                                        <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleOpenEdit(company, e)} title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(company.id, e)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className="empty-state">
                                                <Building2 />
                                                <h3>No companies found</h3>
                                                <p>Try adjusting your search or add a new company</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={!!editingCompany} onClose={() => setEditingCompany(null)} title="Edit Company" size="lg">
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
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingCompany(null)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Save Changes'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Company" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Company Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Enter company name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={form.type} onChange={e => updateForm('type', e.target.value)}>
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
                                <input className="form-input" value={form.industry} onChange={e => updateForm('industry', e.target.value)} placeholder="e.g. Education" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={e => updateForm('status', e.target.value)}>
                                    <option>Active</option>
                                    <option>Partner</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input className="form-input" value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Full address" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="Phone number" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="Email address" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input className="form-input" value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="form-input"
                                onChange={handleLogoChange}
                                style={{ padding: '6px 12px' }}
                            />
                            {logoPreview && (
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    style={{ marginTop: 8, height: 40, maxWidth: 160, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '4px 8px', background: 'var(--bg-input)' }}
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Additional notes..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>
                            {uploading ? 'Uploading…' : 'Add Company'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
