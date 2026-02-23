import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Target, TrendingUp, X } from 'lucide-react';
import Modal from '../components/Modal';

const categoryColors = {
    Awareness: 'var(--primary)',
    Recovery: 'var(--success)',
    Financial: 'var(--warning)',
    Engagement: 'var(--info)',
};

export default function Targets() {
    const { state, dispatch, ACTIONS } = useData();
    const [filterCategory, setFilterCategory] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const targets = (state.targets || []).filter(t => filterCategory === 'All' || t.category === filterCategory);

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.currentValue = parseFloat(data.currentValue) || 0;
        data.goalValue = parseFloat(data.goalValue) || 0;
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_TARGET, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_TARGET, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this target?')) dispatch({ type: ACTIONS.DELETE_TARGET, payload: id });
    };

    const categories = ['Awareness', 'Recovery', 'Financial', 'Engagement'];

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Targets</h1>
                    <div className="page-header-subtitle">KPIs and goals tracking</div>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ flex: 1 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option>All</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Target
                    </button>
                </div>
            </div>
            <div className="page-body">
                {categories.filter(cat => filterCategory === 'All' || filterCategory === cat).map(cat => {
                    const catTargets = targets.filter(t => t.category === cat);
                    if (catTargets.length === 0) return null;
                    return (
                        <div key={cat} style={{ marginBottom: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColors[cat] }} />
                                <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{cat}</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                                {catTargets.map(t => {
                                    const pct = t.goalValue > 0 ? Math.min(100, Math.round((t.currentValue / t.goalValue) * 100)) : 0;
                                    const color = categoryColors[t.category] || 'var(--primary)';
                                    return (
                                        <div key={t.id} className="card target-card" onClick={() => { setEditItem(t); setShowModal(true); }} style={{ cursor: 'pointer' }}>
                                            <div className="card-body">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.description}</div>
                                                    </div>
                                                    <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(t.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                                    <span style={{ fontSize: 28, fontWeight: 700, color }}>{t.metric === 'GBP' ? `£${t.currentValue.toLocaleString()}` : t.currentValue.toLocaleString()}</span>
                                                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {t.metric === 'GBP' ? `£${t.goalValue.toLocaleString()}` : t.goalValue.toLocaleString()} {t.metric !== 'GBP' ? t.metric : ''}</span>
                                                </div>
                                                <div className="progress-bar-bg">
                                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {targets.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>No targets set</div>}
            </div>

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Target' : 'Add Target'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Target Name</label>
                                <input className="form-input" name="name" defaultValue={editItem?.name} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" name="category" defaultValue={editItem?.category || 'Awareness'}>
                                        {categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Metric Unit</label>
                                    <input className="form-input" name="metric" defaultValue={editItem?.metric || 'count'} placeholder="e.g. sessions, people, GBP" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Current Value</label>
                                    <input className="form-input" name="currentValue" type="number" defaultValue={editItem?.currentValue || 0} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Goal Value</label>
                                    <input className="form-input" name="goalValue" type="number" defaultValue={editItem?.goalValue || 0} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input className="form-input" name="deadline" type="date" defaultValue={editItem?.deadline} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" defaultValue={editItem?.description} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Target'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
