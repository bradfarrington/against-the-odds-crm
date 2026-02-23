import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Calendar, MapPin, Users, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Scheduled: 'info', Completed: 'success', Cancelled: 'danger' };
const typeMap = { Awareness: 'primary', Prevention: 'warning', Training: 'neutral' };

export default function PreventionSchedule() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [viewMode, setViewMode] = useState('list');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const workshops = (state.preventionSchedule || [])
        .filter(w => {
            const q = search.toLowerCase();
            const matchesSearch = w.title.toLowerCase().includes(q) || (w.location || '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'All' || w.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const staff = state.staff || [];
    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : '—'; };

    const completed = (state.preventionSchedule || []).filter(w => w.status === 'Completed');
    const totalAttendees = completed.reduce((sum, w) => sum + (w.attendeeCount || 0), 0);

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

    // Group by month for calendar view
    const groupedByMonth = workshops.reduce((acc, w) => {
        const key = new Date(w.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!acc[key]) acc[key] = [];
        acc[key].push(w);
        return acc;
    }, {});

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Prevention Schedule</h1>
                    <div className="page-header-subtitle">Workshops & awareness events</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search workshops…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Scheduled</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Workshop
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total Workshops</div>
                        <div className="stat-card-value">{(state.preventionSchedule || []).length}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--info)' }}>
                        <div className="stat-card-label">Scheduled</div>
                        <div className="stat-card-value">{(state.preventionSchedule || []).filter(w => w.status === 'Scheduled').length}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Completed</div>
                        <div className="stat-card-value">{completed.length}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                        <div className="stat-card-label">People Reached</div>
                        <div className="stat-card-value">{totalAttendees}</div>
                    </div>
                </div>

                {Object.entries(groupedByMonth).map(([month, items]) => (
                    <div key={month} style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {items.map(w => (
                                <div key={w.id} className="card schedule-card" onClick={() => { setEditItem(w); setShowModal(true); }} style={{ cursor: 'pointer' }}>
                                    <div style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                        <div className="schedule-date-badge">
                                            <span className="schedule-date-day">{new Date(w.date).getDate()}</span>
                                            <span className="schedule-date-weekday">{new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{w.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar style={{ width: 12, height: 12 }} />{new Date(w.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — {w.endTime ? new Date(w.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 12, height: 12 }} />{w.location}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users style={{ width: 12, height: 12 }} />
                                                    {w.attendeeCount !== null ? `${w.attendeeCount}/${w.maxCapacity || '—'}` : `0/${w.maxCapacity || '—'} capacity`}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <StatusBadge status={w.workshopType} map={typeMap} />
                                            <StatusBadge status={w.status} map={statusMap} />
                                            <span className="table-cell-secondary" style={{ fontSize: 12 }}>{getStaffName(w.facilitatorId)}</span>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(w.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                        </div>
                                    </div>
                                    {w.feedback && (
                                        <div style={{ padding: '0 var(--space-lg) var(--space-md)', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                                            "{w.feedback}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {workshops.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>No workshops found</div>}
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
                                    <label className="form-label">Contact</label>
                                    <select className="form-select" name="contactId" defaultValue={editItem?.contactId || ''}>
                                        <option value="">Select…</option>
                                        {state.contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Facilitator</label>
                                    <select className="form-select" name="facilitatorId" defaultValue={editItem?.facilitatorId || ''}>
                                        <option value="">Select…</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input className="form-input" name="location" defaultValue={editItem?.location} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Attendee Count</label>
                                    <input className="form-input" name="attendeeCount" type="number" defaultValue={editItem?.attendeeCount} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max Capacity</label>
                                    <input className="form-input" name="maxCapacity" type="number" defaultValue={editItem?.maxCapacity} />
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
