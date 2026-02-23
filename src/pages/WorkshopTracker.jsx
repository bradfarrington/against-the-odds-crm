import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Calendar, MapPin, Users, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Scheduled: 'info', Completed: 'success', Cancelled: 'danger' };
const typeMap = { Awareness: 'primary', Prevention: 'warning', Training: 'neutral' };

export default function WorkshopTracker() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const workshops = (state.preventionSchedule || []).filter(w => {
        const q = search.toLowerCase();
        return w.title.toLowerCase().includes(q) || (w.location || '').toLowerCase().includes(q);
    });

    const staff = state.staff || [];
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : '—'; };

    const columns = [
        { key: 'Scheduled', label: 'Scheduled', color: 'var(--info)' },
        { key: 'Completed', label: 'Completed', color: 'var(--success)' },
        { key: 'Cancelled', label: 'Cancelled', color: 'var(--danger)' },
    ];

    const moveWorkshop = (id, newStatus) => {
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id, status: newStatus } });
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
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_WORKSHOP, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this workshop?')) dispatch({ type: ACTIONS.DELETE_WORKSHOP, payload: id });
    };

    const completed = workshops.filter(w => w.status === 'Completed');
    const totalAttendees = completed.reduce((sum, w) => sum + (w.attendeeCount || 0), 0);

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Workshop Tracker</h1>
                    <div className="page-header-subtitle">{workshops.length} workshop{workshops.length !== 1 ? 's' : ''} • {totalAttendees} people reached</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search workshops…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Workshop
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="kanban-board">
                    {columns.map(col => {
                        const items = workshops.filter(w => w.status === col.key).sort((a, b) => new Date(a.date) - new Date(b.date));
                        return (
                            <div key={col.key} className="kanban-column">
                                <div className="kanban-column-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                                        {col.label}
                                    </div>
                                    <span className="kanban-count">{items.length}</span>
                                </div>
                                <div className="kanban-column-body">
                                    {items.map(w => (
                                        <div key={w.id} className="kanban-card" onClick={() => { setEditItem(w); setShowModal(true); }}>
                                            <div className="kanban-card-title">{w.title}</div>
                                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                                <StatusBadge status={w.workshopType} map={typeMap} />
                                            </div>
                                            <div className="kanban-card-meta">
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Calendar style={{ width: 12, height: 12 }} />
                                                    {new Date(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin style={{ width: 12, height: 12 }} />
                                                    {w.location}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users style={{ width: 12, height: 12 }} />{w.attendeeCount ?? 0}/{w.maxCapacity || '—'}</span>
                                                <span>{getStaffName(w.facilitatorId)}</span>
                                            </div>
                                            {col.key !== 'Scheduled' ? null : (
                                                <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={e => { e.stopPropagation(); moveWorkshop(w.id, 'Completed'); }}>✓ Complete</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); moveWorkshop(w.id, 'Cancelled'); }}>Cancel</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(w.id, e)}><X style={{ width: 12, height: 12 }} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)', fontSize: 13 }}>No workshops</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Workshop' : 'New Workshop'} large>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Workshop Title</label>
                                <input className="form-input" name="title" defaultValue={editItem?.title} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" name="workshopType" defaultValue={editItem?.workshopType || 'Awareness'}>
                                        <option>Awareness</option><option>Prevention</option><option>Training</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Scheduled'}>
                                        <option>Scheduled</option><option>Completed</option><option>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date & Time</label>
                                    <input className="form-input" name="date" type="datetime-local" defaultValue={editItem?.date ? editItem.date.slice(0, 16) : ''} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Time</label>
                                    <input className="form-input" name="endTime" type="datetime-local" defaultValue={editItem?.endTime ? editItem.endTime.slice(0, 16) : ''} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Organisation</label>
                                    <select className="form-select" name="companyId" defaultValue={editItem?.companyId || ''}>
                                        <option value="">Select…</option>
                                        {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Facilitator</label>
                                    <select className="form-select" name="facilitatorId" defaultValue={editItem?.facilitatorId || ''}>
                                        <option value="">Select…</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
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
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Attendee Count</label>
                                    <input className="form-input" name="attendeeCount" type="number" defaultValue={editItem?.attendeeCount} />
                                </div>
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
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Workshop'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
