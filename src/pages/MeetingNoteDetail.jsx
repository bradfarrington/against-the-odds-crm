import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    ArrowLeft, NotebookPen, Calendar, MapPin, Video, Building2,
    Users, UsersRound, ClipboardList, FileText, CheckCircle2,
    Edit2, Trash2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const typeMap = { 'Face to Face': 'success', Remote: 'info' };

export default function MeetingNoteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();

    const [showEditModal, setShowEditModal] = useState(false);

    const meeting = (state.meetingNotes || []).find(m => m.id === id);
    const company = meeting?.companyId ? state.companies.find(c => c.id === meeting.companyId) : null;
    const contacts = state.contacts || [];
    const staff = state.staff || [];

    const getContactName = (cid) => {
        const c = contacts.find(c => c.id === cid);
        return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
    };
    const getStaffName = (sid) => {
        const s = staff.find(s => s.id === sid);
        return s ? `${s.firstName} ${s.lastName}` : 'Unknown';
    };

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const fmtTime = (d) =>
        d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

    if (!meeting) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <NotebookPen />
                    <h3>Meeting note not found</h3>
                    <p>This meeting note may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/meeting-notes')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Meeting Notes
                    </button>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this meeting note? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_MEETING_NOTE, payload: meeting.id });
            navigate('/meeting-notes');
        }
    };

    const handleEditSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (!data.companyId) data.companyId = null;
        data.contactIds = data.contactIds ? data.contactIds.split(',').filter(Boolean) : [];
        data.attendeeStaffIds = data.attendeeStaffIds ? data.attendeeStaffIds.split(',').filter(Boolean) : [];
        dispatch({ type: ACTIONS.UPDATE_MEETING_NOTE, payload: { id: meeting.id, ...data } });
        setShowEditModal(false);
    };

    const externalAttendees = (meeting.contactIds || []).map(cid => getContactName(cid)).filter(Boolean);
    const staffAttendees = (meeting.attendeeStaffIds || []).map(sid => getStaffName(sid)).filter(Boolean);

    return (
        <>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/meeting-notes')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <NotebookPen style={{ width: 22, height: 22, color: 'white' }} />
                        </div>
                        <div>
                            <h1>{meeting.title}</h1>
                            <div className="page-header-subtitle">
                                {fmtDate(meeting.date)}{fmtTime(meeting.date) ? ` at ${fmtTime(meeting.date)}` : ''}
                                {company ? ` · ${company.name}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <StatusBadge status={meeting.meetingType} map={typeMap} />
                    <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div className="detail-sections">

                    {/* Meeting Information */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <Calendar size={18} /> Meeting Information
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Date</span>
                                    <span className="info-value">{fmtDate(meeting.date)}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Time</span>
                                    <span className="info-value">{fmtTime(meeting.date) || '—'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Type</span>
                                    <span className="info-value">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {meeting.meetingType === 'Remote'
                                                ? <Video size={14} style={{ color: 'var(--text-muted)' }} />
                                                : <MapPin size={14} style={{ color: 'var(--text-muted)' }} />}
                                            {meeting.meetingType}
                                        </span>
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Location / Platform</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                                        {meeting.location || '—'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Organisation</span>
                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                        {company ? (
                                            <a onClick={() => navigate(`/companies/${company.id}`)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                                                {company.name}
                                            </a>
                                        ) : 'Internal / None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendees */}
                    <div className="card detail-section">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <Users size={18} /> Attendees
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">External Attendees</span>
                                    <span className="info-value">
                                        {externalAttendees.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {externalAttendees.map((name, i) => (
                                                    <span key={i} className="badge badge-neutral">{name}</span>
                                                ))}
                                            </div>
                                        ) : 'None'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">ATO Staff</span>
                                    <span className="info-value">
                                        {staffAttendees.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {staffAttendees.map((name, i) => (
                                                    <span key={i} className="badge badge-primary">{name}</span>
                                                ))}
                                            </div>
                                        ) : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agenda */}
                    {meeting.agenda && (
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <ClipboardList size={18} /> Agenda
                                </h3>
                            </div>
                            <div className="card-body">
                                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                                    {meeting.agenda}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {meeting.notes && (
                        <div className="card detail-section">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FileText size={18} /> Meeting Notes
                                </h3>
                            </div>
                            <div className="card-body">
                                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                                    {meeting.notes}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Items */}
                    {meeting.actionItems && (
                        <div className="card detail-section">
                            <div className="card-header" style={{ background: 'var(--primary-glow)' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--primary)' }}>
                                    <CheckCircle2 size={18} /> Action Items
                                </h3>
                            </div>
                            <div className="card-body" style={{ background: 'var(--primary-glow)' }}>
                                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                    {meeting.actionItems}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <EditMeetingModal
                    meeting={meeting}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditSave}
                    companies={state.companies}
                    contacts={contacts}
                    staff={staff}
                />
            )}
        </>
    );
}

function EditMeetingModal({ meeting, onClose, onSave, companies, contacts, staff }) {
    const [selectedContacts, setSelectedContacts] = useState(meeting.contactIds || []);
    const [selectedStaff, setSelectedStaff] = useState(meeting.attendeeStaffIds || []);
    const [companyId, setCompanyId] = useState(meeting.companyId || '');

    const companyContacts = companyId ? contacts.filter(c => c.companyId === companyId) : contacts;

    return (
        <Modal isOpen={true} onClose={onClose} title="Edit Meeting" size="lg">
            <form onSubmit={onSave}>
                <input type="hidden" name="contactIds" value={selectedContacts.join(',')} />
                <input type="hidden" name="attendeeStaffIds" value={selectedStaff.join(',')} />
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Meeting Title</label>
                        <input className="form-input" name="title" defaultValue={meeting.title} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date & Time</label>
                            <input className="form-input" name="date" type="datetime-local" defaultValue={meeting.date ? meeting.date.slice(0, 16) : ''} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" name="meetingType" defaultValue={meeting.meetingType || 'Remote'}>
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
                            <input className="form-input" name="location" defaultValue={meeting.location} />
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
                        <textarea className="form-textarea" name="agenda" defaultValue={meeting.agenda} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Meeting Notes</label>
                        <textarea className="form-textarea" name="notes" defaultValue={meeting.notes} rows={5} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Action Items</label>
                        <textarea className="form-textarea" name="actionItems" defaultValue={meeting.actionItems} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
}
