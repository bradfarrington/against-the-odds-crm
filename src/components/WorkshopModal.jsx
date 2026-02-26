import { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ImagePlus, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import DateTimePicker from './DateTimePicker';

export default function WorkshopModal({ isOpen, onClose, editItem }) {
    const { state, dispatch, ACTIONS } = useData();
    const [imageUrl, setImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [durationHours, setDurationHours] = useState(1);
    const [durationMinutes, setDurationMinutes] = useState(0);
    const fileInputRef = useRef(null);

    const staff = state.staff || [];
    const companies = state.companies || [];
    const contacts = state.contacts || [];
    const workshopStages = state.workshopStages || [];
    const stageKeys = workshopStages.map(s => s.name);

    useEffect(() => {
        if (editItem) {
            setImageUrl(editItem.imageUrl || '');
            let durH = 1;
            let durM = 0;
            if (editItem.endTime && editItem.date) {
                const sTime = new Date(editItem.date).getTime();
                const eTime = new Date(editItem.endTime).getTime();
                if (!isNaN(sTime) && !isNaN(eTime) && eTime > sTime) {
                    const diffMins = Math.floor((eTime - sTime) / 60000);
                    durH = Math.floor(diffMins / 60);
                    durM = diffMins % 60;
                }
            }
            setDurationHours(durH);
            setDurationMinutes(durM);
        } else {
            setImageUrl('');
            setDurationHours(1);
            setDurationMinutes(0);
        }
    }, [editItem, isOpen]);

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

        // Calculate end time and convert date to ISO
        if (data.date) {
            const dt = new Date(data.date);
            if (!isNaN(dt.getTime())) {
                // Determine if we need to set ISO String (only if it has a time component naturally via the string)
                if (data.date.length === 16) {
                    data.date = dt.toISOString();
                }
                const endDateTime = new Date(dt);
                endDateTime.setHours(endDateTime.getHours() + parseInt(durationHours));
                endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(durationMinutes));
                data.endTime = endDateTime.toISOString();
            }
        } else {
            data.endTime = null;
        }

        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: editItem.id, ...data } });
        } else {
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
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Stage</label>
                            <select className="form-select" name="status" defaultValue={editItem ? getStage(editItem) : (stageKeys[0] || 'Initial Conversation')}>
                                {workshopStages.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
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
                        <div className="form-group" style={{ flex: 1.5 }}>
                            <label className="form-label">Start Date & Time</label>
                            <DateTimePicker name="date" value={editItem?.date ? editItem.date.slice(0, 16) : ''} required />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Duration (Hours)</label>
                            <select className="form-input" value={durationHours} onChange={e => {
                                const h = parseInt(e.target.value);
                                let m = durationMinutes;
                                if (h === 0 && m < 15) m = 15;
                                setDurationHours(h);
                                setDurationMinutes(m);
                            }}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 48].map(h => <option key={h} value={h}>{h} hr{h !== 1 ? 's' : ''}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Duration (Minutes)</label>
                            <select className="form-input" value={durationMinutes} onChange={e => {
                                const m = parseInt(e.target.value);
                                let h = durationHours;
                                if (h === 0 && m < 15) h = 1;
                                setDurationHours(h);
                                setDurationMinutes(m);
                            }}>
                                {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m} mins</option>)}
                            </select>
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
