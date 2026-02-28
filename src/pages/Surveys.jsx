import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import * as api from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Pencil, Trash2, Link, ClipboardList, Search, Filter, Users, ChevronDown } from 'lucide-react';
import useTableSort from '../components/useTableSort';
import SortableHeader from '../components/SortableHeader';

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
    const [newCategory, setNewCategory] = useState('pre_workshop');
    const [viewMode, setViewMode] = useState('surveys');
    const [feedbackWorkshopFilter, setFeedbackWorkshopFilter] = useState('');
    const [feedbackStaffFilter, setFeedbackStaffFilter] = useState('');
    const [surveyResponses, setSurveyResponses] = useState([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('');
    const [expandedResponseId, setExpandedResponseId] = useState(null);
    const { sortConfig, requestSort, sortedData } = useTableSort();

    // Fetch survey responses when the Feedback tab is selected
    useEffect(() => {
        if (viewMode !== 'feedback') return;
        let cancelled = false;
        setLoadingFeedback(true);
        api.fetchAllSurveyResponses()
            .then(data => { if (!cancelled) setSurveyResponses(data); })
            .catch(err => console.error('Failed to load feedback:', err))
            .finally(() => { if (!cancelled) setLoadingFeedback(false); });
        return () => { cancelled = true; };
    }, [viewMode]);

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
            const survey = await api.createSurvey({ title: newTitle.trim(), type, settings: { category: newCategory } });
            dispatch({ type: ACTIONS.ADD_SURVEY, payload: { ...survey, questionCount: 0 } });
            setShowNewModal(false);
            setNewTitle('');
            setNewCategory('pre_workshop');
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

    function handleStatusChange(survey, newStatus) {
        dispatch({ type: ACTIONS.UPDATE_SURVEY, payload: { id: survey.id, status: newStatus } });
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

    // Data for the feedback tab
    const workshops = state.preventionSchedule || [];
    const staffList = state.staff || [];
    const companies = state.companies || [];
    const allSurveysForLookup = state.surveys || [];

    // Build a question label lookup from all surveys' pages
    const questionLabelMap = {};
    allSurveysForLookup.forEach(survey => {
        (survey.pages || []).forEach(page => {
            (page.elements || []).forEach(el => {
                if (el.id && el.label) questionLabelMap[el.id] = el.label;
            });
        });
    });

    // Filter responses (show all, filter by workshop/staff/category when selected)
    const feedbackResponses = surveyResponses;
    const filteredFeedback = feedbackResponses.filter(r => {
        if (feedbackWorkshopFilter && r.workshopId !== feedbackWorkshopFilter) return false;
        if (feedbackStaffFilter && r.facilitatorId !== feedbackStaffFilter) return false;
        if (feedbackCategoryFilter) {
            const survey = allSurveysForLookup.find(s => s.id === r.surveyId);
            const cat = survey?.settings?.category || '';
            if (cat !== feedbackCategoryFilter) return false;
        }
        return true;
    });

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>{typeName} Surveys</h1>
                    <div className="page-header-subtitle">{allSurveys.length} survey{allSurveys.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    {viewMode === 'surveys' && (
                        <>
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
                        </>
                    )}
                </div>
            </div>
            <div className="page-body">
                {/* View Mode Tabs */}
                {type === 'prevention' && (
                    <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                        <button className={`tab ${viewMode === 'surveys' ? 'active' : ''}`} onClick={() => setViewMode('surveys')}>Surveys</button>
                        <button className={`tab ${viewMode === 'feedback' ? 'active' : ''}`} onClick={() => setViewMode('feedback')}>Feedback</button>
                    </div>
                )}
                {viewMode === 'surveys' && (
                    <>
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
                                                <SortableHeader label="Title" sortKey="title" sortConfig={sortConfig} onSort={requestSort} />
                                                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                                                <th>Category</th>
                                                <SortableHeader label="Questions" sortKey="questionCount" sortConfig={sortConfig} onSort={requestSort} />
                                                <SortableHeader label="Created" sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} />
                                                <th style={{ width: 120 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedData(filtered, {
                                                questionCount: s => s.questionCount ?? 0,
                                                createdAt: s => s.createdAt ? new Date(s.createdAt) : null,
                                            }).map(survey => (
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
                                                        <select
                                                            value={survey.status}
                                                            onChange={e => handleStatusChange(survey, e.target.value)}
                                                            className="form-select"
                                                            style={{
                                                                fontSize: 12,
                                                                padding: '3px 8px',
                                                                borderRadius: 12,
                                                                minWidth: 85,
                                                                background: survey.status === 'active' ? 'rgba(34,197,94,0.15)' : survey.status === 'closed' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)',
                                                                color: survey.status === 'active' ? 'var(--success)' : survey.status === 'closed' ? 'var(--danger)' : 'var(--text-muted)',
                                                                border: `1px solid ${survey.status === 'active' ? 'var(--success)' : survey.status === 'closed' ? 'var(--danger)' : 'var(--border)'}`,
                                                                cursor: 'pointer',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="active">Active</option>
                                                            <option value="closed">Closed</option>
                                                        </select>
                                                    </td>
                                                    <td className="table-cell-secondary">
                                                        {survey.settings?.category === 'pre_workshop' ? 'Pre Workshop' : survey.settings?.category === 'post_workshop' ? 'Post Workshop' : '—'}
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
                    </>
                )}

                {/* Feedback Tab */}
                {viewMode === 'feedback' && (
                    <div>
                        {/* Filter bar */}
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <div className="card-body" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                                <select
                                    className="form-select"
                                    style={{ flex: 1, minWidth: 180 }}
                                    value={feedbackWorkshopFilter}
                                    onChange={e => setFeedbackWorkshopFilter(e.target.value)}
                                >
                                    <option value="">All Workshops</option>
                                    {workshops.map(w => (
                                        <option key={w.id} value={w.id}>{w.title}{w.date ? ` — ${formatDate(w.date)}` : ''}</option>
                                    ))}
                                </select>
                                <select
                                    className="form-select"
                                    style={{ flex: 1, minWidth: 180 }}
                                    value={feedbackStaffFilter}
                                    onChange={e => setFeedbackStaffFilter(e.target.value)}
                                >
                                    <option value="">All Staff Members</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                                <select
                                    className="form-select"
                                    style={{ flex: 1, minWidth: 160 }}
                                    value={feedbackCategoryFilter}
                                    onChange={e => setFeedbackCategoryFilter(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    <option value="pre_workshop">Pre Workshop</option>
                                    <option value="post_workshop">Post Workshop</option>
                                </select>
                                {(feedbackWorkshopFilter || feedbackStaffFilter || feedbackCategoryFilter) && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setFeedbackWorkshopFilter(''); setFeedbackStaffFilter(''); setFeedbackCategoryFilter(''); }}>
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                            <div className="stat-card" style={{ '--stat-accent': 'var(--primary)' }}>
                                <div className="stat-card-label">Total Responses</div>
                                <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>{filteredFeedback.length}</div>
                            </div>
                            <div className="stat-card" style={{ '--stat-accent': 'var(--success)' }}>
                                <div className="stat-card-label">Workshops Covered</div>
                                <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>
                                    {new Set(filteredFeedback.map(r => r.workshopId)).size}
                                </div>
                            </div>
                            <div className="stat-card" style={{ '--stat-accent': 'var(--warning)' }}>
                                <div className="stat-card-label">Staff Members</div>
                                <div className="stat-card-value" style={{ fontSize: 22, textAlign: 'center' }}>
                                    {new Set(filteredFeedback.filter(r => r.facilitatorId).map(r => r.facilitatorId)).size}
                                </div>
                            </div>
                        </div>

                        {/* Feedback Table */}
                        <div className="card">
                            {filteredFeedback.length === 0 ? (
                                <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Users style={{ width: 48, height: 48, marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                                    <p style={{ fontWeight: 500, marginBottom: 4 }}>No feedback responses yet</p>
                                    <p style={{ fontSize: 13 }}>
                                        {feedbackWorkshopFilter || feedbackStaffFilter
                                            ? 'No responses match your filters.'
                                            : 'Post-workshop feedback submissions will appear here once attendees start responding.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Workshop</th>
                                                <th>Company</th>
                                                <th>Staff Member</th>
                                                <th>Submitted</th>
                                                <th>Answers</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFeedback.map(r => {
                                                const w = workshops.find(ws => ws.id === r.workshopId);
                                                const s = staffList.find(st => st.id === r.facilitatorId);
                                                const c = w ? companies.find(co => co.id === w.companyId) : null;
                                                const isExpanded = expandedResponseId === r.id;
                                                return (
                                                    <React.Fragment key={r.id}>
                                                        <tr
                                                            onClick={() => setExpandedResponseId(isExpanded ? null : r.id)}
                                                            style={{ cursor: 'pointer' }}
                                                            className={isExpanded ? 'row-active' : ''}
                                                        >
                                                            <td className="table-cell-main">{w?.title || '—'}</td>
                                                            <td className="table-cell-secondary">{c?.name || '—'}</td>
                                                            <td className="table-cell-secondary">{s ? `${s.firstName} ${s.lastName}` : '—'}</td>
                                                            <td className="table-cell-secondary">{formatDate(r.submittedAt)}</td>
                                                            <td className="table-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                {r.answers?.length || 0}
                                                                <ChevronDown style={{ width: 14, height: 14, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={5} style={{ padding: 0, borderTop: 'none' }}>
                                                                    <div style={{
                                                                        background: 'var(--bg-surface)',
                                                                        padding: 'var(--space-lg) var(--space-xl)',
                                                                        borderTop: '1px solid var(--border-subtle)',
                                                                        borderBottom: '1px solid var(--border-subtle)',
                                                                    }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md) var(--space-2xl)', fontSize: 13 }}>
                                                                            {(r.answers || []).map(a => (
                                                                                <div key={a.id || a.questionId} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                                        {questionLabelMap[a.questionId] || 'Unknown Question'}
                                                                                    </span>
                                                                                    <span style={{ color: 'var(--text-primary)' }}>
                                                                                        {a.value === true ? 'Yes' : a.value === false ? 'No' : String(a.value || '—')}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {(!r.answers || r.answers.length === 0) && (
                                                                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No answers recorded</p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
                        {type === 'prevention' && (
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                >
                                    <option value="pre_workshop">Pre Workshop</option>
                                    <option value="post_workshop">Post Workshop</option>
                                </select>
                            </div>
                        )}
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
