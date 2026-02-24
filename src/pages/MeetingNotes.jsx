import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Plus, Search, NotebookPen, X } from 'lucide-react';
import Modal from '../components/Modal';
import DateTimePicker from '../components/DateTimePicker';
import StatusBadge from '../components/StatusBadge';

const typeMap = { 'Face to Face': 'success', Remote: 'info' };

export default function MeetingNotes() {
    const { state, dispatch, ACTIONS } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const meetings = (state.meetingNotes || [])
        .filter(m => {
            const q = search.toLowerCase();
            const matchesSearch =
                m.title.toLowerCase().includes(q) ||
                (m.notes || '').toLowerCase().includes(q) ||
                (m.agenda || '').toLowerCase().includes(q);
            const matchesType = filterType === 'All' || m.meetingType === filterType;
            return matchesSearch && matchesType;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';
    const getContactName = (id) => {
        const c = state.contacts.find(c => c.id === id);
        return c ? `${c.firstName} ${c.lastName}` : '';
    };

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const truncate = (str, len = 60) => {
        if (!str) return '—';
        return str.length > len ? str.slice(0, len) + '…' : str;
    };

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (!data.companyId) data.companyId = null;
        data.contactIds = data.contactIds ? data.contactIds.split(',').filter(Boolean) : [];
        data.attendeeStaffIds = data.attendeeStaffIds ? data.attendeeStaffIds.split(',').filter(Boolean) : [];
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_MEETING_NOTE, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_MEETING_NOTE, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this meeting note?')) dispatch({ type: ACTIONS.DELETE_MEETING_NOTE, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Meeting Notes</h1>
                    <div className="page-header-subtitle">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search meetings…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ flex: 1 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option>All</option>
                        <option>Face to Face</option>
                        <option>Remote</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Meeting
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Date</th>
                                    <th>Agenda</th>
                                    <th>Contact</th>
                                    <th>Company</th>
                                    <th>Type</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {meetings.map(m => {
                                    const firstContactName = (m.contactIds || []).length > 0
                                        ? getContactName(m.contactIds[0])
                                        : '—';
                                    const extraContacts = (m.contactIds || []).length > 1
                                        ? ` +${(m.contactIds || []).length - 1}`
                                        : '';
                                    return (
                                        <tr key={m.id} onClick={() => navigate(`/meeting-notes/${m.id}`)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                    <div style={{
                                                        width: 34, height: 34, borderRadius: 'var(--radius-md)',
                                                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <NotebookPen style={{ width: 16, height: 16, color: 'white' }} />
                                                    </div>
                                                    <div className="table-cell-main">{m.title}</div>
                                                </div>
                                            </td>
                                            <td className="table-cell-secondary" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</td>
                                            <td className="table-cell-secondary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {truncate(m.agenda)}
                                            </td>
                                            <td className="table-cell-secondary">
                                                {firstContactName}{extraContacts}
                                            </td>
                                            <td className="table-cell-secondary">{m.companyId ? getCompanyName(m.companyId) : '—'}</td>
                                            <td><StatusBadge status={m.meetingType} map={typeMap} /></td>
                                            <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditItem(m); setShowModal(true); }}>Edit</button>
                                                <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(m.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {meetings.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="empty-state">
                                                <NotebookPen />
                                                <h3>No meeting notes found</h3>
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

            {showModal && (
                <MeetingModal
                    editItem={editItem}
                    onClose={() => { setShowModal(false); setEditItem(null); }}
                    onSave={handleSave}
                    companies={state.companies}
                    contacts={state.contacts}
                    staff={state.staff || []}
                />
            )}
        </>
    );
}

function MeetingModal({ editItem, onClose, onSave, companies, contacts, staff }) {
    const [selectedContacts, setSelectedContacts] = useState(editItem?.contactIds || []);
    const [selectedStaff, setSelectedStaff] = useState(editItem?.attendeeStaffIds || []);
    const [companyId, setCompanyId] = useState(editItem?.companyId || '');

    const companyContacts = companyId ? contacts.filter(c => c.companyId === companyId) : contacts;

    return (
        <Modal isOpen={true} onClose={onClose} title={editItem ? 'Edit Meeting' : 'New Meeting'} size="lg">
            <form onSubmit={onSave}>
                <input type="hidden" name="contactIds" value={selectedContacts.join(',')} />
                <input type="hidden" name="attendeeStaffIds" value={selectedStaff.join(',')} />
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Meeting Title</label>
                        <input className="form-input" name="title" defaultValue={editItem?.title} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date & Time</label>
                            <DateTimePicker name="date" value={editItem?.date ? editItem.date.slice(0, 16) : ''} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" name="meetingType" defaultValue={editItem?.meetingType || 'Remote'}>
                                <option>Face to Face</option><option>Remote</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Organisation</label>
                            <select className="form-select" name="companyId" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                                <option value="">Internal / No Organisation</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location / Platform</label>
                            <input className="form-input" name="location" defaultValue={editItem?.location} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">External Attendees</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                                {selectedContacts.map(id => {
                                    const c = contacts.find(c => c.id === id);
                                    return c && <span key={id} className="badge badge-primary" style={{ cursor: 'pointer' }} onClick={() => setSelectedContacts(prev => prev.filter(x => x !== id))}>{c.firstName} {c.lastName} ×</span>;
                                })}
                            </div>
                            <select className="form-select" value="" onChange={e => { if (e.target.value && !selectedContacts.includes(e.target.value)) setSelectedContacts(prev => [...prev, e.target.value]); e.target.value = ''; }}>
                                <option value="">Add contact…</option>
                                {companyContacts.filter(c => !selectedContacts.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ATO Staff</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                                {selectedStaff.map(id => {
                                    const s = staff.find(s => s.id === id);
                                    return s && <span key={id} className="badge badge-primary" style={{ cursor: 'pointer' }} onClick={() => setSelectedStaff(prev => prev.filter(x => x !== id))}>{s.firstName} {s.lastName} ×</span>;
                                })}
                            </div>
                            <select className="form-select" value="" onChange={e => { if (e.target.value && !selectedStaff.includes(e.target.value)) setSelectedStaff(prev => [...prev, e.target.value]); e.target.value = ''; }}>
                                <option value="">Add staff…</option>
                                {staff.filter(s => !selectedStaff.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Agenda</label>
                        <textarea className="form-textarea" name="agenda" defaultValue={editItem?.agenda} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Meeting Notes</label>
                        <textarea className="form-textarea" name="notes" defaultValue={editItem?.notes} rows={5} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Action Items</label>
                        <textarea className="form-textarea" name="actionItems" defaultValue={editItem?.actionItems} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Meeting'}</button>
                </div>
            </form>
        </Modal>
    );
}
