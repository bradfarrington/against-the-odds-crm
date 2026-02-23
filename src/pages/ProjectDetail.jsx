import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import {
    ArrowLeft, FolderKanban, Edit2, Trash2, Plus, X,
    MapPin, Image, Users, CheckSquare, Square, Calendar,
    Building2, User, Upload
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

const statusMap = { Active: 'success', Completed: 'info', 'On Hold': 'warning', Planning: 'neutral' };
const typeMap = { Awareness: 'primary', Recovery: 'danger', Internal: 'neutral' };
const priorityMap = { High: 'danger', Medium: 'warning', Low: 'neutral' };

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useData();

    const project = (state.projects || []).find(p => p.id === id);
    const tasks = (state.tasks || []).filter(t => t.projectId === id);
    const allStaff = state.staff || [];

    // Edit project modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Directions inline edit
    const [editingDirections, setEditingDirections] = useState(false);
    const [directionsText, setDirectionsText] = useState('');

    // Image upload
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Tasks
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', priority: 'Medium', dueDate: '', assigneeId: '', assignedById: '' });

    // Staff
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');

    if (!project) {
        return (
            <div className="page-body">
                <div className="empty-state">
                    <FolderKanban />
                    <h3>Project not found</h3>
                    <p>This project may have been deleted</p>
                    <button className="btn btn-primary" onClick={() => navigate('/projects')} style={{ marginTop: 'var(--space-md)' }}>
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    const getCompanyName = (cid) => (state.companies || []).find(c => c.id === cid)?.name || '—';
    const getStaffName = (sid) => {
        const s = allStaff.find(m => m.id === sid);
        return s ? `${s.firstName} ${s.lastName}` : '—';
    };
    const getStaff = (sid) => allStaff.find(m => m.id === sid);

    const teamStaff = (project.staffIds || []).map(sid => getStaff(sid)).filter(Boolean);
    const availableStaff = allStaff.filter(s => !(project.staffIds || []).includes(s.id));

    // ── Handlers ──────────────────────────────────────────────

    const handleOpenEdit = () => {
        setEditForm({
            name: project.name,
            type: project.type || 'Awareness',
            status: project.status || 'Planning',
            companyId: project.companyId || '',
            leadId: project.leadId || '',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
            budget: project.budget || '',
            description: project.description || '',
            notes: project.notes || '',
            directions: project.directions || '',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id, ...editForm, budget: parseFloat(editForm.budget) || 0 } });
        setShowEditModal(false);
    };

    const handleDelete = () => {
        if (confirm('Delete this project? This cannot be undone.')) {
            dispatch({ type: ACTIONS.DELETE_PROJECT, payload: id });
            navigate('/projects');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadError('');
        // Show a local preview immediately while uploading
        const localPreview = URL.createObjectURL(file);
        dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id, imageUrl: localPreview } });
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error } = await supabase.storage.from('project-images').upload(path, file);
        if (error) {
            setUploadError('Upload failed. Make sure the "project-images" storage bucket exists in Supabase and is set to public.');
            dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id, imageUrl: project.imageUrl || '' } });
        } else {
            const { data } = supabase.storage.from('project-images').getPublicUrl(path);
            dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id, imageUrl: data.publicUrl } });
        }
        setUploading(false);
    };

    const handleSaveDirections = () => {
        dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id, directions: directionsText } });
        setEditingDirections(false);
    };

    const handleToggleTask = (task) => {
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        dispatch({ type: ACTIONS.UPDATE_TASK, payload: { ...task, status: newStatus } });
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_TASK, payload: { ...taskForm, projectId: id, status: 'To Do' } });
        setTaskForm({ title: '', priority: 'Medium', dueDate: '', assigneeId: '' });
        setShowTaskModal(false);
    };

    const handleDeleteTask = (taskId) => {
        dispatch({ type: ACTIONS.DELETE_TASK, payload: taskId });
    };

    const handleAddStaff = () => {
        if (!selectedStaffId) return;
        dispatch({ type: ACTIONS.ADD_PROJECT_STAFF, payload: { projectId: id, staffId: selectedStaffId } });
        setSelectedStaffId('');
        setShowAddStaff(false);
    };

    const handleRemoveStaff = (staffId) => {
        dispatch({ type: ACTIONS.REMOVE_PROJECT_STAFF, payload: { projectId: id, staffId } });
    };

    // ── Render ────────────────────────────────────────────────

    const doneTasks = tasks.filter(t => t.status === 'Done').length;

    return (
        <>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/projects')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FolderKanban size={22} style={{ color: 'var(--primary)' }} />
                            {project.name}
                        </h1>
                        <div className="page-header-subtitle">{project.type}</div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <StatusBadge status={project.status} map={statusMap} />
                    <button className="btn btn-secondary" onClick={handleOpenEdit}>
                        <Edit2 size={15} /> Edit
                    </button>
                    <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Page Body */}
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-lg)', alignItems: 'start' }}>

                    {/* ── Left column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* Overview */}
                        <div className="card">
                            <div className="card-header"><h3>Project Overview</h3></div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Start Date</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                            {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">End Date</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                            {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Budget</span>
                                        <span className="info-value">{project.budget ? `£${Number(project.budget).toLocaleString()}` : '—'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Type</span>
                                        <span className="info-value"><StatusBadge status={project.type} map={typeMap} /></span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Organisation</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                                            {getCompanyName(project.companyId)}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Project Lead</span>
                                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={14} style={{ color: 'var(--text-muted)' }} />
                                            {getStaffName(project.leadId)}
                                        </span>
                                    </div>
                                    {project.description && (
                                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Description</span>
                                            <span className="info-value" style={{ whiteSpace: 'pre-wrap' }}>{project.description}</span>
                                        </div>
                                    )}
                                    {project.notes && (
                                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Notes</span>
                                            <span className="info-value" style={{ whiteSpace: 'pre-wrap' }}>{project.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Directions */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <MapPin size={18} /> Directions
                                </h3>
                                {!editingDirections && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setDirectionsText(project.directions || ''); setEditingDirections(true); }}>
                                        <Edit2 size={14} /> Edit
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                {editingDirections ? (
                                    <div>
                                        <textarea
                                            className="form-textarea"
                                            value={directionsText}
                                            onChange={e => setDirectionsText(e.target.value)}
                                            placeholder="Add directions to the venue…"
                                            rows={4}
                                        />
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <button className="btn btn-primary btn-sm" onClick={handleSaveDirections}>Save</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingDirections(false)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: project.directions ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>
                                        {project.directions || 'No directions added yet. Click Edit to add directions to the venue.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tasks */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <CheckSquare size={18} /> Tasks
                                    <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{doneTasks}/{tasks.length}</span>
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}>
                                    <Plus size={14} /> Add Task
                                </button>
                            </div>

                            {tasks.length > 0 ? (
                                <div>
                                    {tasks.map(task => (
                                        <div
                                            key={task.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-sm)',
                                                padding: 'var(--space-sm) var(--space-md)',
                                                borderBottom: '1px solid var(--border)',
                                                opacity: task.status === 'Done' ? 0.6 : 1,
                                            }}
                                        >
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleToggleTask(task)}
                                                style={{ padding: 2, flexShrink: 0 }}
                                            >
                                                {task.status === 'Done'
                                                    ? <CheckSquare size={18} style={{ color: 'var(--success)' }} />
                                                    : <Square size={18} style={{ color: 'var(--text-muted)' }} />}
                                            </button>
                                            <span style={{
                                                flex: 1,
                                                textDecoration: task.status === 'Done' ? 'line-through' : 'none',
                                                color: 'var(--text-primary)',
                                                fontSize: 'var(--text-sm)',
                                            }}>
                                                {task.title}
                                            </span>
                                            <StatusBadge status={task.priority} map={priorityMap} />
                                            {task.dueDate && (
                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Calendar size={12} />
                                                    {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                            {task.assigneeId && (
                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    {getStaffName(task.assigneeId)}
                                                </span>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTask(task.id)} style={{ padding: 2, flexShrink: 0 }}>
                                                <X size={14} style={{ color: 'var(--text-muted)' }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                        <CheckSquare />
                                        <h3>No tasks yet</h3>
                                        <p>Add tasks to track work for this project</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* Project Image */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Image size={18} /> Project Image
                                </h3>
                            </div>
                            <div className="card-body" style={{ textAlign: 'center' }}>
                                {project.imageUrl ? (
                                    <img
                                        src={project.imageUrl}
                                        alt={project.name}
                                        style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', display: 'block' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%', height: 140, background: 'var(--bg-input)',
                                        borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', marginBottom: 'var(--space-md)',
                                        border: '2px dashed var(--border)', color: 'var(--text-muted)'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <Image size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                                            <div style={{ fontSize: 'var(--text-sm)' }}>No image uploaded</div>
                                        </div>
                                    </div>
                                )}
                                {uploadError && (
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', marginBottom: 'var(--space-sm)', textAlign: 'left' }}>
                                        {uploadError}
                                    </p>
                                )}
                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                    <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Image'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Users size={18} /> Team Members
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowAddStaff(v => !v)}>
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            {/* Add staff picker */}
                            {showAddStaff && (
                                <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <select
                                            className="form-select"
                                            value={selectedStaffId}
                                            onChange={e => setSelectedStaffId(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select a staff member…</option>
                                            {availableStaff.map(s => (
                                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.role}</option>
                                            ))}
                                        </select>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddStaff} disabled={!selectedStaffId}>Add</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddStaff(false); setSelectedStaffId(''); }}><X size={14} /></button>
                                    </div>
                                    {availableStaff.length === 0 && (
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>All staff are already on this project.</p>
                                    )}
                                </div>
                            )}

                            {teamStaff.length > 0 ? (
                                <div>
                                    {teamStaff.map(member => {
                                        const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
                                        return (
                                            <div
                                                key={member.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-sm)',
                                                    padding: 'var(--space-sm) var(--space-md)',
                                                    borderBottom: '1px solid var(--border)',
                                                }}
                                            >
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                                    background: 'linear-gradient(135deg, var(--primary), var(--info))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontWeight: 600, fontSize: 12,
                                                }}>
                                                    {initials}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {member.firstName} {member.lastName}
                                                    </div>
                                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {member.role || member.department || '—'}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleRemoveStaff(member.id)}
                                                    style={{ padding: 2, color: 'var(--text-muted)' }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="card-body">
                                    <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                                        <Users />
                                        <h3>No team members</h3>
                                        <p>Add staff working on this project</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            <Modal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setTaskForm({ title: '', priority: 'Medium', dueDate: '', assigneeId: '' }); }} title="Add Task">
                    <form onSubmit={handleAddTask}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Task Title *</label>
                                <input
                                    className="form-input"
                                    required
                                    autoFocus
                                    value={taskForm.title}
                                    onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="What needs to be done?"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assignee</label>
                                <select className="form-select" value={taskForm.assigneeId} onChange={e => setTaskForm(p => ({ ...p, assigneeId: e.target.value }))}>
                                    <option value="">Unassigned</option>
                                    {allStaff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowTaskModal(false); setTaskForm({ title: '', priority: 'Medium', dueDate: '', assigneeId: '' }); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Add Task</button>
                        </div>
                    </form>
                </Modal>

            {/* Edit Project Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project" size="lg">
                    <form onSubmit={handleEditSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Project Name *</label>
                                <input className="form-input" required value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" value={editForm.type || 'Awareness'} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                                        <option>Awareness</option><option>Recovery</option><option>Internal</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={editForm.status || 'Planning'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                        <option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Organisation</label>
                                    <select className="form-select" value={editForm.companyId || ''} onChange={e => setEditForm(p => ({ ...p, companyId: e.target.value }))}>
                                        <option value="">None (Internal)</option>
                                        {(state.companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Project Lead</label>
                                    <select className="form-select" value={editForm.leadId || ''} onChange={e => setEditForm(p => ({ ...p, leadId: e.target.value }))}>
                                        <option value="">Unassigned</option>
                                        {allStaff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input className="form-input" type="date" value={editForm.startDate || ''} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input className="form-input" type="date" value={editForm.endDate || ''} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Budget (£)</label>
                                <input className="form-input" type="number" value={editForm.budget || ''} onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={14} /> Directions
                                </label>
                                <textarea className="form-textarea" value={editForm.directions || ''} onChange={e => setEditForm(p => ({ ...p, directions: e.target.value }))} placeholder="How to get to the venue…" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </Modal>
        </>
    );
}
