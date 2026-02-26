import { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ImagePlus, Trash2, UploadCloud, Loader2, Plus, Clock } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import DateTimePicker from './DateTimePicker';

export default function WorkshopModal({ isOpen, onClose, editItem, pipelineId, defaultCompanyId }) {
    const { state, dispatch, ACTIONS } = useData();
    const { user } = useAuth();
    const [imageUrl, setImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedPipelineId, setSelectedPipelineId] = useState('');
    const [newNote, setNewNote] = useState('');
    const fileInputRef = useRef(null);

    const staff = state.staff || [];
    const companies = state.companies || [];
    const contacts = state.contacts || [];

    const workshopTypes = (state.workshopTypes || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    // Fallback to hardcoded if no types in DB yet
    const typeOptions = workshopTypes.length > 0
        ? workshopTypes.map(t => t.name)
        : ['Awareness', 'Prevention', 'Training'];

    // Pipelines for the dropdown (workshop type only)
    const allPipelines = (state.pipelines || []).filter(p => p.trackerType === 'workshop').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Resolve the effective pipeline: prop > user selection
    const effectivePipelineId = pipelineId || selectedPipelineId || null;

    const workshopStages = (state.workshopStages || []).filter(s => !effectivePipelineId || s.pipelineId === effectivePipelineId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const stageKeys = workshopStages.map(s => s.name);

    // Extract date-only (YYYY-MM-DD) for the date pickers
    const editStartDate = editItem?.date ? editItem.date.slice(0, 10) : '';
    const editEndDate = editItem?.endTime ? editItem.endTime.slice(0, 10) : '';

    useEffect(() => {
        if (editItem) {
            setImageUrl(editItem.imageUrl || '');
            setSelectedPipelineId(editItem.pipelineId || '');
        } else {
            setImageUrl('');
            setSelectedPipelineId(allPipelines[0]?.id || '');
        }
        setNewNote('');
    }, [editItem, isOpen]);

    const existingNotes = editItem?.workshopNotes || [];

    const handleAddNote = () => {
        if (!newNote.trim() || !editItem) return;
        const currentStaff = staff.find(s => s.email === user?.email);
        const note = {
            id: crypto.randomUUID(),
            text: newNote.trim(),
            createdAt: new Date().toISOString(),
            userName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : (user?.email || 'Unknown'),
        };
        const updatedNotes = [...existingNotes, note];
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: editItem.id, workshopNotes: updatedNotes } });
        setNewNote('');
    };

    const fmtNoteDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : '';

    function getStage(w) {
        if (w && stageKeys.includes(w.status)) return w.status;
        return stageKeys[0] || 'Initial Conversation';
    }

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

        // Store date and endTime as date-only strings (YYYY-MM-DD)
        // endDate form field maps to endTime in the data model
        if (data.endDate) {
            data.endTime = data.endDate;
            delete data.endDate;
        } else {
            data.endTime = data.date || null;
        }

        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: editItem.id, ...data } });
        } else {
            const resolvedPipelineId = pipelineId || selectedPipelineId;
            if (resolvedPipelineId) data.pipelineId = resolvedPipelineId;
            // Convert initial notes text into timestamped workshopNotes array
            if (data.notes && data.notes.trim()) {
                const currentStaff = staff.find(s => s.email === user?.email);
                data.workshopNotes = [{
                    id: crypto.randomUUID(),
                    text: data.notes.trim(),
                    createdAt: new Date().toISOString(),
                    userName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : (user?.email || 'Unknown'),
                }];
            }
            delete data.notes;
            dispatch({ type: ACTIONS.ADD_WORKSHOP, payload: data });
        }
        onClose();
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this workshop?')) {
            dispatch({ type: ACTIONS.DELETE_WORKSHOP, payload: id });
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editItem ? 'Edit Workshop' : 'New Workshop'}>
            <form onSubmit={handleSave}>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Workshop Title</label>
                        <input className="form-input" name="title" defaultValue={editItem?.title} required />
                    </div>
                    {/* Pipeline selector — only shown when not opened from a specific pipeline context */}
                    {!pipelineId && allPipelines.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Pipeline</label>
                            <select
                                className="form-select"
                                value={selectedPipelineId}
                                onChange={e => setSelectedPipelineId(e.target.value)}
                            >
                                {allPipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Stage</label>
                            <select className="form-select" name="status" key={effectivePipelineId} defaultValue={editItem ? getStage(editItem) : (stageKeys[0] || 'Initial Conversation')}>
                                {workshopStages.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" name="workshopType" defaultValue={editItem?.workshopType || typeOptions[0]}>
                                {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
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
                            <select className="form-select" name="companyId" defaultValue={editItem?.companyId || defaultCompanyId || ''}>
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
                            <label className="form-label">Start Date</label>
                            <DateTimePicker name="date" mode="date" value={editStartDate} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <DateTimePicker name="endDate" mode="date" value={editEndDate} dropdownAlign="right" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" name="location" defaultValue={editItem?.location} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Attendee Count</label>
                            <input className="form-input" name="attendeeCount" type="number" defaultValue={editItem?.attendeeCount} />
                        </div>
                    </div>
                    {/* Workshop Info / Notes */}
                    <div className="form-group">
                        <label className="form-label">Workshop Info</label>
                        {editItem && existingNotes.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', maxHeight: 200, overflowY: 'auto', padding: 'var(--space-sm)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                {[...existingNotes].reverse().map(note => (
                                    <div key={note.id} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{note.userName}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={10} />{fmtNoteDate(note.createdAt)}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {editItem ? (
                            <div>
                                <textarea
                                    className="form-textarea"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder="Add a note…"
                                    style={{ width: '100%', minHeight: 60, marginBottom: 'var(--space-sm)' }}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAddNote(); } }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                                        <Plus size={14} /> Add Note
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <textarea className="form-textarea" name="notes" placeholder="Add workshop info notes…" />
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    {editItem && (
                        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={e => handleDelete(editItem.id, e)}>
                            <Trash2 style={{ width: 14, height: 14 }} /> Delete
                        </button>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Workshop'}</button>
                </div>
            </form>
        </Modal>
    );
}
