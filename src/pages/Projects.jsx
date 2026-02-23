import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Plus, Search, FolderKanban, X, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Active: 'success', Completed: 'info', 'On Hold': 'warning', Planning: 'neutral' };
const typeMap = { Awareness: 'primary', Recovery: 'danger', Internal: 'neutral' };

export default function Projects() {
    const { state, dispatch, ACTIONS } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const projects = (state.projects || []).filter(p => {
        const q = search.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getCompanyName = (id) => state.companies.find(c => c.id === id)?.name || '—';
    const getStaffName = (id) => { const s = (state.staff || []).find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : '—'; };

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.budget = parseFloat(data.budget) || 0;
        if (!data.companyId) data.companyId = null;
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_PROJECT, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_PROJECT, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id) => {
        if (confirm('Delete this project?')) dispatch({ type: ACTIONS.DELETE_PROJECT, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Projects</h1>
                    <div className="page-header-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All</option>
                        <option>Active</option>
                        <option>Planning</option>
                        <option>On Hold</option>
                        <option>Completed</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Project
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    {['Active', 'Planning', 'On Hold', 'Completed'].map(s => (
                        <div key={s} className="stat-card" style={{ '--stat-accent': s === 'Active' ? 'var(--success)' : s === 'Planning' ? 'var(--info)' : s === 'On Hold' ? 'var(--warning)' : 'var(--text-muted)' }}>
                            <div className="stat-card-label">{s}</div>
                            <div className="stat-card-value">{(state.projects || []).filter(p => p.status === s).length}</div>
                        </div>
                    ))}
                </div>
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Organisation</th>
                                    <th>Lead</th>
                                    <th>Timeline</th>
                                    <th>Budget</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(p => (
                                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/projects/' + p.id)}>
                                        <td>
                                            <div className="table-cell-main"><FolderKanban style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--primary)' }} />{p.name}</div>
                                        </td>
                                        <td><StatusBadge status={p.type} map={typeMap} /></td>
                                        <td><StatusBadge status={p.status} map={statusMap} /></td>
                                        <td className="table-cell-secondary">{getCompanyName(p.companyId)}</td>
                                        <td className="table-cell-secondary">{getStaffName(p.leadId)}</td>
                                        <td className="table-cell-secondary">{p.startDate && p.endDate ? `${new Date(p.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} — ${new Date(p.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : '—'}</td>
                                        <td className="table-cell-secondary">{p.budget ? `£${p.budget.toLocaleString()}` : '—'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(p); setShowModal(true); }}><Edit2 style={{ width: 14, height: 14 }} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}><X style={{ width: 14, height: 14 }} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {projects.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No projects found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Project' : 'Add Project'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Project Name</label>
                                <input className="form-input" name="name" defaultValue={editItem?.name} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" name="type" defaultValue={editItem?.type || 'Awareness'}>
                                        <option>Awareness</option><option>Recovery</option><option>Internal</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Planning'}>
                                        <option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Organisation</label>
                                    <select className="form-select" name="companyId" defaultValue={editItem?.companyId || ''}>
                                        <option value="">None (Internal)</option>
                                        {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Project Lead</label>
                                    <select className="form-select" name="leadId" defaultValue={editItem?.leadId || ''}>
                                        <option value="">Unassigned</option>
                                        {(state.staff || []).map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input className="form-input" name="startDate" type="date" defaultValue={editItem?.startDate} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input className="form-input" name="endDate" type="date" defaultValue={editItem?.endDate} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Budget (£)</label>
                                <input className="form-input" name="budget" type="number" defaultValue={editItem?.budget} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem?.description} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" name="notes" defaultValue={editItem?.notes} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Project'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
