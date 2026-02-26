import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Plus, Search, Building2, User, Users, PoundSterling, X, ImagePlus, Trash2, UploadCloud, Loader2, GripVertical, Pencil, Check, MoreVertical } from 'lucide-react';
import * as api from '../lib/api';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import WorkshopModal from '../components/WorkshopModal';

// Stages are now loaded dynamically from DataContext

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#64748b',
];

function ColorSwatchPicker({ value, onChange }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESET_COLORS.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        border: value === c ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                        cursor: 'pointer', padding: 0, outline: 'none',
                        boxShadow: value === c ? '0 0 0 2px var(--bg-primary)' : 'none',
                        transition: 'transform 0.1s, border-color 0.15s',
                        transform: value === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                />
            ))}
        </div>
    );
}

export default function WorkshopTracker() {
    const navigate = useNavigate();
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [showStagesModal, setShowStagesModal] = useState(false);
    const [editingStageId, setEditingStageId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState('');
    const [newStageLabel, setNewStageLabel] = useState('');
    const [newStageColor, setNewStageColor] = useState('#6366f1');
    const [showAddForm, setShowAddForm] = useState(false);
    const [draggedStage, setDraggedStage] = useState(null);
    const [dragOverStageId, setDragOverStageId] = useState(null);

    // Pipeline state
    const allPipelines = (state.pipelines || []).filter(p => p.trackerType === 'workshop').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const [activePipelineId, setActivePipelineId] = useState(null);
    const [newPipelineName, setNewPipelineName] = useState('');
    const [showNewPipelineInput, setShowNewPipelineInput] = useState(false);
    const [pipelineMenuId, setPipelineMenuId] = useState(null);
    const [renamingPipelineId, setRenamingPipelineId] = useState(null);
    const [renamePipelineValue, setRenamePipelineValue] = useState('');

    // Select first pipeline if none selected
    const activePipeline = allPipelines.find(p => p.id === activePipelineId) || allPipelines[0] || null;
    const currentPipelineId = activePipeline?.id;

    const workshopStages = (state.workshopStages || []).filter(s => s.pipelineId === currentPipelineId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const stageKeys = workshopStages.map(s => s.name);

    const staff = state.staff || [];
    const companies = state.companies || [];
    const contacts = state.contacts || [];

    const workshops = (state.preventionSchedule || []).filter(w => {
        // Filter by pipeline
        if (w.pipelineId !== currentPipelineId) return false;
        const q = search.toLowerCase();
        const companyName = getCompanyName(w.companyId);
        const contactName = getContactName(w.contactId);
        return (
            (w.title || '').toLowerCase().includes(q) ||
            companyName.toLowerCase().includes(q) ||
            contactName.toLowerCase().includes(q)
        );
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

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

    // Normalise stage — if not found, use first stage or 'Initial Conversation'
    function getStage(w) {
        if (stageKeys.includes(w.status)) return w.status;
        return stageKeys[0] || 'Initial Conversation';
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

    // ─── Pipeline CRUD ─────────────────────────────────────
    const handleAddPipeline = async () => {
        const name = newPipelineName.trim();
        if (!name) return;
        await dispatch({
            type: ACTIONS.ADD_PIPELINE,
            payload: { name, trackerType: 'workshop', sortOrder: allPipelines.length }
        });
        setNewPipelineName('');
        setShowNewPipelineInput(false);
    };

    const handleRenamePipeline = async (id) => {
        const name = renamePipelineValue.trim();
        if (!name) return;
        await dispatch({ type: ACTIONS.UPDATE_PIPELINE, payload: { id, name } });
        setRenamingPipelineId(null);
        setRenamePipelineValue('');
    };

    const handleDeletePipeline = async (id) => {
        if (!confirm('Delete this pipeline and all its stages? Workshops in this pipeline will become unassigned.')) return;
        await dispatch({ type: ACTIONS.DELETE_PIPELINE, payload: id });
        setPipelineMenuId(null);
        if (activePipelineId === id) setActivePipelineId(null);
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
                    <button className="btn btn-secondary" onClick={() => setShowStagesModal(true)}>
                        Manage Stages
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal(null)}>
                        <Plus /> Add Workshop
                    </button>
                </div>
            </div>
            <div className="page-body page-body-kanban">
                {/* Pipeline Tabs */}
                <div className="tabs" style={{ marginBottom: 'var(--space-md)', flexShrink: 0 }}>
                    {allPipelines.map(p => (
                        <div key={p.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            {renamingPipelineId === p.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        className="form-input"
                                        value={renamePipelineValue}
                                        onChange={e => setRenamePipelineValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRenamePipeline(p.id); if (e.key === 'Escape') setRenamingPipelineId(null); }}
                                        autoFocus
                                        style={{ padding: '4px 8px', fontSize: 13, width: 140 }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={() => handleRenamePipeline(p.id)}><Check size={14} /></button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setRenamingPipelineId(null)}><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={`tab ${currentPipelineId === p.id ? 'active' : ''}`}
                                        onClick={() => setActivePipelineId(p.id)}
                                    >
                                        {p.name}
                                    </div>
                                    <button
                                        className="btn-icon-only"
                                        style={{ marginLeft: -4, opacity: 0.5 }}
                                        onClick={(e) => { e.stopPropagation(); setPipelineMenuId(pipelineMenuId === p.id ? null : p.id); }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                    {pipelineMenuId === p.id && (
                                        <div
                                            style={{
                                                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                                                padding: 'var(--space-xs)', minWidth: 140,
                                            }}
                                        >
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                                onClick={() => { setRenamingPipelineId(p.id); setRenamePipelineValue(p.name); setPipelineMenuId(null); }}
                                            >
                                                <Pencil size={13} /> Rename
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
                                                onClick={() => handleDeletePipeline(p.id)}
                                            >
                                                <Trash2 size={13} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                    {showNewPipelineInput ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                className="form-input"
                                placeholder="Pipeline name…"
                                value={newPipelineName}
                                onChange={e => setNewPipelineName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddPipeline(); if (e.key === 'Escape') { setShowNewPipelineInput(false); setNewPipelineName(''); } }}
                                autoFocus
                                style={{ padding: '4px 8px', fontSize: 13, width: 160 }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleAddPipeline} disabled={!newPipelineName.trim()}>Add</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewPipelineInput(false); setNewPipelineName(''); }}><X size={14} /></button>
                        </div>
                    ) : (
                        <button className="tab" style={{ opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowNewPipelineInput(true)}>
                            <Plus size={14} /> New Pipeline
                        </button>
                    )}
                </div>

                {currentPipelineId ? (
                    <>
                        {/* Desktop Kanban Board */}
                        <div className="kanban-board kanban-desktop">
                            {workshopStages.map(stage => {
                                const items = workshops.filter(w => getStage(w) === stage.name);
                                return (
                                    <div
                                        key={stage.id}
                                        className={`kanban-column${dragOverColumn === stage.name ? ' drag-over' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, stage.name)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, stage.name)}
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
                                                    onClick={() => navigate(`/workshops/${w.id}`)}
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
                            {workshopStages.length === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 14 }}>
                                    No stages yet — click "Manage Stages" to add columns
                                </div>
                            )}
                        </div>

                        {/* Mobile List View */}
                        <div className="kanban-mobile-list">
                            {workshopStages.map(stage => {
                                const items = workshops.filter(w => getStage(w) === stage.name);
                                if (items.length === 0) return null;
                                return (
                                    <div key={stage.id} style={{ marginBottom: 'var(--space-lg)' }}>
                                        <div className="kanban-mobile-section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{stage.label}</span>
                                            </div>
                                            <span className="kanban-count">{items.length}</span>
                                        </div>
                                        {items.map(w => (
                                            <div key={w.id} className="kanban-mobile-card" onClick={() => navigate(`/workshops/${w.id}`)}>
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
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 14 }}>
                        {allPipelines.length === 0 ? 'Create a pipeline to get started' : 'Select a pipeline'}
                    </div>
                )}
            </div>


            {/* Add/Edit Workshop Modal */}
            <WorkshopModal
                isOpen={showModal}
                onClose={closeModal}
                editItem={editItem}
                pipelineId={currentPipelineId}
            />

            {/* Manage Stages Modal */}
            <Modal
                isOpen={showStagesModal}
                onClose={() => { setShowStagesModal(false); setEditingStageId(null); setShowAddForm(false); }}
                title="Manage Workshop Stages"
                width={520}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Drag stages to reorder. Changes are saved automatically.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {workshopStages.map((stage) => (
                            <div
                                key={stage.id}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedStage(stage);
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', stage.id);
                                }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverStageId(stage.id); }}
                                onDragLeave={() => setDragOverStageId(null)}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    setDragOverStageId(null);
                                    if (!draggedStage || draggedStage.id === stage.id) return;
                                    const ordered = [...workshopStages];
                                    const fromIdx = ordered.findIndex(s => s.id === draggedStage.id);
                                    const toIdx = ordered.findIndex(s => s.id === stage.id);
                                    const [moved] = ordered.splice(fromIdx, 1);
                                    ordered.splice(toIdx, 0, moved);
                                    const updates = ordered.map((s, i) => ({ id: s.id, sortOrder: i }));
                                    // Optimistically update local state
                                    dispatch({ type: ACTIONS.SET_DATA, payload: { workshopStages: [...(state.workshopStages || []).filter(s => s.pipelineId !== currentPipelineId), ...ordered.map((s, i) => ({ ...s, sortOrder: i }))] }, _skipApi: true });
                                    await api.reorderWorkshopStages(updates);
                                    setDraggedStage(null);
                                }}
                                onDragEnd={() => { setDraggedStage(null); setDragOverStageId(null); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-secondary)',
                                    border: dragOverStageId === stage.id ? '2px dashed var(--primary)' : '2px solid transparent',
                                    cursor: 'grab', transition: 'border-color 0.15s, background 0.15s',
                                    opacity: draggedStage?.id === stage.id ? 0.5 : 1,
                                }}
                            >
                                <GripVertical size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

                                {editingStageId === stage.id ? (
                                    /* ── Inline Edit Mode ── */
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: editColor, flexShrink: 0, border: '2px solid var(--border)' }} />
                                            <input
                                                className="form-input"
                                                value={editLabel}
                                                onChange={e => setEditLabel(e.target.value)}
                                                autoFocus
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        await dispatch({ type: ACTIONS.UPDATE_WORKSHOP_STAGE, payload: { id: stage.id, label: editLabel, color: editColor } });
                                                        setEditingStageId(null);
                                                    }
                                                    if (e.key === 'Escape') setEditingStageId(null);
                                                }}
                                                style={{ flex: 1, fontSize: 13, padding: '4px 8px' }}
                                            />
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={async () => {
                                                    await dispatch({ type: ACTIONS.UPDATE_WORKSHOP_STAGE, payload: { id: stage.id, label: editLabel, color: editColor } });
                                                    setEditingStageId(null);
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingStageId(null)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <ColorSwatchPicker value={editColor} onChange={setEditColor} />
                                    </div>
                                ) : (
                                    /* ── Display Mode ── */
                                    <>
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: stage.color, flexShrink: 0, border: '2px solid var(--border)' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{stage.label}</div>
                                        </div>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 6px' }}
                                            onClick={(e) => { e.stopPropagation(); setEditingStageId(stage.id); setEditLabel(stage.label); setEditColor(stage.color.startsWith('#') ? stage.color : '#6366f1'); }}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 6px', color: 'var(--danger)' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await dispatch({ type: ACTIONS.DELETE_WORKSHOP_STAGE, payload: stage.id });
                                            }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Add New Stage Form ── */}
                    {showAddForm ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>New Stage</div>
                            <input
                                className="form-input"
                                placeholder="Stage name…"
                                value={newStageLabel}
                                onChange={e => setNewStageLabel(e.target.value)}
                                autoFocus
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && newStageLabel.trim()) {
                                        const name = newStageLabel.trim();
                                        await dispatch({
                                            type: ACTIONS.ADD_WORKSHOP_STAGE,
                                            payload: { name, label: name, color: newStageColor, sortOrder: workshopStages.length, pipelineId: currentPipelineId }
                                        });
                                        setNewStageLabel(''); setNewStageColor('#6366f1'); setShowAddForm(false);
                                    }
                                    if (e.key === 'Escape') { setShowAddForm(false); setNewStageLabel(''); }
                                }}
                                style={{ fontSize: 13 }}
                            />
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Pick a colour</div>
                            <ColorSwatchPicker value={newStageColor} onChange={setNewStageColor} />
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddForm(false); setNewStageLabel(''); }}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    disabled={!newStageLabel.trim()}
                                    onClick={async () => {
                                        const name = newStageLabel.trim();
                                        if (!name) return;
                                        await dispatch({
                                            type: ACTIONS.ADD_WORKSHOP_STAGE,
                                            payload: { name, label: name, color: newStageColor, sortOrder: workshopStages.length, pipelineId: currentPipelineId }
                                        });
                                        setNewStageLabel(''); setNewStageColor('#6366f1'); setShowAddForm(false);
                                    }}
                                >
                                    <Plus size={14} /> Add Stage
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowAddForm(true)} disabled={!currentPipelineId}>
                            <Plus size={16} /> Add New Stage
                        </button>
                    )}
                </div>
            </Modal>
        </>
    );
}
