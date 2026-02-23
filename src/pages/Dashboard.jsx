import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Users,
    HeartHandshake,
    TrendingUp,
    CalendarDays,
    CheckSquare,
    Clock,
    AlertCircle,
    Columns3,
    Target,
    Receipt,
    FileText,
    ArrowRight,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const taskStatusMap = { 'To Do': 'neutral', 'In Progress': 'info', 'Done': 'success' };
const taskPriorityMap = { Urgent: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };
const workshopStatusMap = { Scheduled: 'info', Completed: 'success', Cancelled: 'danger' };

/* ═══════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════ */
function AdminDashboard({ state, user, navigate }) {
    const [viewMode, setViewMode] = useState('overview');

    const workshops = state.preventionSchedule || [];
    const seekers = state.recoverySeekers || [];
    const invoices = state.invoices || [];
    const tasks = state.tasks || [];
    const staff = state.staff || [];

    // Prevention KPIs
    const scheduledWorkshops = workshops.filter(w => w.status === 'Scheduled').length;
    const completedWorkshops = workshops.filter(w => w.status === 'Completed').length;
    const totalAttendees = workshops.filter(w => w.status === 'Completed').reduce((s, w) => s + (w.attendeeCount || 0), 0);

    // Recovery KPIs
    const activeSeekers = seekers.filter(s => s.status === 'Active').length;
    const completedRecovery = seekers.filter(s => s.status === 'Completed').length;
    const totalSessions = seekers.reduce((s, sk) => s + (sk.coachingSessions?.length || 0), 0);

    // Financial
    const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
    const totalOutstanding = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);

    // Tasks Overview
    const openTasks = tasks.filter(t => t.status !== 'Done').length;
    const urgentTasks = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Done').length;

    // Chart data
    const workshopChartData = [
        { month: 'Oct', completed: 2, scheduled: 1 },
        { month: 'Nov', completed: 3, scheduled: 2 },
        { month: 'Dec', completed: 1, scheduled: 0 },
        { month: 'Jan', completed: 4, scheduled: 3 },
        { month: 'Feb', completed: completedWorkshops, scheduled: scheduledWorkshops },
    ];

    const recoveryChartData = [
        { month: 'Sep', seekers: 2 },
        { month: 'Oct', seekers: 3 },
        { month: 'Nov', seekers: 5 },
        { month: 'Dec', seekers: 4 },
        { month: 'Jan', seekers: 8 },
        { month: 'Feb', seekers: activeSeekers + completedRecovery },
    ];

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>{viewMode === 'overview' ? 'Admin Dashboard' : `Welcome back, ${user?.firstName || 'Admin'}`}</h1>
                    <div className="page-header-subtitle">
                        {viewMode === 'overview' ? 'Organisation-wide overview of Against the Odds' : 'Your admin area — projects & tasks'}
                    </div>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-lg)', gap: '4px' }}>
                    <button
                        className={`btn btn-sm ${viewMode === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('overview')}
                    >
                        Company Overview
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === 'my-area' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('my-area')}
                    >
                        My Area
                    </button>
                </div>
            </div>
            {viewMode === 'overview' ? (
                <div className="page-body">
                    {/* Prevention & Recovery side-by-side stats */}
                    <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
                        {/* Prevention */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Columns3 style={{ width: 18, height: 18, color: 'var(--warning)' }} /> Prevention
                                </h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workshop-tracker')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--info)' }}>{scheduledWorkshops}</div>
                                        <div className="mini-stat-label">Scheduled</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--success)' }}>{completedWorkshops}</div>
                                        <div className="mini-stat-label">Completed</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--primary)' }}>{totalAttendees}</div>
                                        <div className="mini-stat-label">People Reached</div>
                                    </div>
                                </div>
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={workshopChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                                            <Bar dataKey="completed" fill="var(--success)" radius={[4, 4, 0, 0]} name="Completed" />
                                            <Bar dataKey="scheduled" fill="var(--info)" radius={[4, 4, 0, 0]} name="Scheduled" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recovery */}
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <HeartHandshake style={{ width: 18, height: 18, color: 'var(--success)' }} /> Recovery
                                </h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/treatment-tracker')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--success)' }}>{activeSeekers}</div>
                                        <div className="mini-stat-label">Active Seekers</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--primary)' }}>{completedRecovery}</div>
                                        <div className="mini-stat-label">Completed</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value" style={{ color: 'var(--info)' }}>{totalSessions}</div>
                                        <div className="mini-stat-label">Sessions</div>
                                    </div>
                                </div>
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={recoveryChartData}>
                                            <defs>
                                                <linearGradient id="seekerGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                                            <Area type="monotone" dataKey="seekers" stroke="var(--success)" strokeWidth={2} fill="url(#seekerGrad)" name="Seekers" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview */}
                    <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                        <StatCard icon={<Receipt />} value={`£${totalInvoiced.toLocaleString()}`} label="Total Invoiced" accent="var(--primary)" className="stagger-1" />
                        <StatCard icon={<TrendingUp />} value={`£${totalPaid.toLocaleString()}`} label="Paid" accent="var(--success)" className="stagger-2" />
                        <StatCard icon={<Clock />} value={`£${totalOutstanding.toLocaleString()}`} label="Outstanding" accent="var(--warning)" className="stagger-3" />
                        <StatCard icon={<CheckSquare />} value={openTasks} label={`Open Tasks (${urgentTasks} urgent)`} accent="var(--info)" className="stagger-4" />
                    </div>

                    {/* Staff Overview & Overdue Tasks */}
                    <div className="grid-2">
                        {/* Staff Activity */}
                        <div className="card">
                            <div className="card-header"><h3>Staff Activity</h3></div>
                            <div className="card-body">
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Staff</th><th>Department</th><th>Open Tasks</th></tr>
                                        </thead>
                                        <tbody>
                                            {staff.filter(s => s.status === 'Active').map(s => {
                                                const myTasks = tasks.filter(t => t.assigneeId === s.id && t.status !== 'Done').length;
                                                return (
                                                    <tr key={s.id}>
                                                        <td className="table-cell-main">{s.firstName} {s.lastName}</td>
                                                        <td><StatusBadge status={s.department} map={{ Prevention: 'warning', Recovery: 'success', Leadership: 'primary', Operations: 'info' }} /></td>
                                                        <td className="table-cell-main">{myTasks}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Overdue / Urgent Items */}
                        <div className="card">
                            <div className="card-header"><h3>Urgent & Overdue</h3></div>
                            <div className="card-body">
                                {tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Done').length === 0 && invoices.filter(i => i.status === 'Overdue').length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>All clear — no urgent items 🎉</div>
                                ) : (
                                    <div className="activity-list">
                                        {invoices.filter(i => i.status === 'Overdue').map(inv => (
                                            <div key={inv.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/prevention/invoices')}>
                                                <div className="activity-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><Receipt style={{ width: 16, height: 16 }} /></div>
                                                <div className="activity-content">
                                                    <div className="activity-text"><strong>{inv.invoiceNumber}</strong> — £{inv.amount.toLocaleString()} overdue</div>
                                                    <div className="activity-time">Due {new Date(inv.dateDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Done').map(t => {
                                            const assignee = staff.find(s => s.id === t.assigneeId);
                                            const assigner = staff.find(s => s.id === t.assignedById);
                                            return (
                                                <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                                    <div className="activity-icon" style={{ background: t.priority === 'Urgent' ? 'var(--danger-bg)' : 'var(--warning-bg)', color: t.priority === 'Urgent' ? 'var(--danger)' : 'var(--warning)' }}>
                                                        <AlertCircle style={{ width: 16, height: 16 }} />
                                                    </div>
                                                    <div className="activity-content">
                                                        <div className="activity-text"><strong>{t.title}</strong></div>
                                                        <div className="activity-time">{assignee ? `${assignee.firstName} ${assignee.lastName}` : '—'}{assigner ? ` • By: ${assigner.firstName} ${assigner.lastName}` : ''} • Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <AdminMyArea state={state} user={user} navigate={navigate} />
            )}
        </>
    );
}

function AdminMyArea({ state, user, navigate }) {
    const tasks = (state.tasks || []).filter(t => t.assigneeId === user?.id && t.status !== 'Done');
    const staff = state.staff || [];
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

    const myProjects = (state.projects || []).filter(p => p.leadId === user?.id && p.status !== 'Completed');

    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date());
    const upcomingTasks = tasks.filter(t => new Date(t.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return (
        <div className="page-body">
            {/* Quick Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <StatCard icon={<CheckSquare />} value={myProjects.length} label="Active Projects" accent="var(--primary)" className="stagger-1" />
                <StatCard icon={<AlertCircle />} value={tasks.length} label="Outstanding Tasks" accent={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--info)'} className="stagger-2" />
                <StatCard icon={<Clock />} value={overdueTasks.length} label="Overdue Tasks" accent={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--success)'} className="stagger-3" />
            </div>

            <div className="grid-2">
                {/* My Projects */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Columns3 style={{ width: 18, height: 18, color: 'var(--primary)' }} /> My Projects
                        </h3>
                    </div>
                    <div className="card-body">
                        {myProjects.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No active projects assigned</div>
                        ) : (
                            <div className="activity-list">
                                {myProjects.map(p => (
                                    <div key={p.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>
                                        <div className="activity-icon" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                                            <Columns3 style={{ width: 16, height: 16 }} />
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-text"><strong>{p.name}</strong></div>
                                            <div className="activity-time">{p.status}</div>
                                        </div>
                                        <StatusBadge status={p.type} map={{ Awareness: 'primary', Recovery: 'success', Internal: 'info' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* My Tasks */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <CheckSquare style={{ width: 18, height: 18, color: 'var(--info)' }} /> My Tasks
                        </h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                    </div>
                    <div className="card-body">
                        {tasks.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>All tasks complete 🎉</div>
                        ) : (
                            <div className="activity-list">
                                {overdueTasks.map(t => (
                                    <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <div className="activity-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                                            <AlertCircle style={{ width: 16, height: 16 }} />
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-text"><strong>{t.title}</strong></div>
                                            <div className="activity-time">Overdue — was due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                        </div>
                                        <StatusBadge status={t.priority} map={taskPriorityMap} />
                                    </div>
                                ))}
                                {upcomingTasks.map(t => (
                                    <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <div className="activity-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                            <CheckSquare style={{ width: 16, height: 16 }} />
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-text"><strong>{t.title}</strong></div>
                                            <div className="activity-time">Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {t.status}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                        </div>
                                        <StatusBadge status={t.priority} map={taskPriorityMap} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════
   PREVENTION STAFF DASHBOARD
   ═══════════════════════════════════════ */
function PreventionDashboard({ state, user, navigate }) {
    const tasks = (state.tasks || []).filter(t => t.assigneeId === user.id && t.status !== 'Done');
    const staff = state.staff || [];
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };
    const workshops = (state.preventionSchedule || []).filter(w => w.facilitatorId === user.id && w.status === 'Scheduled').sort((a, b) => new Date(a.date) - new Date(b.date));
    const completedCount = (state.preventionSchedule || []).filter(w => w.facilitatorId === user.id && w.status === 'Completed').length;
    const totalAttendees = (state.preventionSchedule || []).filter(w => w.facilitatorId === user.id && w.status === 'Completed').reduce((s, w) => s + (w.attendeeCount || 0), 0);

    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date());
    const upcomingTasks = tasks.filter(t => new Date(t.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Welcome back, {user.firstName}</h1>
                    <div className="page-header-subtitle">Your prevention dashboard — workshops & tasks</div>
                </div>
            </div>
            <div className="page-body">
                {/* Quick Stats */}
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <StatCard icon={<Columns3 />} value={workshops.length} label="Upcoming Workshops" accent="var(--warning)" className="stagger-1" />
                    <StatCard icon={<CheckSquare />} value={completedCount} label="Workshops Delivered" accent="var(--success)" className="stagger-2" />
                    <StatCard icon={<Users />} value={totalAttendees} label="People Reached" accent="var(--primary)" className="stagger-3" />
                    <StatCard icon={<AlertCircle />} value={tasks.length} label="Outstanding Tasks" accent={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--info)'} className="stagger-4" />
                </div>

                <div className="grid-2">
                    {/* Upcoming Workshops */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <CalendarDays style={{ width: 18, height: 18, color: 'var(--warning)' }} /> My Upcoming Workshops
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workshop-tracker')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <div className="card-body">
                            {workshops.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No upcoming workshops scheduled</div>
                            ) : (
                                <div className="activity-list">
                                    {workshops.slice(0, 6).map(w => (
                                        <div key={w.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/workshop-tracker')}>
                                            <div className="activity-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                                <Columns3 style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{w.title}</strong></div>
                                                <div className="activity-time">
                                                    {new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {w.location}
                                                    {w.maxCapacity ? ` • ${w.attendeeCount ?? 0}/${w.maxCapacity} capacity` : ''}
                                                </div>
                                            </div>
                                            <StatusBadge status={w.workshopType} map={{ Awareness: 'primary', Prevention: 'warning', Training: 'info' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Tasks */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <CheckSquare style={{ width: 18, height: 18, color: 'var(--info)' }} /> My Tasks
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <div className="card-body">
                            {tasks.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>All tasks complete 🎉</div>
                            ) : (
                                <div className="activity-list">
                                    {overdueTasks.map(t => (
                                        <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                            <div className="activity-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                                                <AlertCircle style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{t.title}</strong></div>
                                                <div className="activity-time">Overdue — was due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                            </div>
                                            <StatusBadge status={t.priority} map={taskPriorityMap} />
                                        </div>
                                    ))}
                                    {upcomingTasks.map(t => (
                                        <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                            <div className="activity-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                                <CheckSquare style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{t.title}</strong></div>
                                                <div className="activity-time">Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {t.status}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                            </div>
                                            <StatusBadge status={t.priority} map={taskPriorityMap} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════
   RECOVERY STAFF DASHBOARD
   ═══════════════════════════════════════ */
function RecoveryDashboard({ state, user, navigate }) {
    const tasks = (state.tasks || []).filter(t => t.assigneeId === user.id && t.status !== 'Done');
    const staff = state.staff || [];
    const getStaffName = (id) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };
    const seekers = state.recoverySeekers || [];
    const activeSeekers = seekers.filter(s => s.status === 'Active');

    // Find upcoming coaching sessions — we use the most recent session date + 7 days as "next session"
    const seekersWithNextSession = activeSeekers.map(s => {
        const sessions = s.coachingSessions || [];
        const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
        const nextSessionDate = lastSession ? new Date(new Date(lastSession.date).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
        return { ...s, lastSession, nextSessionDate };
    }).sort((a, b) => {
        if (!a.nextSessionDate) return 1;
        if (!b.nextSessionDate) return -1;
        return a.nextSessionDate - b.nextSessionDate;
    });

    const completedRecovery = seekers.filter(s => s.status === 'Completed').length;
    const totalSessions = seekers.reduce((s, sk) => s + (sk.coachingSessions?.length || 0), 0);

    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date());
    const upcomingTasks = tasks.filter(t => new Date(t.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Welcome back, {user.firstName}</h1>
                    <div className="page-header-subtitle">Your recovery dashboard — seekers & sessions</div>
                </div>
            </div>
            <div className="page-body">
                {/* Quick Stats */}
                <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    <StatCard icon={<HeartHandshake />} value={activeSeekers.length} label="Active Seekers" accent="var(--success)" className="stagger-1" />
                    <StatCard icon={<Target />} value={completedRecovery} label="Programmes Completed" accent="var(--primary)" className="stagger-2" />
                    <StatCard icon={<FileText />} value={totalSessions} label="Total Sessions" accent="var(--info)" className="stagger-3" />
                    <StatCard icon={<AlertCircle />} value={tasks.length} label="Outstanding Tasks" accent={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--info)'} className="stagger-4" />
                </div>

                <div className="grid-2">
                    {/* Upcoming Sessions */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <CalendarDays style={{ width: 18, height: 18, color: 'var(--success)' }} /> Upcoming Sessions
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/treatment-tracker')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <div className="card-body">
                            {seekersWithNextSession.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>No active seekers assigned</div>
                            ) : (
                                <div className="activity-list">
                                    {seekersWithNextSession.map(s => (
                                        <div key={s.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/treatment-tracker')}>
                                            <div className="activity-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                                                <HeartHandshake style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{s.firstName} {s.lastName}</strong></div>
                                                <div className="activity-time">
                                                    {s.nextSessionDate ? `Next: ${s.nextSessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : 'No sessions yet'}
                                                    {s.lastSession ? ` • Last rating: ${s.lastSession.progressRating}/10` : ''}
                                                </div>
                                            </div>
                                            <StatusBadge status={s.riskLevel} map={{ High: 'danger', Medium: 'warning', Low: 'success' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Tasks */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <CheckSquare style={{ width: 18, height: 18, color: 'var(--info)' }} /> My Tasks
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View All <ArrowRight style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <div className="card-body">
                            {tasks.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>All tasks complete 🎉</div>
                            ) : (
                                <div className="activity-list">
                                    {overdueTasks.map(t => (
                                        <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                            <div className="activity-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                                                <AlertCircle style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{t.title}</strong></div>
                                                <div className="activity-time">Overdue — was due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                            </div>
                                            <StatusBadge status={t.priority} map={taskPriorityMap} />
                                        </div>
                                    ))}
                                    {upcomingTasks.map(t => (
                                        <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                            <div className="activity-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                                <CheckSquare style={{ width: 16, height: 16 }} />
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text"><strong>{t.title}</strong></div>
                                                <div className="activity-time">Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {t.status}{t.assignedById ? ` • By: ${getStaffName(t.assignedById)}` : ''}</div>
                                            </div>
                                            <StatusBadge status={t.priority} map={taskPriorityMap} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════
   ROUTER — picks the right dashboard
   ═══════════════════════════════════════ */
export default function Dashboard() {
    const { state } = useData();
    const { user: authUser } = useAuth();
    const navigate = useNavigate();

    // Find the staff record matching the logged-in user's email
    const staffUser = authUser ? (state.staff || []).find(s => s.email === authUser.email) : null;

    if (!staffUser || staffUser.dashboardRole === 'admin') {
        return <AdminDashboard state={state} user={staffUser} navigate={navigate} />;
    }

    if (staffUser.dashboardRole === 'prevention') {
        return <PreventionDashboard state={state} user={staffUser} navigate={navigate} />;
    }

    if (staffUser.dashboardRole === 'recovery') {
        return <RecoveryDashboard state={state} user={staffUser} navigate={navigate} />;
    }

    // Fallback
    return <AdminDashboard state={state} user={staffUser} navigate={navigate} />;
}

