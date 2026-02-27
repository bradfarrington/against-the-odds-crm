import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { Building2, Plus, MapPin, Edit2, Trash2, Upload, X } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';

// ─── Drag-and-drop Logo Upload ──────────────────────────────────

function LogoUpload({ preview, onFileSelect, onClear }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) onFileSelect(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const handleClick = () => inputRef.current?.click();
    const handleInputChange = (e) => {
        const file = e.target.files[0];
        if (file) onFileSelect(file);
    };

    if (preview) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <img
                    src={preview}
                    alt="Logo preview"
                    style={{ height: 56, maxWidth: 180, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '6px 10px', background: 'var(--bg-input)' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onClear(); if (inputRef.current) inputRef.current.value = ''; }} style={{ color: 'var(--danger)' }}>
                    <X size={14} /> Remove
                </button>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
            </div>
        );
    }

    return (
        <>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
            <div
                className="file-upload-zone"
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                    cursor: 'pointer',
                    borderColor: dragOver ? 'var(--primary)' : undefined,
                    background: dragOver ? 'var(--primary-glow)' : undefined,
                }}
            >
                <label className="file-upload-label" style={{ pointerEvents: 'none' }}>
                    <Upload style={{ width: 24, height: 24, color: 'var(--text-muted)' }} />
                    <span>Click to upload or drag and drop</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, SVG up to 5MB</span>
                </label>
            </div>
        </>
    );
}

// ─── Companies Page ──────────────────────────────────────────────

export default function Companies() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-open the Add Company modal if navigated with ?addCompany=1
    useEffect(() => {
        if (searchParams.get('addCompany')) {
            setShowModal(true);
            // Clean up the URL param so it doesn't persist
            searchParams.delete('addCompany');
            setSearchParams(searchParams, { replace: true });
        }
    }, []);
    const [form, setForm] = useState({
        name: '', type: '', industry: '', city: '', postcode: '', phone: '', email: '', website: '', status: '', referral: '', notes: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLogoFile, setEditLogoFile] = useState(null);
    const [editLogoPreview, setEditLogoPreview] = useState('');

    const companyTypes = state.companyTypes || [];
    const companyIndustries = state.companyIndustries || [];
    const companyStatuses = state.companyStatuses || [];
    const referralSources = state.referralSources || [];

    const filtered = state.companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.type || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.industry || '').toLowerCase().includes(search.toLowerCase())
    );

    const contactCountFor = (companyId) => state.contacts.filter(c => c.companyId === companyId).length;
    const { sortConfig, requestSort, sortedData } = useTableSort();

    const handleLogoSelect = (file) => {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleEditLogoSelect = (file) => {
        setEditLogoFile(file);
        setEditLogoPreview(URL.createObjectURL(file));
    };

    const uploadLogo = async (file) => {
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error } = await supabase.storage.from('company-logos').upload(path, file);
        if (!error) {
            const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
            return data.publicUrl;
        }
        return '';
    };

    const handleOpenEdit = (company, e) => {
        e.stopPropagation();
        setEditingCompany(company);
        setEditForm({
            name: company.name, type: company.type, industry: company.industry || '',
            city: company.city || '', postcode: company.postcode || '',
            phone: company.phone || '', email: company.email || '', website: company.website || '',
            status: company.status, referral: company.referral || '', notes: company.notes || ''
        });
        setEditLogoFile(null);
        setEditLogoPreview(company.logoUrl || '');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        let logoUrl = editingCompany.logoUrl || '';
        if (editLogoFile) {
            setUploading(true);
            logoUrl = await uploadLogo(editLogoFile);
            setUploading(false);
        } else if (!editLogoPreview) {
            logoUrl = '';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        let logoUrl = '';
        if (logoFile) {
            setUploading(true);
            logoUrl = await uploadLogo(logoFile);
            setUploading(false);
        }
        dispatch({ type: ACTIONS.ADD_COMPANY, payload: { ...form, logoUrl } });
        setForm({ name: '', type: '', industry: '', city: '', postcode: '', phone: '', email: '', website: '', status: '', referral: '', notes: '' });
        setLogoFile(null);
        setLogoPreview('');
        setShowModal(false);
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    // Check if add form is valid
    const isAddFormValid = form.name && form.type && form.industry && form.status && form.city && form.postcode && form.email && (logoFile || logoPreview);

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
                                    <SortableHeader label="Company" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Type" sortKey="type" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Industry" sortKey="industry" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Contacts" sortKey="contacts" sortConfig={sortConfig} onSort={requestSort} />
                                    <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData(filtered, {
                                    contacts: c => contactCountFor(c.id),
                                }).map(company => (
                                    <tr key={company.id} onClick={() => navigate(`/companies/${company.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                {company.logoUrl ? (
                                                    <img
                                                        src={company.logoUrl}
                                                        alt={company.name}
                                                        style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border)', background: 'var(--bg-input)', padding: 4, flexShrink: 0 }}
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 52, height: 52, borderRadius: 'var(--radius-md)',
                                                        background: 'var(--primary-glow)', color: 'var(--primary)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                    }}>
                                                        <Building2 size={24} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="table-cell-main">{company.name}</div>
                                                    {(company.city || company.postcode) && (
                                                        <div className="table-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <MapPin size={12} /> {[company.city, company.postcode].filter(Boolean).join(', ')}
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
                                        <td colSpan={6}>
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

            {/* Edit Company Modal */}
            <Modal isOpen={!!editingCompany} onClose={() => setEditingCompany(null)} title="Edit Company" size="lg">
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
                                <label className="form-label">Referral</label>
                                <select className="form-select" value={editForm.referral || ''} onChange={e => setEditForm(p => ({ ...p, referral: e.target.value }))}>
                                    <option value="">Select referral…</option>
                                    {referralSources.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
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
                                onFileSelect={handleEditLogoSelect}
                                onClear={() => { setEditLogoFile(null); setEditLogoPreview(''); }}
                            />
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

            {/* Add Company Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Company" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Company Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Enter company name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select className="form-select" required value={form.type} onChange={e => updateForm('type', e.target.value)}>
                                    <option value="">Select type…</option>
                                    {companyTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Industry *</label>
                                <select className="form-select" required value={form.industry} onChange={e => updateForm('industry', e.target.value)}>
                                    <option value="">Select industry…</option>
                                    {companyIndustries.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status *</label>
                                <select className="form-select" required value={form.status} onChange={e => updateForm('status', e.target.value)}>
                                    <option value="">Select status…</option>
                                    {companyStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Referral</label>
                                <select className="form-select" value={form.referral} onChange={e => updateForm('referral', e.target.value)}>
                                    <option value="">Select referral…</option>
                                    {referralSources.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">City / Town *</label>
                                <input className="form-input" required value={form.city} onChange={e => updateForm('city', e.target.value)} placeholder="e.g. Birmingham" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Postcode *</label>
                                <input className="form-input" required value={form.postcode} onChange={e => updateForm('postcode', e.target.value)} placeholder="e.g. B1 1AA" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="Phone number" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="Email address" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input className="form-input" value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company Logo *</label>
                            <LogoUpload
                                preview={logoPreview}
                                onFileSelect={handleLogoSelect}
                                onClear={() => { setLogoFile(null); setLogoPreview(''); }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Additional notes..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading || !isAddFormValid}>
                            {uploading ? 'Uploading…' : 'Add Company'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
