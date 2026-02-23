import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, FileText, Upload, Folder, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const typeMap = { PDF: 'danger', Presentation: 'info', Form: 'warning', Image: 'success', Spreadsheet: 'primary', Video: 'neutral' };
const workshopColors = { Awareness: 'var(--primary)', Prevention: 'var(--warning)', Training: 'var(--info)' };

export default function PreventionResources() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterWorkshop, setFilterWorkshop] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const resources = (state.preventionResources || []).filter(r => {
        const q = search.toLowerCase();
        const matchesSearch = r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
        const matchesWorkshop = filterWorkshop === 'All' || r.workshopType === filterWorkshop;
        return matchesSearch && matchesWorkshop;
    }).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const workshopTypes = [...new Set((state.preventionResources || []).map(r => r.workshopType))];

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.uploadedAt = data.uploadedAt || new Date().toISOString();
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_PREVENTION_RESOURCE, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_PREVENTION_RESOURCE, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this resource?')) dispatch({ type: ACTIONS.DELETE_PREVENTION_RESOURCE, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Prevention Resources</h1>
                    <div className="page-header-subtitle">{resources.length} document{resources.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ flex: 1 }} value={filterWorkshop} onChange={e => setFilterWorkshop(e.target.value)}>
                        <option>All</option>
                        {workshopTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Upload style={{ width: 16, height: 16 }} /> Upload Resource
                    </button>
                </div>
            </div>
            <div className="page-body">
                {workshopTypes.filter(t => filterWorkshop === 'All' || filterWorkshop === t).map(wt => {
                    const items = resources.filter(r => r.workshopType === wt);
                    if (items.length === 0) return null;
                    return (
                        <div key={wt} style={{ marginBottom: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <Folder style={{ width: 16, height: 16, color: workshopColors[wt] || 'var(--primary)' }} />
                                <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{wt}</h3>
                                <span className="kanban-count">{items.length}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                                {items.map(r => (
                                    <div key={r.id} className="card resource-card" onClick={() => { setEditItem(r); setShowModal(true); }} style={{ cursor: 'pointer' }}>
                                        <div className="card-body">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <FileText style={{ width: 18, height: 18, color: 'var(--primary)', flexShrink: 0 }} />
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                                </div>
                                                <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(r.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>{r.description}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <StatusBadge status={r.fileType} map={typeMap} />
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {r.size} • {new Date(r.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {resources.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>No resources found</div>}
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Resource' : 'Upload Resource'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Resource Name</label>
                                <input className="form-input" name="name" defaultValue={editItem?.name} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Workshop Category</label>
                                    <select className="form-select" name="workshopType" defaultValue={editItem?.workshopType || 'Awareness'}>
                                        <option>Awareness</option><option>Prevention</option><option>Training</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">File Type</label>
                                    <select className="form-select" name="fileType" defaultValue={editItem?.fileType || 'PDF'}>
                                        <option>PDF</option><option>Presentation</option><option>Form</option><option>Image</option><option>Spreadsheet</option><option>Video</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">File Size</label>
                                <input className="form-input" name="size" defaultValue={editItem?.size} placeholder="e.g. 2.5 MB" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem?.description} rows={3} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Upload style={{ width: 14, height: 14 }} /> File Upload
                                </label>
                                <div className="file-upload-zone">
                                    <input type="file" style={{ display: 'none' }} id="file-upload" />
                                    <label htmlFor="file-upload" className="file-upload-label">
                                        <Upload style={{ width: 24, height: 24, color: 'var(--text-muted)' }} />
                                        <span>Click to upload or drag and drop</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, DOCX, PPTX, XLSX up to 25MB</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Upload'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
