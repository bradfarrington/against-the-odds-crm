import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Building2, User, Users, PoundSterling, X, ImagePlus, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import WorkshopModal from '../components/WorkshopModal';

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

    // ─── CRUD ──────────────────────────────────────────────
    const openModal = (item) => {
        setEditItem(item);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
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
                {/* Desktop Kanban Board */}
                <div className="kanban-board kanban-desktop" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(240px, 1fr))` }}>
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

                {/* Mobile List View */}
                <div className="kanban-mobile-list">
                    {STAGES.map(stage => {
                        const items = workshops.filter(w => getStage(w) === stage.key);
                        if (items.length === 0) return null;
                        return (
                            <div key={stage.key} style={{ marginBottom: 'var(--space-lg)' }}>
                                <div className="kanban-mobile-section-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{stage.label}</span>
                                    </div>
                                    <span className="kanban-count">{items.length}</span>
                                </div>
                                {items.map(w => (
                                    <div key={w.id} className="kanban-mobile-card" onClick={() => openModal(w)}>
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{w.title}</div>
                                        {getCompanyName(w.companyId) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                                                <Building2 style={{ width: 11, height: 11 }} />{getCompanyName(w.companyId)}
                                            </div>
                                        )}
                                        {getContactName(w.contactId) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                                                <User style={{ width: 11, height: 11 }} />{getContactName(w.contactId)}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                                <Users style={{ width: 11, height: 11 }} />{getStaffName(w.facilitatorId)}
                                            </span>
                                            {w.value && (
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <PoundSterling style={{ width: 11, height: 11 }} />{parseFloat(w.value).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {workshops.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No workshops found</div>
                    )}
                </div>
            </div>


            {/* Add/Edit Workshop Modal */}
            <WorkshopModal
                isOpen={showModal}
                onClose={closeModal}
                editItem={editItem}
            />
        </>
    );
}
