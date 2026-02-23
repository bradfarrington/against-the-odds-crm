import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, FileText, Copy, X } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const categoryMap = { Email: 'info', Workshop: 'primary', Report: 'warning', Invoice: 'success', Contract: 'danger' };

export default function Templates() {
    const { state, dispatch, ACTIONS } = useData();
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [viewItem, setViewItem] = useState(null);

    const templates = (state.templates || []).filter(t => {
        const q = search.toLowerCase();
        const matchesSearch = t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
        const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_TEMPLATE, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_TEMPLATE, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
    };

    const handleDuplicate = (t, e) => {
        e.stopPropagation();
        dispatch({ type: ACTIONS.ADD_TEMPLATE, payload: { name: `${t.name} (Copy)`, category: t.category, content: t.content, description: t.description } });
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this template?')) dispatch({ type: ACTIONS.DELETE_TEMPLATE, payload: id });
    };

    const categories = ['Email', 'Workshop', 'Report', 'Invoice', 'Contract'];

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Templates</h1>
                    <div className="page-header-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input className="search-input" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ flex: 1 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option>All</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> New Template
                    </button>
                </div>
            </div>
            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
                    {templates.map(t => (
                        <div key={t.id} className="card template-card" onClick={() => setViewItem(t)} style={{ cursor: 'pointer' }}>
                            <div className="card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FileText style={{ width: 18, height: 18, color: 'var(--primary)', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>
                                        </div>
                                    </div>
                                    <StatusBadge status={t.category} map={categoryMap} />
                                </div>
                                <div className="template-preview">{t.content?.slice(0, 150)}…</div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditItem(t); setShowModal(true); }}>Edit</button>
                                    <button className="btn btn-ghost btn-sm" onClick={e => handleDuplicate(t, e)}><Copy style={{ width: 14, height: 14 }} /> Duplicate</button>
                                    <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(t.id, e)} style={{ marginLeft: 'auto' }}><X style={{ width: 14, height: 14 }} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {templates.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>No templates found</div>}
            </div>

            {viewItem && !showModal && (
                <Modal onClose={() => setViewItem(null)} title={viewItem.name} large>
                    <div className="modal-body">
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                            <StatusBadge status={viewItem.category} map={categoryMap} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{viewItem.description}</span>
                        </div>
                        <pre className="template-content-view">{viewItem.content}</pre>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => { setViewItem(null); setEditItem(viewItem); setShowModal(true); }}>Edit Template</button>
                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(viewItem.content); }}>Copy to Clipboard</button>
                    </div>
                </Modal>
            )}

            {showModal && (
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Template' : 'New Template'} large>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Template Name</label>
                                <input className="form-input" name="name" defaultValue={editItem?.name} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" name="category" defaultValue={editItem?.category || 'Email'}>
                                        {categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input className="form-input" name="description" defaultValue={editItem?.description} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Template Content</label>
                                <textarea className="form-textarea" name="content" defaultValue={editItem?.content} rows={12} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Create Template'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
