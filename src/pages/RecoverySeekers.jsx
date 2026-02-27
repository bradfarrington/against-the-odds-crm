import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    HeartHandshake, Plus, User,
    Search, Trash2, Edit2, Settings2, GripVertical, X, Pencil, Check, MoreVertical
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import RecoverySeekerModal from '../components/RecoverySeekerModal';
import ColorSwatchPicker from '../components/ColorSwatchPicker';
import * as api from '../lib/api';

export default function RecoverySeekers() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    // Pipeline state
    const allPipelines = (state.pipelines || []).filter(p => p.trackerType === 'treatment').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const [activePipelineId, setActivePipelineId] = useState(null);
    const [newPipelineName, setNewPipelineName] = useState('');
    const [showNewPipelineInput, setShowNewPipelineInput] = useState(false);
    const [pipelineMenuId, setPipelineMenuId] = useState(null);
    const [renamingPipelineId, setRenamingPipelineId] = useState(null);
    const [renamePipelineValue, setRenamePipelineValue] = useState('');

    // Stage management
    const [showStageModal, setShowStageModal] = useState(false);
    const [editingStageId, setEditingStageId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState('');
    const [newStageLabel, setNewStageLabel] = useState('');
    const [newStageColor, setNewStageColor] = useState('#6366f1');
    const [showAddStageForm, setShowAddStageForm] = useState(false);
    const [draggedStage, setDraggedStage] = useState(null);
    const [dragOverStageId, setDragOverStageId] = useState(null);

    // Select first pipeline if none selected
    const activePipeline = allPipelines.find(p => p.id === activePipelineId) || allPipelines[0] || null;
    const currentPipelineId = activePipeline?.id;

    const currentStages = (state.workshopStages || []).filter(s => s.pipelineId === currentPipelineId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const stageKeys = currentStages.map(s => s.name);

    // Drag & Drop state for kanban
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    const getRiskColor = (level) => {
        if (level === 'High') return 'var(--danger)';
        if (level === 'Medium') return 'var(--warning)';
        return 'var(--success)';
    };

    function getStage(s) {
        if (stageKeys.includes(s.status)) return s.status;
        return stageKeys[0] || '';
    }

    const filtered = (state.recoverySeekers || []).filter(s => {
        // Filter by pipeline
        if (s.pipelineId !== currentPipelineId) return false;
        const matchesSearch = (
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.referralSource?.toLowerCase().includes(search.toLowerCase())
        );
        return matchesSearch;
    });

    // ─── Kanban Drag & Drop ──────────────────────────────────
    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        requestAnimationFrame(() => e.target.classList.add('dragging'));
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
        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null);
    };
    const handleDrop = (e, stageKey) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedItem && draggedItem.status !== stageKey) {
            dispatch({ type: ACTIONS.UPDATE_SEEKER, payload: { id: draggedItem.id, status: stageKey } });
        }
        setDraggedItem(null);
    };

    // ─── Pipeline CRUD ─────────────────────────────────────
    const handleAddPipeline = async () => {
        const name = newPipelineName.trim();
        if (!name) return;
        await dispatch({
            type: ACTIONS.ADD_PIPELINE,
            payload: { name, trackerType: 'treatment', sortOrder: allPipelines.length }
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
        if (!confirm('Delete this pipeline and all its stages? Seekers in this pipeline will become unassigned.')) return;
        await dispatch({ type: ACTIONS.DELETE_PIPELINE, payload: id });
        setPipelineMenuId(null);
        if (activePipelineId === id) setActivePipelineId(null);
    };

    const openModal = (item) => {
        setEditItem(item);
        setShowModal(true);
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Treatment Tracker</h1>
                    <div className="page-header-subtitle">Manage recovery seekers and active treatment pipelines</div>
                </div>
                <div className="page-header-actions">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search names..." />
                    <button className="btn btn-secondary" onClick={() => setShowStageModal(true)}>
                        <Settings2 size={16} /> Edit Stages
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal(null)}>
                        <Plus size={16} /> New Intake
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
                            {currentStages.map(stage => {
                                const items = filtered.filter(s => getStage(s) === stage.name);
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
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{stage.label}</span>
                                            </div>
                                            <span className="kanban-count">{items.length}</span>
                                        </div>
                                        <div className="kanban-column-body">
                                            {items.map(s => (
                                                <div
                                                    key={s.id}
                                                    className="kanban-card"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, s)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => navigate(`/recovery-seekers/${s.id}`)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                            <div style={{
                                                                width: 32, height: 32, borderRadius: 'var(--radius-full)',
                                                                background: `${getRiskColor(s.riskLevel)}18`,
                                                                color: getRiskColor(s.riskLevel),
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                            }}>
                                                                <User size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="kanban-card-title" style={{ marginBottom: 2 }}>{s.firstName} {s.lastName}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.gender || 'Unknown'} · {s.dateOfBirth || 'No DOB'}</div>
                                                            </div>
                                                        </div>
                                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openModal(s); }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div style={{ marginTop: 'var(--space-sm)', fontSize: 12 }}>
                                                        {s.referralSource && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ color: 'var(--text-muted)' }}>Referral:</span>
                                                                <span style={{ fontWeight: 500 }}>{s.referralSource}</span>
                                                            </div>
                                                        )}
                                                        {s.gamblingType && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                                                                <span style={{ fontWeight: 500, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.gamblingType}</span>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${getRiskColor(s.riskLevel)}22`, color: getRiskColor(s.riskLevel), fontSize: 11, fontWeight: 600 }}>
                                                                {s.riskLevel} Risk
                                                            </span>
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <HeartHandshake size={12} /> {s.coachingSessions?.length || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {items.length === 0 && (
                                                <div className="kanban-empty">Drop records here</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {currentStages.length === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 14 }}>
                                    No stages yet — click "Edit Stages" to add columns
                                </div>
                            )}
                        </div>

                        {/* Mobile List View */}
                        <div className="kanban-mobile-list">
                            {currentStages.map(stage => {
                                const items = filtered.filter(s => getStage(s) === stage.name);
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
                                        {items.map(s => (
                                            <div key={s.id} className="kanban-mobile-card" onClick={() => navigate(`/recovery-seekers/${s.id}`)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.firstName} {s.lastName}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.gender || 'Unknown'} · {s.dateOfBirth || 'No DOB'}</div>
                                                    </div>
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${getRiskColor(s.riskLevel)}22`, color: getRiskColor(s.riskLevel), fontSize: 11, fontWeight: 600 }}>
                                                        {s.riskLevel} Risk
                                                    </span>
                                                </div>
                                                {s.referralSource && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                                                        Referral: <strong>{s.referralSource}</strong>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <HeartHandshake size={11} /> {s.coachingSessions?.length || 0} sessions
                                                    </span>
                                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openModal(s); }}>
                                                        <Edit2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            {filtered.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No records found</div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 14 }}>
                        {allPipelines.length === 0 ? 'Create a pipeline to get started' : 'Select a pipeline'}
                    </div>
                )}
            </div>

            {/* Stages Modal */}
            <Modal isOpen={showStageModal} onClose={() => { setShowStageModal(false); setEditingStageId(null); setShowAddStageForm(false); }} title={`Edit ${activePipeline?.name || ''} Stages`} width={520}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 'var(--space-sm)' }}>Drag stages to reorder. Changes are saved automatically.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {currentStages.map((stage) => (
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
                                    const ordered = [...currentStages];
                                    const fromIdx = ordered.findIndex(s => s.id === draggedStage.id);
                                    const toIdx = ordered.findIndex(s => s.id === stage.id);
                                    const [moved] = ordered.splice(fromIdx, 1);
                                    ordered.splice(toIdx, 0, moved);
                                    const updates = ordered.map((s, i) => ({ id: s.id, sortOrder: i }));
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
                                                        await dispatch({ type: ACTIONS.UPDATE_WORKSHOP_STAGE, payload: { id: stage.id, label: editLabel, name: editLabel, color: editColor } });
                                                        setEditingStageId(null);
                                                    }
                                                    if (e.key === 'Escape') setEditingStageId(null);
                                                }}
                                                style={{ flex: 1, fontSize: 13, padding: '4px 8px' }}
                                            />
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={async () => {
                                                    await dispatch({ type: ACTIONS.UPDATE_WORKSHOP_STAGE, payload: { id: stage.id, label: editLabel, name: editLabel, color: editColor } });
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
                                    <>
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: stage.color, flexShrink: 0, border: '2px solid var(--border)' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{stage.label}</div>
                                        </div>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 6px' }}
                                            onClick={(e) => { e.stopPropagation(); setEditingStageId(stage.id); setEditLabel(stage.label); setEditColor(stage.color?.startsWith('#') ? stage.color : '#6366f1'); }}
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

                    {showAddStageForm ? (
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
                                            payload: { name, label: name, color: newStageColor, sortOrder: currentStages.length, pipelineId: currentPipelineId }
                                        });
                                        setNewStageLabel(''); setNewStageColor('#6366f1'); setShowAddStageForm(false);
                                    }
                                    if (e.key === 'Escape') { setShowAddStageForm(false); setNewStageLabel(''); }
                                }}
                                style={{ fontSize: 13 }}
                            />
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Pick a colour</div>
                            <ColorSwatchPicker value={newStageColor} onChange={setNewStageColor} />
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddStageForm(false); setNewStageLabel(''); }}>Cancel</button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    disabled={!newStageLabel.trim()}
                                    onClick={async () => {
                                        const name = newStageLabel.trim();
                                        if (!name) return;
                                        await dispatch({
                                            type: ACTIONS.ADD_WORKSHOP_STAGE,
                                            payload: { name, label: name, color: newStageColor, sortOrder: currentStages.length, pipelineId: currentPipelineId }
                                        });
                                        setNewStageLabel(''); setNewStageColor('#6366f1'); setShowAddStageForm(false);
                                    }}
                                >
                                    <Plus size={14} /> Add Stage
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowAddStageForm(true)} disabled={!currentPipelineId}>
                            <Plus size={16} /> Add New Stage
                        </button>
                    )}
                </div>
            </Modal>

            <RecoverySeekerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                item={editItem}
                pipelineId={currentPipelineId}
            />
        </>
    );
}
