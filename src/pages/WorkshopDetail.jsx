import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft, BookOpen, Building2, User, Users, MapPin, Calendar,
    PoundSterling, Edit2, Trash2, MessageSquare, FileText, Info, Clock, Send, Plus,
    UploadCloud, Loader2, X, Download, Check, Pencil, Receipt
} from 'lucide-react';
import WorkshopModal from '../components/WorkshopModal';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DateTimePicker from '../components/DateTimePicker';
import { supabase } from '../lib/supabaseClient';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';

export default function WorkshopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const invoiceSort = useTableSort();
    const [newNote, setNewNote] = useState('');
    const [newFeedback, setNewFeedback] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [editingNote, setEditingNote] = useState(null); // { id, text, type: 'note'|'feedback' }
    const fileInputRef = useRef(null);

    const workshop = (state.preventionSchedule || []).find(w => w.id === id);
    const companies = state.companies || [];
    const contacts = state.contacts || [];
    const staff = state.staff || [];
    const allWorkshopStages = state.workshopStages || [];
    const workshopInvoices = (state.invoices || []).filter(inv => inv.workshopId === id);

    if (!workshop) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <BookOpen />
                    <h3>Workshop not found</h3>
                    <p>This workshop may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/workshop-tracker')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Workshop Tracker
                    </button>
                </div>
            </div>
        );
    }

    const company = companies.find(c => c.id === workshop.companyId);
    const contact = contacts.find(c => c.id === workshop.contactId);
    const facilitator = staff.find(s => s.id === workshop.facilitatorId);
    const stageInfo = allWorkshopStages.find(s => s.name === workshop.status);

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this workshop? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_WORKSHOP, payload: workshop.id });
            navigate('/workshop-tracker');
        }
    };

    const value = parseFloat(workshop.value) || 0;

    const workshopNotes = workshop.workshopNotes || [];

    const fmtNoteDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : '';

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const currentStaff = staff.find(s => s.email === user?.email);
        const note = {
            id: crypto.randomUUID(),
            text: newNote.trim(),
            createdAt: new Date().toISOString(),
            userName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : (user?.email || 'Unknown'),
        };
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, workshopNotes: [...workshopNotes, note] } });
        setNewNote('');
    };

    const handleEditNote = (noteId, newText) => {
        const updated = workshopNotes.map(n => n.id === noteId ? { ...n, text: newText } : n);
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, workshopNotes: updated } });
        setEditingNote(null);
    };

    const handleDeleteNote = (noteId) => {
        const updated = workshopNotes.filter(n => n.id !== noteId);
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, workshopNotes: updated } });
    };

    const staffFeedback = workshop.staffFeedback || [];
    const feedbackDocs = workshop.feedbackDocs || [];

    const handleAddFeedback = () => {
        if (!newFeedback.trim()) return;
        const currentStaff = staff.find(s => s.email === user?.email);
        const entry = {
            id: crypto.randomUUID(),
            text: newFeedback.trim(),
            createdAt: new Date().toISOString(),
            userName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : (user?.email || 'Unknown'),
        };
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, staffFeedback: [...staffFeedback, entry] } });
        setNewFeedback('');
    };

    const handleEditFeedback = (fbId, newText) => {
        const updated = staffFeedback.map(f => f.id === fbId ? { ...f, text: newText } : f);
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, staffFeedback: updated } });
        setEditingNote(null);
    };

    const handleDeleteFeedback = (fbId) => {
        const updated = staffFeedback.filter(f => f.id !== fbId);
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, staffFeedback: updated } });
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        const newDocs = [...feedbackDocs];
        for (const file of files) {
            const ext = file.name.split('.').pop();
            const path = `feedback/${workshop.id}/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase.storage.from('workshop-images').upload(path, file);
            if (!error) {
                const { data: urlData } = supabase.storage.from('workshop-images').getPublicUrl(path);
                const currentStaff = staff.find(s => s.email === user?.email);
                newDocs.push({
                    id: crypto.randomUUID(),
                    name: file.name,
                    url: urlData.publicUrl,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : (user?.email || 'Unknown'),
                });
            }
        }
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, feedbackDocs: newDocs } });
        setUploading(false);
    };

    const handleRemoveDoc = (docId) => {
        dispatch({ type: ACTIONS.UPDATE_WORKSHOP, payload: { id: workshop.id, feedbackDocs: feedbackDocs.filter(d => d.id !== docId) } });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/workshop-tracker')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        {workshop.imageUrl && (
                            <img
                                src={workshop.imageUrl}
                                alt=""
                                style={{
                                    width: 56, height: 56, borderRadius: 'var(--radius-md)',
                                    objectFit: 'cover', border: '1px solid var(--border)',
                                    flexShrink: 0
                                }}
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}
                        <div>
                            <h1>{workshop.title}</h1>
                            <div className="page-header-subtitle" style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                {workshop.workshopType && <span className="badge badge-neutral">{workshop.workshopType}</span>}
                                {stageInfo && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                                        {stageInfo.label}
                                    </span>
                                )}
                                {company && <span>· {company.name}</span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={`tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Workshop Info</button>
                    <button className={`tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>Feedback</button>
                    <button className={`tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
                    <button className={`tab ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                        Invoices
                        {workshopInvoices.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{workshopInvoices.length}</span>}
                    </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="detail-sections">
                        {/* Stats + Cover Image Row */}
                        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'stretch' }}>
                            {/* Quick Stats (left) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1, minWidth: 0 }}>
                                <div className="stat-card" style={{ flex: 1 }}>
                                    <div className="stat-card-label">Value</div>
                                    <div className="stat-card-value">
                                        {value > 0 ? `£${value.toLocaleString()}` : '—'}
                                    </div>
                                </div>
                                <div className="stat-card" style={{ flex: 1 }}>
                                    <div className="stat-card-label">Attendees</div>
                                    <div className="stat-card-value">
                                        {workshop.attendeeCount ?? '—'}
                                        {workshop.maxCapacity ? ` / ${workshop.maxCapacity}` : ''}
                                    </div>
                                </div>
                                <div className="stat-card" style={{ flex: 1 }}>
                                    <div className="stat-card-label">Pipeline Stage</div>
                                    <div className="stat-card-value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {stageInfo ? (
                                            <>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: 16 }}>{stageInfo.label}</span>
                                            </>
                                        ) : (
                                            workshop.status || '—'
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image (right) */}
                            {workshop.imageUrl && (
                                <div className="card" style={{ flex: 2, minWidth: 0, padding: 0, overflow: 'hidden' }}>
                                    <img
                                        src={workshop.imageUrl}
                                        alt={workshop.title}
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            display: 'block',
                                        }}
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                </div>
                            )}
                        </div>
                        {/* Key Info + Organisation Row */}
                        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'stretch' }}>
                            <div className="card detail-section" style={{ flex: 2, minWidth: 0 }}>
                                <div className="card-header">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <BookOpen size={18} /> Workshop Details
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Type</span>
                                            <span className="info-value">
                                                {workshop.workshopType ? <span className="badge badge-neutral">{workshop.workshopType}</span> : '—'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Stage</span>
                                            <span className="info-value">
                                                {stageInfo ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                                                        {stageInfo.label}
                                                    </span>
                                                ) : (
                                                    workshop.status || '—'
                                                )}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Start Date</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> {fmtDate(workshop.date)}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">End Date</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> {fmtDate(workshop.endTime)}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Location</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {workshop.location || '—'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Assigned Member</span>
                                            <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Users size={14} style={{ color: 'var(--text-muted)' }} />
                                                {facilitator ? `${facilitator.firstName} ${facilitator.lastName}` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Organisation & Contact */}
                            {(company || contact) && (
                                <div className="card detail-section" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="card-header">
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Building2 size={18} /> Organisation & Contact
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        <div className="info-grid">
                                            {company && (
                                                <div className="info-item">
                                                    <span className="info-label">Organisation</span>
                                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <a
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); navigate(`/companies/${company.id}`); }}
                                                            style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                                        >
                                                            {company.name}
                                                        </a>
                                                    </span>
                                                </div>
                                            )}
                                            {contact && (
                                                <div className="info-item">
                                                    <span className="info-label">Contact</span>
                                                    <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <a
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); navigate(`/contacts/${contact.id}`); }}
                                                            style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                                        >
                                                            {contact.firstName} {contact.lastName}
                                                        </a>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Workshop Info Notes */}
                        {workshopNotes.length > 0 && (
                            <div className="card detail-section">
                                <div className="card-header">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FileText size={18} /> Workshop Info
                                        <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{workshopNotes.length}</span>
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                        {[...workshopNotes].reverse().slice(0, 3).map(note => (
                                            <div key={note.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{note.userName}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Clock size={11} />{fmtNoteDate(note.createdAt)}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                    {note.text}
                                                </p>
                                            </div>
                                        ))}
                                        {workshopNotes.length > 3 && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('info')} style={{ alignSelf: 'center' }}>
                                                View all {workshopNotes.length} notes
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Workshop Info Tab */}
                {activeTab === 'info' && (
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'stretch' }}>
                        <div className="card detail-section" style={{ flex: 1, minWidth: 0 }}>
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Info size={18} /> Full Workshop Details
                                </h3>
                            </div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Title</span>
                                        <span className="info-value">{workshop.title}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Type</span>
                                        <span className="info-value">
                                            {workshop.workshopType ? <span className="badge badge-neutral">{workshop.workshopType}</span> : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Pipeline Stage</span>
                                        <span className="info-value">
                                            {stageInfo ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageInfo.color, flexShrink: 0 }} />
                                                    {stageInfo.label}
                                                </span>
                                            ) : (
                                                workshop.status || '—'
                                            )}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Value</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <PoundSterling size={14} style={{ color: 'var(--text-muted)' }} />
                                            {value > 0 ? `£${value.toLocaleString()}` : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Start Date</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> {fmtDate(workshop.date)}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">End Date</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> {fmtDate(workshop.endTime)}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Location</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {workshop.location || '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Assigned Member</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Users size={14} style={{ color: 'var(--text-muted)' }} />
                                            {facilitator ? `${facilitator.firstName} ${facilitator.lastName}` : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Organisation</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                            {company ? (
                                                <a
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); navigate(`/companies/${company.id}`); }}
                                                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                                >
                                                    {company.name}
                                                </a>
                                            ) : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Contact</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={14} style={{ color: 'var(--text-muted)' }} />
                                            {contact ? (
                                                <a
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); navigate(`/contacts/${contact.id}`); }}
                                                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                                >
                                                    {contact.firstName} {contact.lastName}
                                                </a>
                                            ) : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Attendee Count</span>
                                        <span className="info-value">{workshop.attendeeCount ?? '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workshop Info Notes Timeline */}
                        <div className="card detail-section" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FileText size={18} /> Workshop Info
                                    {workshopNotes.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{workshopNotes.length}</span>}
                                </h3>
                            </div>
                            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Add Note */}
                                <div style={{ marginBottom: workshopNotes.length > 0 ? 'var(--space-lg)' : 0 }}>
                                    <textarea
                                        className="form-textarea"
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder="Add a note…"
                                        style={{ width: '100%', minHeight: 60, marginBottom: 'var(--space-sm)' }}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAddNote(); } }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                                            <Plus size={14} /> Add Note
                                        </button>
                                    </div>
                                </div>

                                {/* Notes Timeline */}
                                {workshopNotes.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1, overflowY: 'auto' }}>
                                        {[...workshopNotes].reverse().map(note => (
                                            <div key={note.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{note.userName}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={11} />{fmtNoteDate(note.createdAt)}
                                                        </span>
                                                        {editingNote?.id !== note.id && (
                                                            <>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote({ id: note.id, text: note.text, type: 'note' })} style={{ padding: 2 }}>
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteNote(note.id)} style={{ padding: 2, color: 'var(--danger)' }}>
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingNote?.id === note.id ? (
                                                    <div>
                                                        <textarea
                                                            className="form-textarea"
                                                            value={editingNote.text}
                                                            onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
                                                            style={{ width: '100%', minHeight: 60, marginBottom: 'var(--space-sm)' }}
                                                            autoFocus
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
                                                            <button className="btn btn-primary btn-sm" onClick={() => handleEditNote(note.id, editingNote.text)} disabled={!editingNote.text.trim()}>
                                                                <Check size={14} /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                        {note.text}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText />
                                        <h3>No notes yet</h3>
                                        <p>Add workshop info notes above</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Feedback Tab */}
                {activeTab === 'feedback' && (
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'stretch' }}>
                        {/* Staff Feedback */}
                        <div className="card" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <MessageSquare size={18} /> Staff Feedback
                                    {staffFeedback.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{staffFeedback.length}</span>}
                                </h3>
                            </div>
                            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                                {/* Add feedback note */}
                                <div>
                                    <textarea
                                        className="form-textarea"
                                        value={newFeedback}
                                        onChange={e => setNewFeedback(e.target.value)}
                                        placeholder="Add staff feedback…"
                                        style={{ width: '100%', minHeight: 60, marginBottom: 'var(--space-sm)' }}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAddFeedback(); } }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddFeedback} disabled={!newFeedback.trim()}>
                                            <Plus size={14} /> Add Feedback
                                        </button>
                                    </div>
                                </div>

                                {/* Feedback notes timeline */}
                                {staffFeedback.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                        {[...staffFeedback].reverse().map(fb => (
                                            <div key={fb.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fb.userName}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={11} />{fmtNoteDate(fb.createdAt)}
                                                        </span>
                                                        {editingNote?.id !== fb.id && (
                                                            <>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote({ id: fb.id, text: fb.text, type: 'feedback' })} style={{ padding: 2 }}>
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteFeedback(fb.id)} style={{ padding: 2, color: 'var(--danger)' }}>
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingNote?.id === fb.id ? (
                                                    <div>
                                                        <textarea
                                                            className="form-textarea"
                                                            value={editingNote.text}
                                                            onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
                                                            style={{ width: '100%', minHeight: 60, marginBottom: 'var(--space-sm)' }}
                                                            autoFocus
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
                                                            <button className="btn btn-primary btn-sm" onClick={() => handleEditFeedback(fb.id, editingNote.text)} disabled={!editingNote.text.trim()}>
                                                                <Check size={14} /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                        {fb.text}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Document upload */}
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>Documents</div>
                                    <div
                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            padding: 'var(--space-lg)',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: dragOver ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                                            transition: 'all 0.2s',
                                            marginBottom: feedbackDocs.length > 0 ? 'var(--space-md)' : 0,
                                        }}
                                    >
                                        {uploading ? (
                                            <Loader2 size={24} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <>
                                                <UploadCloud size={24} style={{ color: 'var(--text-muted)', marginBottom: 4 }} />
                                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Drag & drop files or click to upload</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={e => handleFileUpload(e.target.files)}
                                    />

                                    {/* Uploaded docs list */}
                                    {feedbackDocs.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                            {feedbackDocs.map(doc => (
                                                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                                    <FileText size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.uploadedBy} · {fmtNoteDate(doc.uploadedAt)}</div>
                                                    </div>
                                                    <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                                                        <Download size={14} />
                                                    </a>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveDoc(doc.id)} style={{ padding: 4, color: 'var(--danger)' }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Student Feedback */}
                        <div className="card" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Users size={18} /> Student Feedback
                                </h3>
                            </div>
                            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <Users />
                                    <h3>Coming Soon</h3>
                                    <p>Student feedback will appear here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FileText size={18} /> Documents
                                </h3>
                            </div>
                            <div className="card-body">
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <FileText />
                                    <h3>No documents yet</h3>
                                    <p>Documents for this workshop will appear here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                    <div className="detail-sections">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Receipt size={18} /> Invoices
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{workshopInvoices.length}</span>
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowInvoiceModal(true)}>
                                    <Plus size={16} /> New Invoice
                                </button>
                            </div>
                            {workshopInvoices.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortableHeader label="Invoice #" sortKey="invoiceNumber" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Description" sortKey="description" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Amount" sortKey="amount" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Status" sortKey="status" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Issued" sortKey="dateIssued" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                                <SortableHeader label="Due" sortKey="dateDue" sortConfig={invoiceSort.sortConfig} onSort={invoiceSort.requestSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceSort.sortedData(workshopInvoices, {
                                                dateIssued: inv => inv.dateIssued ? new Date(inv.dateIssued) : null,
                                                dateDue: inv => inv.dateDue ? new Date(inv.dateDue) : null,
                                            }).map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="table-cell-main">{inv.invoiceNumber}</td>
                                                    <td className="table-cell-secondary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {inv.description || '—'}
                                                    </td>
                                                    <td className="table-cell-main">£{(inv.amount || 0).toLocaleString()}</td>
                                                    <td><StatusBadge status={inv.status} /></td>
                                                    <td className="table-cell-secondary">{inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                                    <td className="table-cell-secondary">{inv.dateDue ? new Date(inv.dateDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <Receipt />
                                        <h3>No invoices found</h3>
                                        <p>No invoices are linked to this workshop</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="New Invoice">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const data = Object.fromEntries(fd);
                    data.amount = parseFloat(data.amount) || 0;
                    if (!data.dateIssued) data.dateIssued = null;
                    if (!data.dateDue) data.dateDue = null;
                    if (!data.datePaid) data.datePaid = null;
                    data.category = 'Prevention';
                    data.workshopId = id;
                    if (!data.contactId) data.contactId = null;
                    dispatch({ type: ACTIONS.ADD_INVOICE, payload: data });
                    setShowInvoiceModal(false);
                }}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Invoice Number</label>
                                <input className="form-input" name="invoiceNumber" defaultValue={`ATO-2026-${String((state.invoices || []).length + 1).padStart(3, '0')}`} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" name="status" defaultValue="Draft">
                                    <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Organisation</label>
                                <select className="form-select" name="companyId" defaultValue={workshop?.companyId || ''} required>
                                    <option value="">Select…</option>
                                    {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (£)</label>
                                <input className="form-input" name="amount" type="number" required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" name="description" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Link to Workshop</label>
                            <select className="form-select" name="workshopId" defaultValue={id} disabled>
                                <option value={id}>{workshop?.title}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact</label>
                            <select className="form-select" name="contactId" defaultValue="">
                                <option value="">None</option>
                                {(state.contacts || []).map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Date Issued</label>
                                <DateTimePicker name="dateIssued" mode="date" value="" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date Due</label>
                                <DateTimePicker name="dateDue" mode="date" value="" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date Paid</label>
                            <DateTimePicker name="datePaid" mode="date" value="" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-textarea" name="notes" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create Invoice</button>
                    </div>
                </form>
            </Modal>

            {/* Edit Workshop Modal */}
            <WorkshopModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                editItem={workshop}
                pipelineId={workshop.pipelineId}
            />
        </>
    );
}
