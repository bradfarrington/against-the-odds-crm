import { useState, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { Search, FileText, Upload, Folder, X, Check, Plus, Edit2, Trash2, Tags, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const typeMap = { PDF: 'danger', Presentation: 'info', Form: 'warning', Image: 'success', Spreadsheet: 'primary', Video: 'neutral', Audio: 'info', Document: 'warning', Archive: 'neutral', Other: 'neutral' };

function detectFileType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const map = {
        pdf: 'PDF', doc: 'Document', docx: 'Document', odt: 'Document', rtf: 'Document', txt: 'Document',
        ppt: 'Presentation', pptx: 'Presentation', odp: 'Presentation',
        xls: 'Spreadsheet', xlsx: 'Spreadsheet', csv: 'Spreadsheet', ods: 'Spreadsheet',
        jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image', svg: 'Image', webp: 'Image', bmp: 'Image',
        mp4: 'Video', mov: 'Video', avi: 'Video', webm: 'Video', mkv: 'Video',
        mp3: 'Audio', wav: 'Audio', ogg: 'Audio', aac: 'Audio', flac: 'Audio',
        zip: 'Archive', rar: 'Archive', '7z': 'Archive', tar: 'Archive', gz: 'Archive',
    };
    return map[ext] || 'Other';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function PreventionResources() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    // Category management state
    const [newCatName, setNewCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState(null);
    const [editingCatName, setEditingCatName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { catId, catName, fileCount }
    const [moveTarget, setMoveTarget] = useState('uncategorised');

    // Upload state
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadCategory, setUploadCategory] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const categories = state.preventionResourceCategories || [];
    const resources = (state.preventionResources || []).filter(r => {
        const q = search.toLowerCase();
        const matchesSearch = r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
        const cat = r.category || r.workshopType || 'Uncategorised';
        const matchesCat = filterCategory === 'All' || cat === filterCategory;
        return matchesSearch && matchesCat;
    }).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const usedCategories = [...new Set(resources.map(r => r.category || r.workshopType || 'Uncategorised'))];
    const allCategoryNames = [...new Set([...categories.map(c => c.name), ...usedCategories])];
    const displayCategories = filterCategory === 'All' ? allCategoryNames : [filterCategory];

    const anySelected = selectedIds.length > 0;

    // ─── Category CRUD ─────────────────────────
    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        dispatch({ type: ACTIONS.ADD_PREVENTION_RESOURCE_CATEGORY, payload: { name: newCatName.trim(), sortOrder: categories.length } });
        setNewCatName('');
    };

    const handleUpdateCategory = (item) => {
        if (!editingCatName.trim()) return;
        const oldName = item.name;
        const newName = editingCatName.trim();
        dispatch({ type: ACTIONS.UPDATE_PREVENTION_RESOURCE_CATEGORY, payload: { ...item, name: newName } });
        // Update all resources that used the old category name
        (state.preventionResources || []).forEach(r => {
            const cat = r.category || r.workshopType;
            if (cat === oldName) {
                dispatch({ type: ACTIONS.UPDATE_PREVENTION_RESOURCE, payload: { id: r.id, category: newName, workshopType: newName } });
            }
        });
        setEditingCatId(null);
    };

    const handleDeleteCategoryClick = (cat) => {
        const filesInCat = (state.preventionResources || []).filter(r => (r.category || r.workshopType) === cat.name);
        if (filesInCat.length > 0) {
            setDeleteConfirm({ catId: cat.id, catName: cat.name, fileCount: filesInCat.length });
            setMoveTarget('uncategorised');
        } else {
            dispatch({ type: ACTIONS.DELETE_PREVENTION_RESOURCE_CATEGORY, payload: cat.id });
        }
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;
        const targetCat = moveTarget === 'uncategorised' ? 'Uncategorised' : moveTarget;
        (state.preventionResources || []).forEach(r => {
            const cat = r.category || r.workshopType;
            if (cat === deleteConfirm.catName) {
                dispatch({ type: ACTIONS.UPDATE_PREVENTION_RESOURCE, payload: { id: r.id, category: targetCat, workshopType: targetCat } });
            }
        });
        dispatch({ type: ACTIONS.DELETE_PREVENTION_RESOURCE_CATEGORY, payload: deleteConfirm.catId });
        setDeleteConfirm(null);
    };

    // ─── Upload ─────────────────────────────────
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        setUploadFiles(prev => [...prev, ...files]);
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadFiles(prev => [...prev, ...files]);
        e.target.value = '';
    };

    const removeFile = (idx) => setUploadFiles(prev => prev.filter((_, i) => i !== idx));

    const handleUpload = (e) => {
        e.preventDefault();
        const cat = uploadCategory || (categories.length > 0 ? categories[0].name : 'Uncategorised');
        uploadFiles.forEach(file => {
            dispatch({
                type: ACTIONS.ADD_PREVENTION_RESOURCE,
                payload: {
                    name: file.name,
                    fileType: detectFileType(file),
                    size: formatSize(file.size),
                    category: cat,
                    workshopType: cat,
                    description: '',
                    uploadedAt: new Date().toISOString(),
                },
            });
        });
        setUploadFiles([]);
        setUploadCategory('');
        setShowUploadModal(false);
    };

    // ─── Edit single resource ───────────────────
    const handleSaveEdit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.workshopType = data.category;
        dispatch({ type: ACTIONS.UPDATE_PREVENTION_RESOURCE, payload: { id: editItem.id, ...data } });
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this resource?')) dispatch({ type: ACTIONS.DELETE_PREVENTION_RESOURCE, payload: id });
    };

    // ─── Selection ──────────────────────────────
    const toggleSelect = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const catColor = (name) => {
        const colors = ['var(--primary)', 'var(--info)', 'var(--warning)', 'var(--success)', 'var(--text-muted)', 'var(--danger)'];
        const idx = categories.findIndex(c => c.name === name);
        return idx >= 0 ? colors[idx % colors.length] : 'var(--text-muted)';
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
                    <select className="form-select" style={{ flex: 1 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option>All</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        <option value="Uncategorised">Uncategorised</option>
                    </select>
                    <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
                        <Tags style={{ width: 16, height: 16 }} /> Categories
                    </button>
                    <button className="btn btn-primary" onClick={() => { setUploadFiles([]); setUploadCategory(''); setShowUploadModal(true); }}>
                        <Upload style={{ width: 16, height: 16 }} /> Upload Resource
                    </button>
                </div>
            </div>
            <div className="page-body">
                {displayCategories.map(catName => {
                    const items = resources.filter(r => (r.category || r.workshopType || 'Uncategorised') === catName);
                    if (items.length === 0) return null;
                    return (
                        <div key={catName} style={{ marginBottom: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <Folder style={{ width: 16, height: 16, color: catColor(catName) }} />
                                <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{catName}</h3>
                                <span className="kanban-count">{items.length}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                                {items.map(r => (
                                    <div key={r.id} className="resource-card-wrapper">
                                        <div
                                            className={`resource-select-checkbox ${selectedIds.includes(r.id) ? 'checked' : ''} ${anySelected ? 'visible' : ''}`}
                                            onClick={e => toggleSelect(r.id, e)}
                                        >
                                            {selectedIds.includes(r.id) && <Check style={{ width: 14, height: 14 }} />}
                                        </div>
                                        <div className={`card resource-card ${selectedIds.includes(r.id) ? 'resource-selected' : ''}`} onClick={() => setEditItem(r)} style={{ cursor: 'pointer' }}>
                                            <div className="card-body">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                        <FileText style={{ width: 18, height: 18, color: 'var(--primary)', flexShrink: 0 }} />
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                                    </div>
                                                    <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(r.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                                </div>
                                                {r.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>{r.description}</div>}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <StatusBadge status={r.fileType} map={typeMap} />
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {r.size} • {new Date(r.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
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

            {/* Selection Toolbar */}
            {anySelected && (
                <div className="resource-selection-toolbar">
                    <span>{selectedIds.length} file{selectedIds.length !== 1 ? 's' : ''} selected</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>Deselect All</button>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <Modal isOpen onClose={() => setShowUploadModal(false)} title="Upload Resources">
                    <form onSubmit={handleUpload}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                                    {categories.length === 0 && <option value="Uncategorised">Uncategorised</option>}
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Upload style={{ width: 14, height: 14 }} /> Files
                                </label>
                                <div
                                    className={`resource-upload-zone ${dragOver ? 'drag-over' : ''}`}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload style={{ width: 32, height: 32 }} />
                                    <p>Drop files here or click to browse</p>
                                    <span>All file types accepted • Multiple files supported</span>
                                    <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                                </div>
                                {uploadFiles.length > 0 && (
                                    <div className="resource-file-list">
                                        {uploadFiles.map((f, i) => (
                                            <div key={i} className="resource-file-item">
                                                <FileText style={{ width: 16, height: 16, color: 'var(--primary)', flexShrink: 0 }} />
                                                <span className="resource-file-item-name">{f.name}</span>
                                                <span className="resource-file-item-size">{formatSize(f.size)}</span>
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeFile(i)}><X style={{ width: 14, height: 14 }} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={uploadFiles.length === 0}>
                                Upload {uploadFiles.length > 0 ? `${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}` : ''}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Resource Modal */}
            {editItem && (
                <Modal isOpen onClose={() => setEditItem(null)} title="Edit Resource">
                    <form onSubmit={handleSaveEdit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Resource Name</label>
                                <input className="form-input" name="name" defaultValue={editItem.name} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" name="category" defaultValue={editItem.category || editItem.workshopType || 'Uncategorised'}>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        <option value="Uncategorised">Uncategorised</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">File Type</label>
                                    <select className="form-select" name="fileType" defaultValue={editItem.fileType || 'PDF'}>
                                        {Object.keys(typeMap).map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">File Size</label>
                                <input className="form-input" name="size" defaultValue={editItem.size} placeholder="e.g. 2.5 MB" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem.description} rows={3} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Categories Modal */}
            {showCategoryModal && (
                <Modal isOpen onClose={() => { setShowCategoryModal(false); setEditingCatId(null); }} title="Manage Categories">
                    <div className="modal-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            {categories.map(cat => (
                                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '6px 0' }}>
                                    {editingCatId === cat.id ? (
                                        <>
                                            <input
                                                className="form-input"
                                                value={editingCatName}
                                                onChange={e => setEditingCatName(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleUpdateCategory(cat); if (e.key === 'Escape') setEditingCatId(null); }}
                                                style={{ flex: 1 }}
                                                autoFocus
                                            />
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateCategory(cat)} style={{ color: 'var(--success)' }}><Check size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingCatId(null)}><X size={14} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <Folder style={{ width: 16, height: 16, color: catColor(cat.name), flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: 14 }}>{cat.name}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {(state.preventionResources || []).filter(r => (r.category || r.workshopType) === cat.name).length} files
                                            </span>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}><Edit2 size={13} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteCategoryClick(cat)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 'var(--space-md) 0' }}>No categories yet. Create your first one below.</div>}
                        </div>
                        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            <input className="form-input" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Add new category…" style={{ flex: 1 }} />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={!newCatName.trim()}><Plus size={14} /> Add</button>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => { setShowCategoryModal(false); setEditingCatId(null); }}>Done</button>
                    </div>
                </Modal>
            )}

            {/* Delete Category Confirmation */}
            {deleteConfirm && (
                <div className="category-delete-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="category-delete-dialog" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <AlertTriangle style={{ width: 20, height: 20, color: 'var(--warning)' }} />
                            <h3>Delete "{deleteConfirm.catName}"?</h3>
                        </div>
                        <p>This category contains <strong>{deleteConfirm.fileCount} file{deleteConfirm.fileCount !== 1 ? 's' : ''}</strong>. Where would you like to move them?</p>
                        <div className="form-group">
                            <select className="form-select" value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>
                                <option value="uncategorised">Uncategorised</option>
                                {categories.filter(c => c.id !== deleteConfirm.catId).map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="category-delete-dialog-actions">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete}>Delete & Move Files</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
