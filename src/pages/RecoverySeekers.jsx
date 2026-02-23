import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    HeartHandshake, Plus, AlertTriangle, User,
    Search, Trash2, Edit2, Settings2, GripVertical
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import RecoverySeekerModal from '../components/RecoverySeekerModal';

const DEFAULT_PIPELINES = {
    enquiries: [
        { key: 'New Enquiry', label: 'New Enquiry', color: 'var(--primary)' },
        { key: 'Contacted', label: 'Contacted', color: 'var(--warning)' },
        { key: 'Assessment Booked', label: 'Assessment Booked', color: '#a855f7' },
        { key: 'Lost', label: 'Lost', color: 'var(--text-muted)' }
    ],
    active: [
        { key: 'Active', label: 'Awaiting Start', color: '#6366f1' },
        { key: 'In Treatment', label: 'In Treatment', color: 'var(--primary)' },
        { key: 'On Hold', label: 'On Hold', color: 'var(--warning)' },
        { key: 'Completed', label: 'Completed', color: 'var(--success)' },
        { key: 'Dropped Out', label: 'Dropped Out', color: 'var(--danger)' }
    ]
};

export default function RecoverySeekers() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('enquiries');
    const [pipelines, setPipelines] = useState(DEFAULT_PIPELINES);
    const [showModal, setShowModal] = useState(false);
    const [showStageModal, setShowStageModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    // Form state
    const [form, setForm] = useState({
        firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '', address: '',
        gender: '', referralSource: '', status: 'New Enquiry', riskLevel: 'Medium',
        gamblingType: '', gamblingFrequency: '', gamblingDuration: '', gamblingTriggers: '',
        notes: '',
    });

    // Drag & Drop Kanban state
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    // Load pipelines from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ato-treatment-pipelines');
        if (saved) {
            try {
                setPipelines(JSON.parse(saved));
            } catch (e) { console.error(e); }
        }
    }, []);

    const savePipelines = (newPipelines) => {
        setPipelines(newPipelines);
        localStorage.setItem('ato-treatment-pipelines', JSON.stringify(newPipelines));
    };

    const currentStages = pipelines[activeTab] || [];
    const stageKeys = currentStages.map(s => s.key);

    const getRiskColor = (level) => {
        if (level === 'High') return 'var(--danger)';
        if (level === 'Medium') return 'var(--warning)';
        return 'var(--success)';
    };

    function getStage(s) {
        if (stageKeys.includes(s.status)) return s.status;
        // Default mapping if they change tabs or have old data
        if (activeTab === 'enquiries') return stageKeys[0];
        if (activeTab === 'active') {
            if (s.status === 'Completed') return 'Completed';
            if (s.status === 'On Hold') return 'On Hold';
            return stageKeys[0];
        }
        return stageKeys[0];
    }

    const filtered = state.recoverySeekers.filter(s => {
        const matchesSearch = (
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.referralSource?.toLowerCase().includes(search.toLowerCase())
        );
        // Only show seekers belonging to the current pipeline's stages, OR unassigned ones go to first stage.
        // But wait, we want ALL seekers to be partitioned into either Enquiries or Active.
        // Let's establish that if 'status' matches any Active key, it's Active, else it's Enquiry.
        let isEnquiry = pipelines.enquiries.some(stage => stage.key === s.status) || !pipelines.active.some(stage => stage.key === s.status);
        if (s.status === 'Completed' || s.status === 'On Hold' || s.status === 'Active') isEnquiry = false;

        const matchesTab = activeTab === 'enquiries' ? isEnquiry : !isEnquiry;
        return matchesSearch && matchesTab;
    });

    // ─── Drag & Drop ──────────────────────────────────────
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

    // ─── Editable Stages ──────────────────────────────────────
    const [editingStages, setEditingStages] = useState([]);

    const openStageModal = () => {
        setEditingStages([...currentStages]);
        setShowStageModal(true);
    };

    const handleSaveStages = () => {
        // Ensure no empty keys
        const validStages = editingStages.filter(s => s.key && s.label);
        savePipelines({
            ...pipelines,
            [activeTab]: validStages
        });
        setShowStageModal(false);
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
                    <button className="btn btn-secondary" onClick={openStageModal}>
                        <Settings2 size={16} /> Edit Stages
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal(null)}>
                        <Plus size={16} /> New Intake
                    </button>
                </div>
            </div>

            <div className="tabs" style={{ marginBottom: 'var(--space-md)' }}>
                <div className={`tab ${activeTab === 'enquiries' ? 'active' : ''}`} onClick={() => setActiveTab('enquiries')}>
                    Enquiries Pipeline
                </div>
                <div className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
                    Active Treatment Clients
                </div>
            </div>

            <div className="page-body">
                <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${currentStages.length}, minmax(280px, 1fr))` }}>
                    {currentStages.map(stage => {
                        const items = filtered.filter(s => getStage(s) === stage.key);
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
                </div>
            </div>

            {/* Stages Modal */}
            <Modal isOpen={showStageModal} onClose={() => setShowStageModal(false)} title={`Edit ${activeTab === 'enquiries' ? 'Enquiries' : 'Active'} Stages`}>
                <div className="modal-body">
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Customise the columns for this pipeline. Note: changing an existing Stage Key will remove existing candidates from that column, so usually you only want to change the Label or add new ones.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {editingStages.map((stage, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', background: 'var(--bg-elevated)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <GripVertical size={16} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                                <div style={{ flex: 1, display: 'flex', gap: 'var(--space-sm)' }}>
                                    <input
                                        className="form-input"
                                        placeholder="Stage Key (Internal)"
                                        value={stage.key}
                                        onChange={e => {
                                            const newStages = [...editingStages];
                                            newStages[idx].key = e.target.value;
                                            setEditingStages(newStages);
                                        }}
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="Display Label"
                                        value={stage.label}
                                        onChange={e => {
                                            const newStages = [...editingStages];
                                            newStages[idx].label = e.target.value;
                                            setEditingStages(newStages);
                                        }}
                                    />
                                    <input
                                        type="color"
                                        value={stage.color.startsWith('var(') ? '#6366f1' : stage.color}
                                        style={{ width: 40, height: 38, padding: 0, border: 'none', background: 'none' }}
                                        onChange={e => {
                                            const newStages = [...editingStages];
                                            newStages[idx].color = e.target.value;
                                            setEditingStages(newStages);
                                        }}
                                    />
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => {
                                    setEditingStages(editingStages.filter((_, i) => i !== idx));
                                }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-secondary" style={{ marginTop: 'var(--space-md)' }} onClick={() => {
                        setEditingStages([...editingStages, { key: 'New Stage', label: 'New Stage', color: '#6366f1' }]);
                    }}>
                        <Plus size={16} /> Add Stage
                    </button>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowStageModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveStages}>Save Stages</button>
                </div>
            </Modal>

            <RecoverySeekerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                item={editItem}
            />
        </>
    );
}
