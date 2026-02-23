import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Building2, User, Users, PoundSterling, X, ImagePlus, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

const STAGES = [
    { key: 'Initial Conversation', label: 'Initial Conversation', color: 'var(--text-muted)' },
    { key: 'Proposal', label: 'Proposal', color: 'var(--info)' },
    { key: 'In Comms', label: 'In Comms', color: 'var(--warning)' },
    { key: 'Session Booked', label: 'Session Booked', color: 'var(--primary)' },
    { key: 'Post Session', label: 'Post Session', color: 'var(--success)' },
    { key: 'Invoicing', label: 'Invoicing', color: '#a855f7' },
];

const STAGE_KEYS = STAGES.map(s => s.key);

export default function WorkshopTracker() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const staff = state.staff || [];
    const companies = state.companies || [];
    const contacts = state.contacts || [];

    const workshops = (state.preventionSchedule || []).filter(w => {
        const q = search.toLowerCase();
        const companyName = getCompanyName(w.companyId);
        const contactName = getContactName(w.contactId);
        return (
            (w.title || '').toLowerCase().includes(q) ||
            companyName.toLowerCase().includes(q) ||
            contactName.toLowerCase().includes(q)
        );
    });

    function getStaffName(id) {
        const s = staff.find(s => s.id === id);
        return s ? `${s.firstName} ${s.lastName}` : '—';
    }
    function getCompanyName(id) {
        const c = companies.find(c => c.id === id);
        return c ? c.name : '';
    }
    function getContactName(id) {
        const c = contacts.find(c => c.id === id);
        return c ? `${c.firstName} ${c.lastName}` : '';
    }

    // Normalise stage — old statuses map to Initial Conversation
    function getStage(w) {
        if (STAGE_KEYS.includes(w.status)) return w.status;
        return 'Initial Conversation';
    }

    // ─── Image Upload ──────────────────────────────────────
    const handleImageUpload = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { data, error } = await supabase.storage
                .from('workshop-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('workshop-images').getPublicUrl(data.path);
            setImageUrl(urlData.publicUrl);
        } catch (err) {
            console.error('Image upload failed:', err);
            // Fallback: use a local data URL so the feature still works without storage
            const reader = new FileReader();
            reader.onload = (ev) => setImageUrl(ev.target.result);
            reader.readAsDataURL(file);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setImageUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── CRUD ──────────────────────────────────────────────
    const openModal = (item) => {
        setEditItem(item);
        setImageUrl(item?.imageUrl || '');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
        setImageUrl('');
    };

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.attendeeCount = data.attendeeCount ? parseInt(data.attendeeCount) : null;
        data.maxCapacity = data.maxCapacity ? parseInt(data.maxCapacity) : null;
        if (!data.companyId) data.companyId = null;
        if (!data.contactId) data.contactId = null;
        if (!data.facilitatorId) data.facilitatorId = null;
        if (!data.value) data.value = null;
        data.imageUrl = imageUrl || null;

        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_WORKSHOP, payload: data });
        }
        closeModal();
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this workshop?')) dispatch({ type: ACTIONS.DELETE_WORKSHOP, payload: id });
    };

    // ─── Drag & Drop ──────────────────────────────────────
    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        requestAnimationFrame(() => {
            e.target.classList.add('dragging');
        });
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedItem(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, stageKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(stageKey);
    };

    const handleDragLeave = (e) => {
        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = (e, stageKey) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedItem && getStage(draggedItem) !== stageKey) {
            dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: draggedItem.id, status: stageKey } });
        }
        setDraggedItem(null);
    };

    // Stats
    const totalValue = workshops.reduce((sum, w) => sum + (parseFloat(w.value) || 0), 0);

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Workshop Tracker</h1>
                    <div className="page-header-subtitle">
                        {workshops.length} workshop{workshops.length !== 1 ? 's' : ''}
                        {totalValue > 0 && ` · £${totalValue.toLocaleString()} pipeline`}
                    </div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search workshops…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal(null)}>
                        <Plus /> Add Workshop
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(240px, 1fr))` }}>
                    {STAGES.map(stage => {
                        const items = workshops.filter(w => getStage(w) === stage.key);
                        return (
                            <div
                                key={stage.key}
                                className={`kanban-column${dragOverColumn === stage.key ? ' drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, stage.key)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, stage.key)}
                            >
                                <div className="kanban-column-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 13 }}>{stage.label}</span>
                                    </div>
                                    <span className="kanban-count">{items.length}</span>
                                </div>
                                <div className="kanban-column-body">
                                    {items.map(w => (
                                        <div
                                            key={w.id}
                                            className="kanban-card workshop-kanban-card"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, w)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => openModal(w)}
                                        >
                                            {w.imageUrl && (
                                                <div className="kanban-card-image-wrapper">
                                                    <img src={w.imageUrl} alt="" className="kanban-card-image" />
                                                </div>
                                            )}
                                            <div className="kanban-card-title">{w.title}</div>

                                            {getCompanyName(w.companyId) && (
                                                <div className="kanban-card-detail">
                                                    <Building2 style={{ width: 12, height: 12, flexShrink: 0 }} />
                                                    <span>{getCompanyName(w.companyId)}</span>
                                                </div>
                                            )}
                                            {getContactName(w.contactId) && (
                                                <div className="kanban-card-detail">
                                                    <User style={{ width: 12, height: 12, flexShrink: 0 }} />
                                                    <span>{getContactName(w.contactId)}</span>
                                                </div>
                                            )}

                                            <div className="kanban-card-meta">
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Users style={{ width: 12, height: 12 }} />
                                                    {getStaffName(w.facilitatorId)}
                                                </span>
                                                {w.value && (
                                                    <span className="kanban-card-value">
                                                        <PoundSterling style={{ width: 11, height: 11 }} />
                                                        {parseFloat(w.value).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {items.length === 0 && (
                                        <div className="kanban-empty">Drop workshops here</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add/Edit Workshop Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editItem ? 'Edit Workshop' : 'New Workshop'}>
                <form onSubmit={handleSave}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Workshop Title</label>
                            <input className="form-input" name="title" defaultValue={editItem?.title} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Stage</label>
                                <select className="form-select" name="status" defaultValue={editItem ? getStage(editItem) : 'Initial Conversation'}>
                                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" name="workshopType" defaultValue={editItem?.workshopType || 'Awareness'}>
                                    <option>Awareness</option><option>Prevention</option><option>Training</option>
                                </select>
                            </div>
                        </div>
                        {/* Image Upload Area */}
                        <div className="form-group">
                            <label className="form-label">
                                <ImagePlus style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                                Cover Image
                            </label>
                            {imageUrl ? (
                                <div className="image-upload-preview">
                                    <img src={imageUrl} alt="Workshop cover" />
                                    <div className="image-upload-preview-actions">
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
                                            Change
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={handleRemoveImage}>
                                            <Trash2 style={{ width: 13, height: 13 }} /> Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="image-upload-zone"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
                                    onDragLeave={(e) => e.currentTarget.classList.remove('drag-active')}
                                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-active'); handleImageUpload(e.dataTransfer.files[0]); }}
                                >
                                    {uploading ? (
                                        <Loader2 className="image-upload-spinner" />
                                    ) : (
                                        <>
                                            <UploadCloud style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />
                                            <span className="image-upload-text">Click or drag an image to upload</span>
                                            <span className="image-upload-hint">JPG, PNG or WebP · Max 5MB</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageUpload(e.target.files[0])}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Organisation</label>
                                <select className="form-select" name="companyId" defaultValue={editItem?.companyId || ''}>
                                    <option value="">Select…</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact</label>
                                <select className="form-select" name="contactId" defaultValue={editItem?.contactId || ''}>
                                    <option value="">Select…</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Assigned Member</label>
                                <select className="form-select" name="facilitatorId" defaultValue={editItem?.facilitatorId || ''}>
                                    <option value="">Select…</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Value (£)</label>
                                <input className="form-input" name="value" type="number" step="0.01" placeholder="0.00" defaultValue={editItem?.value || ''} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Date & Time</label>
                                <input className="form-input" name="date" type="datetime-local" defaultValue={editItem?.date ? editItem.date.slice(0, 16) : ''} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <input className="form-input" name="endTime" type="datetime-local" defaultValue={editItem?.endTime ? editItem.endTime.slice(0, 16) : ''} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-input" name="location" defaultValue={editItem?.location} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Capacity</label>
                                <input className="form-input" name="maxCapacity" type="number" defaultValue={editItem?.maxCapacity} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Attendee Count</label>
                            <input className="form-input" name="attendeeCount" type="number" defaultValue={editItem?.attendeeCount} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" name="notes" defaultValue={editItem?.notes} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Feedback</label>
                            <textarea className="form-textarea" name="feedback" defaultValue={editItem?.feedback} placeholder="Post-workshop feedback…" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        {editItem && (
                            <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={e => { handleDelete(editItem.id, e); closeModal(); }}>
                                <Trash2 style={{ width: 14, height: 14 }} /> Delete
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Workshop'}</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
