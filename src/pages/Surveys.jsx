import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as api from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Pencil, Trash2, Link, ClipboardList, Search } from 'lucide-react';

const STATUS_COLORS = {
    draft: 'grey',
    active: 'green',
    closed: 'red',
};

export default function Surveys({ type }) {
    const navigate = useNavigate();
    const { state, dispatch, ACTIONS } = useData();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showNewModal, setShowNewModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [creating, setCreating] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');

    const typeName = type === 'prevention' ? 'Prevention' : 'Recovery';
    const basePath = `/${type}/surveys`;

    // Filter surveys from global state by type
    const allSurveys = (state.surveys || []).filter(s => s.type === type);

    const filtered = allSurveys.filter(s => {
        const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || s.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const counts = {
        draft: allSurveys.filter(s => s.status === 'draft').length,
        active: allSurveys.filter(s => s.status === 'active').length,
        closed: allSurveys.filter(s => s.status === 'closed').length,
    };

    async function handleCreate(e) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const survey = await api.createSurvey({ title: newTitle.trim(), type });
            dispatch({ type: ACTIONS.ADD_SURVEY, payload: { ...survey, questionCount: 0 } });
            setShowNewModal(false);
            setNewTitle('');
            navigate(`${basePath}/${survey.id}/edit`);
        } catch (err) {
            console.error('Failed to create survey:', err);
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(survey) {
        if (!window.confirm(`Delete "${survey.title}"? This cannot be undone.`)) return;
        dispatch({ type: ACTIONS.DELETE_SURVEY, payload: survey.id });
    }

    function handleCopyLink(survey) {
        const url = `${window.location.origin}/survey/${survey.publicToken}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopyMessage(survey.id);
            setTimeout(() => setCopyMessage(''), 2000);
        });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>{typeName} Surveys</h1>
                    <div className="page-header-subtitle">{allSurveys.length} survey{allSurveys.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <div className="search-input-wrapper">
                        <Search />
                        <input
                            className="search-input"
                            placeholder="Search surveys…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option>All</option>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                        <Plus style={{ width: 16, height: 16 }} />
                        New Survey
                    </button>
                </div>
            </div>
            <div className="page-body">
                {/* Stat cards */}
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--text-muted)' }}>
                        <div className="stat-card-label">Draft</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{counts.draft}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                        <div className="stat-card-label">Active</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center', color: 'var(--success)' }}>{counts.active}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--danger)' }}>
                        <div className="stat-card-label">Closed</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{counts.closed}</div>
                    </div>
                    <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                        <div className="stat-card-label">Total</div>
                        <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{allSurveys.length}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="card">
                    {filtered.length === 0 ? (
                        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <ClipboardList style={{ width: 48, height: 48, marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                            <p style={{ fontWeight: 500, marginBottom: 4 }}>No surveys yet</p>
                            <p style={{ fontSize: 13 }}>
                                {search || filterStatus !== 'All'
                                    ? 'No surveys match your filters.'
                                    : `Create your first ${typeName.toLowerCase()} survey.`}
                            </p>
                        </div>
                    ) : (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Status</th>
                                        <th>Questions</th>
                                        <th>Created</th>
                                        <th style={{ width: 120 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(survey => (
                                        <tr key={survey.id}>
                                            <td>
                                                <span
                                                    className="table-cell-main"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => navigate(`${basePath}/${survey.id}/edit`)}
                                                >
                                                    {survey.title || 'Untitled Survey'}
                                                </span>
                                            </td>
                                            <td>
                                                <StatusBadge status={survey.status} color={STATUS_COLORS[survey.status]} />
                                            </td>
                                            <td className="table-cell-secondary">{survey.questionCount ?? 0}</td>
                                            <td className="table-cell-secondary">{formatDate(survey.createdAt)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title="Edit survey"
                                                        onClick={() => navigate(`${basePath}/${survey.id}/edit`)}
                                                    >
                                                        <Pencil style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title={copyMessage === survey.id ? 'Copied!' : 'Copy public link'}
                                                        onClick={() => handleCopyLink(survey)}
                                                        style={{ color: copyMessage === survey.id ? 'var(--success)' : undefined }}
                                                    >
                                                        <Link style={{ width: 14, height: 14 }} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        title="Delete survey"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => handleDelete(survey)}
                                                    >
                                                        <Trash2 style={{ width: 14, height: 14 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* New Survey Modal */}
            <Modal isOpen={showNewModal} onClose={() => { setShowNewModal(false); setNewTitle(''); }} title="New Survey">
                <form onSubmit={handleCreate}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Survey Title</label>
                            <input
                                className="form-input"
                                placeholder={`e.g. ${typeName} Check-In Survey`}
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            You can change the title and add questions in the builder.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => { setShowNewModal(false); setNewTitle(''); }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={creating || !newTitle.trim()}>
                            {creating ? 'Creating…' : 'Create & Open Builder'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
