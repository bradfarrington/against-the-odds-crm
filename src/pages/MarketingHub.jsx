import { useState } from 'react';
import { useData, ACTIONS } from '../context/DataContext';
import {
    Megaphone, Plus, Mail, Send, Eye, Calendar as CalendarIcon, Target, Users, Settings, Clock, Play
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

export default function MarketingHub() {
    const { state, dispatch } = useData();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('campaigns');
    const [form, setForm] = useState({
        name: '', type: 'Email', status: 'Draft', audience: 'All Contacts',
        subject: '', description: '', scheduledDate: '',
    });

    const filtered = state.campaigns.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.type.toLowerCase().includes(search.toLowerCase())
    );

    const totalSent = state.campaigns.reduce((s, c) => s + c.sentCount, 0);
    const totalOpens = state.campaigns.reduce((s, c) => s + c.openCount, 0);
    const totalClicks = state.campaigns.reduce((s, c) => s + c.clickCount, 0);
    const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;

    const barData = state.campaigns.filter(c => c.sentCount > 0).map(c => ({
        name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
        sent: c.sentCount,
        opens: c.openCount,
        clicks: c.clickCount,
    }));

    const pieData = [
        { name: 'Email', value: state.campaigns.filter(c => c.type === 'Email').length, color: '#FF6100' },
        { name: 'Newsletter', value: state.campaigns.filter(c => c.type === 'Newsletter').length, color: '#3B82F6' },
        { name: 'Social', value: state.campaigns.filter(c => c.type === 'Social').length || 1, color: '#8B5CF6' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch({ type: ACTIONS.ADD_CAMPAIGN, payload: form });
        setForm({ name: '', type: 'Email', status: 'Draft', audience: 'All Contacts', subject: '', description: '', scheduledDate: '' });
        setShowModal(false);
    };

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Marketing Hub</h1>
                    <div className="page-header-subtitle">Manage campaigns, content, and audience engagement</div>
                </div>
                <div className="page-header-actions">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search campaigns..." />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        Create Campaign
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* KPIs */}
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="stat-card fade-in-up stagger-1" style={{ '--stat-accent': '#FF6100' }}>
                        <div className="stat-card-icon" style={{ background: 'rgba(255,97,0,0.12)', color: '#FF6100' }}>
                            <Megaphone size={22} />
                        </div>
                        <div className="stat-card-value">{state.campaigns.length}</div>
                        <div className="stat-card-label">Total Campaigns</div>
                    </div>
                    <div className="stat-card fade-in-up stagger-2" style={{ '--stat-accent': '#3B82F6' }}>
                        <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                            <Send size={22} />
                        </div>
                        <div className="stat-card-value">{totalSent}</div>
                        <div className="stat-card-label">Total Sent</div>
                    </div>
                    <div className="stat-card fade-in-up stagger-3" style={{ '--stat-accent': '#22C55E' }}>
                        <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                            <Eye size={22} />
                        </div>
                        <div className="stat-card-value">{avgOpenRate}%</div>
                        <div className="stat-card-label">Avg Open Rate</div>
                    </div>
                    <div className="stat-card fade-in-up stagger-4" style={{ '--stat-accent': '#8B5CF6' }}>
                        <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                            <MousePointerClick size={22} />
                        </div>
                        <div className="stat-card-value">{totalClicks}</div>
                        <div className="stat-card-label">Total Clicks</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'campaigns' ? 'active' : ''} `} onClick={() => setActiveTab('campaigns')}>
                        Campaigns
                    </button>
                    <button className={`tab ${activeTab === 'analytics' ? 'active' : ''} `} onClick={() => setActiveTab('analytics')}>
                        Analytics
                    </button>
                </div>

                {/* Campaigns Tab */}
                {activeTab === 'campaigns' && (
                    <div className="card fade-in-up">
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Campaign</th>
                                        <th>Type</th>
                                        <th>Audience</th>
                                        <th>Sent</th>
                                        <th>Opens</th>
                                        <th>Clicks</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(campaign => (
                                        <tr key={campaign.id}>
                                            <td>
                                                <div>
                                                    <div className="table-cell-main">{campaign.name}</div>
                                                    <div className="table-cell-secondary" style={{ fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {campaign.subject}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {campaign.type === 'Email' ? <Mail size={12} /> : <FileText size={12} />}
                                                    {campaign.type}
                                                </span>
                                            </td>
                                            <td className="table-cell-secondary">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Users2 size={13} />
                                                    {campaign.audience}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{campaign.sentCount}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {campaign.openCount}
                                                    {campaign.sentCount > 0 && (
                                                        <span className="table-cell-secondary" style={{ fontSize: 11 }}>
                                                            ({Math.round((campaign.openCount / campaign.sentCount) * 100)}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{campaign.clickCount}</td>
                                            <td><StatusBadge status={campaign.status} /></td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="empty-state">
                                                    <Megaphone />
                                                    <h3>No campaigns found</h3>
                                                    <p>Create your first campaign to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="grid-2 fade-in-up">
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <BarChart3 size={18} /> Campaign Performance
                                </h3>
                            </div>
                            <div className="card-body" style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                                        <XAxis dataKey="name" stroke="#5C5F73" fontSize={11} />
                                        <YAxis stroke="#5C5F73" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1A1D27',
                                                border: '1px solid #2A2D3A',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                color: '#F0F0F5',
                                            }}
                                        />
                                        <Bar dataKey="sent" fill="#FF6100" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="opens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="clicks" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3>Campaign Types</h3>
                            </div>
                            <div className="card-body" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}% `}
                                        >
                                            {pieData.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1A1D27',
                                                border: '1px solid #2A2D3A',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                color: '#F0F0F5',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Campaign" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Campaign Name *</label>
                            <input className="form-input" required value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Gambling Awareness Week 2026" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={form.type} onChange={e => updateForm('type', e.target.value)}>
                                    <option>Email</option>
                                    <option>Newsletter</option>
                                    <option>Social</option>
                                    <option>Event</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Audience</label>
                                <select className="form-select" value={form.audience} onChange={e => updateForm('audience', e.target.value)}>
                                    <option>All Contacts</option>
                                    <option>Education Contacts</option>
                                    <option>Partner Organisations</option>
                                    <option>Recovery Seekers</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject Line</label>
                            <input className="form-input" value={form.subject} onChange={e => updateForm('subject', e.target.value)} placeholder="Email subject line..." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Scheduled Date</label>
                            <DateTimePicker name="scheduledDate" value={form.scheduledDate} onChange={e => updateForm('scheduledDate', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Campaign description and goals..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create Campaign</button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
