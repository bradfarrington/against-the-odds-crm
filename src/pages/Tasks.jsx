import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, X, LayoutList, Columns3 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { 'To Do': 'neutral', 'In Progress': 'info', Done: 'success' };
const priorityMap = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' };
const priorityIcons = { Low: null, Medium: null, High: <AlertTriangle style={{ width: 12, height: 12 }} />, Urgent: <AlertTriangle style={{ width: 12, height: 12 }} /> };

export default function Tasks() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [viewMode, setViewMode] = useState('list');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const tasks = (state.tasks || []).filter(t => {
        const q = search.toLowerCase();
        const matchesSearch = t.title.toLowerCase().includes(q);
        const matchesAssignee = filterAssignee === 'All' || t.assigneeId === filterAssignee;
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        return matchesSearch && matchesAssignee && matchesStatus;
    });

    const staff = state.staff || [];
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : '—'; };
    const getProjectName = (id) => (state.projects || []).find(p => p.id === id)?.name || '—';

    const isOverdue = (t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date();

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (!data.projectId) data.projectId = null;
        if (!data.assigneeId) data.assigneeId = null;
        if (!data.assignedById) data.assignedById = null;
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_TASK, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_TASK, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const toggleStatus = (task, e) => {
        e.stopPropagation();
        const next = task.status === 'To Do' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'To Do';
        dispatch({ type: ACTIONS.UPDATE_TASK, payload: { id: task.id, status: next } });
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) dispatch({ type: ACTIONS.DELETE_TASK, payload: id });
    };

    const kanbanColumns = ['To Do', 'In Progress', 'Done'];

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Tasks</h1>
                    <div className="page-header-subtitle">{tasks.filter(t => t.status !== 'Done').length} open · {tasks.filter(t => t.status === 'Done').length} completed</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 150 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                        <option value="All">All Team</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button className={`btn btn-ghost btn-sm ${viewMode === 'list' ? 'active' : ''}`} style={viewMode === 'list' ? { background: 'var(--primary-glow)', color: 'var(--primary)' } : {}} onClick={() => setViewMode('list')}><LayoutList style={{ width: 16, height: 16 }} /></button>
                        <button className={`btn btn-ghost btn-sm ${viewMode === 'kanban' ? 'active' : ''}`} style={viewMode === 'kanban' ? { background: 'var(--primary-glow)', color: 'var(--primary)' } : {}} onClick={() => setViewMode('kanban')}><Columns3 style={{ width: 16, height: 16 }} /></button>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Task
                    </button>
                </div>
            </div>
            <div className="page-body">
                {viewMode === 'list' ? (
                    <div className="card">
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }}></th>
                                        <th>Task</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Assigned To</th>
                                        <th>Assigned By</th>
                                        <th>Project</th>
                                        <th>Due Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.sort((a, b) => {
                                        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
                                        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
                                    }).map(t => (
                                        <tr key={t.id} onClick={() => { setEditItem(t); setShowModal(true); }} style={isOverdue(t) ? { borderLeft: '3px solid var(--danger)' } : {}}>
                                            <td onClick={e => toggleStatus(t, e)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                                {t.status === 'Done' ? <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--success)' }} /> : t.status === 'In Progress' ? <Clock style={{ width: 18, height: 18, color: 'var(--info)' }} /> : <Circle style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />}
                                            </td>
                                            <td><span className="table-cell-main" style={t.status === 'Done' ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{t.title}</span></td>
                                            <td><StatusBadge status={t.priority} map={priorityMap} /></td>
                                            <td><StatusBadge status={t.status} map={statusMap} /></td>
                                            <td className="table-cell-secondary">{getStaffName(t.assigneeId)}</td>
                                            <td className="table-cell-secondary">{getStaffName(t.assignedById)}</td>
                                            <td className="table-cell-secondary">{getProjectName(t.projectId)}</td>
                                            <td className="table-cell-secondary" style={isOverdue(t) ? { color: 'var(--danger)', fontWeight: 500 } : {}}>
                                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                                                {isOverdue(t) && ' ⚠'}
                                            </td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={e => handleDelete(t.id, e)}><X style={{ width: 14, height: 14 }} /></button></td>
                                        </tr>
                                    ))}
                                    {tasks.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No tasks found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="kanban-board">
                        {kanbanColumns.map(col => (
                            <div key={col} className="kanban-column">
                                <div className="kanban-column-header">
                                    <span>{col}</span>
                                    <span className="kanban-count">{tasks.filter(t => t.status === col).length}</span>
                                </div>
                                <div className="kanban-column-body">
                                    {tasks.filter(t => t.status === col).sort((a, b) => {
                                        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
                                        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
                                    }).map(t => (
                                        <div key={t.id} className="kanban-card" onClick={() => { setEditItem(t); setShowModal(true); }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                <span className="kanban-card-title">{t.title}</span>
                                                <StatusBadge status={t.priority} map={priorityMap} />
                                            </div>
                                            <div className="kanban-card-meta">
                                                <span>To: {getStaffName(t.assigneeId)}</span>
                                                {t.assignedById && <span>By: {getStaffName(t.assignedById)}</span>}
                                                {t.dueDate && <span style={isOverdue(t) ? { color: 'var(--danger)' } : {}}>{new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Task' : 'Add Task'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Task Title</label>
                                <input className="form-input" name="title" defaultValue={editItem?.title} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'To Do'}>
                                        <option>To Do</option><option>In Progress</option><option>Done</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" name="priority" defaultValue={editItem?.priority || 'Medium'}>
                                        <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Assigned To</label>
                                    <select className="form-select" name="assigneeId" defaultValue={editItem?.assigneeId || ''}>
                                        <option value="">Unassigned</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assigned By</label>
                                    <select className="form-select" name="assignedById" defaultValue={editItem?.assignedById || ''}>
                                        <option value="">— Select —</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" name="dueDate" type="date" defaultValue={editItem?.dueDate} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Project</label>
                                    <select className="form-select" name="projectId" defaultValue={editItem?.projectId || ''}>
                                        <option value="">No Project</option>
                                        {(state.projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem?.description} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Task'}</button>
                        </div>
                    </form>
                </Modal>
        </>
    );
}
