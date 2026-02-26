import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, X, LayoutList, Columns3, Settings, Edit3, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { 'To Do': 'neutral', 'In Progress': 'info', Done: 'success' };
const priorityMap = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' };

export default function Tasks() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [viewMode, setViewMode] = useState('kanban');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    // Category management state
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');

    const categories = state.taskCategories || [];
    const staff = state.staff || [];

    const tasks = (state.tasks || []).filter(t => {
        const q = search.toLowerCase();
        const matchesSearch = t.title.toLowerCase().includes(q);
        const matchesAssignee = filterAssignee === 'All' || t.assigneeId === filterAssignee;
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
        return matchesSearch && matchesAssignee && matchesStatus && matchesCategory;
    });

    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : '—'; };
    const getProjectName = (id) => (state.projects || []).find(p => p.id === id)?.name || '—';
    const isOverdue = (t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date();

    // ─── Task CRUD ────────────────────────────────────────────

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (!data.projectId) data.projectId = null;
        if (!data.assigneeId) data.assigneeId = null;
        if (!data.assignedById) data.assignedById = null;
        if (!data.category) data.category = '';
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

    // ─── Drag & Drop ──────────────────────────────────────────

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        // Delay to show dragging state
        requestAnimationFrame(() => {
            e.target.classList.add('dragging');
        });
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, categoryName) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(categoryName);
    };

    const handleDragLeave = (e) => {
        // Only clear if we're actually leaving the column
        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = (e, categoryName) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedTask && draggedTask.category !== categoryName) {
            dispatch({ type: ACTIONS.UPDATE_TASK, payload: { id: draggedTask.id, category: categoryName } });
        }
        setDraggedTask(null);
    };

    // ─── Category CRUD ────────────────────────────────────────

    const handleSaveCategory = () => {
        const name = categoryName.trim();
        if (!name) return;
        if (editingCategory) {
            // Also update any tasks that had the old category name
            const oldName = editingCategory.name;
            dispatch({ type: ACTIONS.UPDATE_TASK_CATEGORY, payload: { id: editingCategory.id, name } });
            if (oldName !== name) {
                tasks.filter(t => t.category === oldName).forEach(t => {
                    dispatch({ type: ACTIONS.UPDATE_TASK, payload: { id: t.id, category: name } });
                });
            }
        } else {
            const maxOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder || 0), -1);
            dispatch({ type: ACTIONS.ADD_TASK_CATEGORY, payload: { name, sortOrder: maxOrder + 1 } });
        }
        setEditingCategory(null);
        setCategoryName('');
    };

    const handleDeleteCategory = (cat) => {
        if (confirm(`Delete category "${cat.name}"? Tasks in this category will become uncategorised.`)) {
            // Clear category from affected tasks
            (state.tasks || []).filter(t => t.category === cat.name).forEach(t => {
                dispatch({ type: ACTIONS.UPDATE_TASK, payload: { id: t.id, category: '' } });
            });
            dispatch({ type: ACTIONS.DELETE_TASK_CATEGORY, payload: cat.id });
        }
    };

    // Sort tasks by priority
    const sortByPriority = (arr) => arr.sort((a, b) => {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    });

    // Get unique category objects (by name) and names
    const uniqueCategories = Array.from(new Map(categories.map(c => [c.name, c])).values());
    const categoryNames = uniqueCategories.map(c => c.name);
    const uncategorisedTasks = tasks.filter(t => !t.category || !categoryNames.includes(t.category));

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
                    <select className="form-select" style={{ flex: 1 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                        <option value="All">All Team</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                    <select className="form-select" style={{ flex: 1 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="All">All Categories</option>
                        {uniqueCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        <option value="">Uncategorised</option>
                    </select>
                    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button className={`btn btn-ghost btn-sm ${viewMode === 'list' ? 'active' : ''}`} style={viewMode === 'list' ? { background: 'var(--primary-glow)', color: 'var(--primary)' } : {}} onClick={() => setViewMode('list')}><LayoutList style={{ width: 16, height: 16 }} /></button>
                        <button className={`btn btn-ghost btn-sm ${viewMode === 'kanban' ? 'active' : ''}`} style={viewMode === 'kanban' ? { background: 'var(--primary-glow)', color: 'var(--primary)' } : {}} onClick={() => setViewMode('kanban')}><Columns3 style={{ width: 16, height: 16 }} /></button>
                    </div>
                    {viewMode === 'kanban' && (
                        <button className="btn btn-ghost" onClick={() => setShowCategoryModal(true)} title="Manage Categories">
                            <Settings style={{ width: 16, height: 16 }} />
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Task
                    </button>
                </div>
            </div>
            <div className={`page-body${viewMode === 'kanban' ? ' page-body-kanban' : ''}`}>
                {viewMode === 'list' ? (
                    <div className="card">
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }}></th>
                                        <th>Task</th>
                                        <th>Category</th>
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
                                    {sortByPriority([...tasks]).map(t => (
                                        <tr key={t.id} onClick={() => { setEditItem(t); setShowModal(true); }} style={isOverdue(t) ? { borderLeft: '3px solid var(--danger)' } : {}}>
                                            <td onClick={e => toggleStatus(t, e)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                                {t.status === 'Done' ? <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--success)' }} /> : t.status === 'In Progress' ? <Clock style={{ width: 18, height: 18, color: 'var(--info)' }} /> : <Circle style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />}
                                            </td>
                                            <td><span className="table-cell-main" style={t.status === 'Done' ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{t.title}</span></td>
                                            <td className="table-cell-secondary">{t.category || '—'}</td>
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
                                    {tasks.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No tasks found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Kanban Board */}
                        <div className="kanban-board kanban-desktop">
                            {categoryNames.map(catName => {
                                const colTasks = sortByPriority([...tasks.filter(t => t.category === catName)]);
                                return (
                                    <div
                                        key={catName}
                                        className={`kanban-column${dragOverColumn === catName ? ' drag-over' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, catName)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, catName)}
                                    >
                                        <div className="kanban-column-header">
                                            <span>{catName}</span>
                                            <span className="kanban-count">{colTasks.length}</span>
                                        </div>
                                        <div className="kanban-column-body">
                                            {colTasks.map(t => (
                                                <div
                                                    key={t.id}
                                                    className="kanban-card"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, t)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => { setEditItem(t); setShowModal(true); }}
                                                >
                                                    <div className="kanban-card-main">
                                                        <div className="kanban-card-title-row">
                                                            <span className="kanban-card-title">{t.title}</span>
                                                            <button
                                                                className="btn-icon-only"
                                                                onClick={(e) => handleDelete(t.id, e)}
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 />
                                                            </button>
                                                        </div>
                                                        <div className="kanban-card-badges">
                                                            <StatusBadge status={t.priority} map={priorityMap} />
                                                            <StatusBadge status={t.status} map={statusMap} />
                                                        </div>
                                                    </div>
                                                    <div className="kanban-card-meta">
                                                        <div className="kanban-card-assignee">To: {getStaffName(t.assigneeId)}</div>
                                                        {t.dueDate && (
                                                            <div className={`kanban-card-date ${isOverdue(t) ? 'overdue' : ''}`}>
                                                                {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {colTasks.length === 0 && (
                                                <div className="kanban-empty">Drop tasks here</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {uncategorisedTasks.length > 0 && (
                                <div
                                    className={`kanban-column${dragOverColumn === '' ? ' drag-over' : ''}`}
                                    onDragOver={(e) => handleDragOver(e, '')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, '')}
                                >
                                    <div className="kanban-column-header">
                                        <span>Uncategorised</span>
                                        <span className="kanban-count">{uncategorisedTasks.length}</span>
                                    </div>
                                    <div className="kanban-column-body">
                                        {sortByPriority([...uncategorisedTasks]).map(t => (
                                            <div
                                                key={t.id}
                                                className="kanban-card"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, t)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => { setEditItem(t); setShowModal(true); }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                    <span className="kanban-card-title">{t.title}</span>
                                                    <StatusBadge status={t.priority} map={priorityMap} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                    <StatusBadge status={t.status} map={statusMap} />
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
                            )}
                        </div>

                        {/* Mobile Grouped List View */}
                        <div className="kanban-mobile-list">
                            {[...categoryNames, ...(uncategorisedTasks.length > 0 ? [''] : [])].map(catName => {
                                const colTasks = sortByPriority([...tasks.filter(t => catName === '' ? (!t.category || !categoryNames.includes(t.category)) : t.category === catName)]);
                                if (colTasks.length === 0) return null;
                                const label = catName || 'Uncategorised';
                                return (
                                    <div key={catName} style={{ marginBottom: 'var(--space-lg)' }}>
                                        <div className="kanban-mobile-section-header">
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                                            <span className="kanban-count">{colTasks.length}</span>
                                        </div>
                                        {colTasks.map(t => (
                                            <div key={t.id} className="kanban-mobile-card" onClick={() => { setEditItem(t); setShowModal(true); }}>
                                                <div className="kanban-card-title-row">
                                                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1, textDecoration: t.status === 'Done' ? 'line-through' : 'none', opacity: t.status === 'Done' ? 0.6 : 1 }}>{t.title}</span>
                                                    <button
                                                        className="btn-icon-only"
                                                        onClick={(e) => handleDelete(t.id, e)}
                                                    >
                                                        <Trash2 />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                    <StatusBadge status={t.status} map={statusMap} />
                                                    <StatusBadge status={t.priority} map={priorityMap} />
                                                </div>
                                                <div className="kanban-card-meta">
                                                    <div className="kanban-card-assignee">To: {getStaffName(t.assigneeId)}</div>
                                                    <div className={`kanban-card-date ${isOverdue(t) ? 'overdue' : ''}`}>
                                                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            {tasks.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No tasks found</div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit Task Modal */}
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
                                <label className="form-label">Category</label>
                                <select className="form-select" name="category" defaultValue={editItem?.category || ''}>
                                    <option value="">— No Category —</option>
                                    {uniqueCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input className="form-input" name="dueDate" type="date" defaultValue={editItem?.dueDate} />
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
                        <div className="form-group">
                            <label className="form-label">Project</label>
                            <select className="form-select" name="projectId" defaultValue={editItem?.projectId || ''}>
                                <option value="">No Project</option>
                                {(state.projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" name="description" defaultValue={editItem?.description} />
                        </div>
                    </div>
                    <div className="modal-footer" style={{ justifyContent: editItem ? 'space-between' : 'flex-end' }}>
                        {editItem && (
                            <button type="button" className="btn btn-danger" onClick={(e) => { handleDelete(editItem.id, e); setShowModal(false); }}>
                                <Trash2 /> Delete Task
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Task'}</button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Category Management Modal */}
            <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }} title="Manage Categories">
                <div className="modal-body">
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                        <input
                            className="form-input"
                            placeholder={editingCategory ? 'Rename category…' : 'New category name…'}
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCategory(); } }}
                        />
                        <button className="btn btn-primary" onClick={handleSaveCategory} disabled={!categoryName.trim()}>
                            {editingCategory ? 'Rename' : 'Add'}
                        </button>
                        {editingCategory && (
                            <button className="btn btn-ghost" onClick={() => { setEditingCategory(null); setCategoryName(''); }}>
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                        {uniqueCategories.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>No categories yet. Add one above.</div>
                        )}
                        {uniqueCategories.map(cat => (
                            <div key={cat.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'var(--bg-main)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
                                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); }}>
                                        <Edit3 style={{ width: 14, height: 14 }} />
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteCategory(cat)} style={{ color: 'var(--danger)' }}>
                                        <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }}>Close</button>
                </div>
            </Modal>
        </>
    );
}
