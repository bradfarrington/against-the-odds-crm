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
    const [chartRange, setChartRange] = useState('6m');
    const [recoveryChartRange, setRecoveryChartRange] = useState('6m');
    const [financialRange, setFinancialRange] = useState('6m');
    const [invoiceCategory, setInvoiceCategory] = useState('All');

    const workshops = state.preventionSchedule || [];
    const seekers = state.recoverySeekers || [];
    const invoices = state.invoices || [];
    const tasks = state.tasks || [];
    const staff = state.staff || [];

    // Prevention KPIs (computed after month range is built below)
    const now = new Date();

    // Recovery KPIs (computed after month ranges are built below)

    // Tasks Overview
    const openTasks = tasks.filter(t => t.status !== 'Done').length;
    const urgentTasks = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Done').length;

    // Chart data — derived from actual DB records
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buildMonthRange = (range) => {
        const n = new Date();
        const months = [];
        if (range === '1m') {
            const start = new Date(n.getFullYear(), n.getMonth(), 1);
            months.push({ year: n.getFullYear(), month: n.getMonth(), label: `1 ${monthNames[n.getMonth()]}`, from: start, to: start });
            months.push({ year: n.getFullYear(), month: n.getMonth(), label: `${n.getDate()} ${monthNames[n.getMonth()]}`, from: start, to: n });
        } else if (range === '6m') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
                months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthNames[d.getMonth()] });
            }
        } else if (range === 'next-6m') {
            for (let i = 0; i <= 5; i++) {
                const d = new Date(n.getFullYear(), n.getMonth() + i, 1);
                months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthNames[d.getMonth()] });
            }
        } else if (range === 'this-year') {
            for (let m = 0; m <= 11; m++) {
                months.push({ year: n.getFullYear(), month: m, label: monthNames[m] });
            }
        } else if (range === 'last-year') {
            for (let m = 0; m <= 11; m++) {
                months.push({ year: n.getFullYear() - 1, month: m, label: monthNames[m] });
            }
        }
        return months;
    };
    const preventionMonthRange = buildMonthRange(chartRange);
    const recoveryMonthRange = buildMonthRange(recoveryChartRange);

    // Helper: check if a date falls within any month in a range
    const inRange = (dateStr, range) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return range.some(({ year, month }) => d.getFullYear() === year && d.getMonth() === month);
    };

    // Financial — filtered by range + category
    const financialMonthRange = buildMonthRange(financialRange);
    const filteredWorkshops = workshops.filter(w => inRange(w.created_at || w.createdAt, financialMonthRange));
    const forecastedRevenue = filteredWorkshops.reduce((s, w) => s + (parseFloat(w.value) || 0), 0);

    const filteredInvoices = invoices
        .filter(i => invoiceCategory === 'All' || i.category === invoiceCategory)
        .filter(i => inRange(i.dateIssued || i.created_at || i.createdAt, financialMonthRange));
    const totalInvoiced = filteredInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
    const totalOutstanding = filteredInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);

    // Prevention KPIs — filtered by selected chart range
    const scheduledWorkshops = workshops.filter(w => w.date && w.endTime && new Date(w.date) > now && inRange(w.date, preventionMonthRange)).length;
    const completedWorkshops = workshops.filter(w => w.endTime && new Date(w.endTime) < now && inRange(w.endTime, preventionMonthRange)).length;
    const totalAttendees = workshops.filter(w => w.endTime && new Date(w.endTime) < now && inRange(w.endTime, preventionMonthRange)).reduce((s, w) => s + (w.attendeeCount || 0), 0);

    const workshopChartData = preventionMonthRange.map((entry) => {
        const { year, month, label } = entry;
        const useDateRange = !!entry.from;
        const completedInMonth = workshops.filter(w => {
            if (!w.endTime) return false;
            const end = new Date(w.endTime);
            if (useDateRange) return end >= entry.from && end <= entry.to;
            return end < now && end.getFullYear() === year && end.getMonth() === month;
        });
        const scheduledInMonth = workshops.filter(w => {
            if (!w.date || !w.endTime) return false;
            const start = new Date(w.date);
            if (useDateRange) return start >= entry.from && start <= entry.to;
            return start > now && start.getFullYear() === year && start.getMonth() === month;
        });
        return {
            month: label,
            completed: completedInMonth.length,
            scheduled: scheduledInMonth.length,
        };
    });

    // Recovery KPIs — filtered by selected recovery chart range
    // Seekers use pipeline stage names as status, not 'Active'/'Completed'
    const activeSeekers = seekers.filter(s => inRange(s.created_at || s.createdAt, recoveryMonthRange)).length;
    const completedRecovery = seekers.filter(s => inRange(s.created_at || s.createdAt, recoveryMonthRange)).reduce((sum, s) => sum + (s.coachingSessions?.length || 0) > 0 ? sum + 1 : sum, 0);
    const allSessions = seekers.flatMap(sk => (sk.coachingSessions || []));
    const totalSessions = allSessions.filter(cs => inRange(cs.date, recoveryMonthRange)).length;

    const recoveryChartData = recoveryMonthRange.map((entry) => {
        const { year, month, label } = entry;
        const useDateRange = !!entry.from;
        const sessionsInMonth = allSessions.filter(cs => {
            if (!cs.date) return false;
            const d = new Date(cs.date);
            if (useDateRange) return d >= entry.from && d <= entry.to;
            return d.getFullYear() === year && d.getMonth() === month;
        }).length;
        const seekersInMonth = seekers.filter(s => {
            const d = new Date(s.created_at || s.createdAt);
            if (useDateRange) return d >= entry.from && d <= entry.to;
            return d.getFullYear() === year && d.getMonth() === month;
        }).length;
        return { month: label, seekers: seekersInMonth, sessions: sessionsInMonth };
    });

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
                                <div style={{ display: 'flex', gap: 2, marginBottom: 'var(--space-md)', justifyContent: 'center' }}>
                                    {[{ key: '1m', label: 'This Month' }, { key: '6m', label: 'Last 6M' }, { key: 'next-6m', label: 'Next 6M' }, { key: 'this-year', label: 'This Year' }, { key: 'last-year', label: 'Last Year' }].map(opt => (
                                        <button key={opt.key} type="button" onClick={() => setChartRange(opt.key)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: chartRange === opt.key ? 'var(--primary)' : 'var(--bg-secondary)', color: chartRange === opt.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>{opt.label}</button>
                                    ))}
                                </div>
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={workshopChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                                            <Bar dataKey="scheduled" fill="var(--info)" radius={[4, 4, 0, 0]} name="Scheduled" />
                                            <Bar dataKey="completed" fill="var(--success)" radius={[4, 4, 0, 0]} name="Completed" />
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
                                <div style={{ display: 'flex', gap: 2, marginBottom: 'var(--space-md)', justifyContent: 'center' }}>
                                    {[{ key: '1m', label: 'This Month' }, { key: '6m', label: 'Last 6M' }, { key: 'next-6m', label: 'Next 6M' }, { key: 'this-year', label: 'This Year' }, { key: 'last-year', label: 'Last Year' }].map(opt => (
                                        <button key={opt.key} type="button" onClick={() => setRecoveryChartRange(opt.key)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: recoveryChartRange === opt.key ? 'var(--success)' : 'var(--bg-secondary)', color: recoveryChartRange === opt.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>{opt.label}</button>
                                    ))}
                                </div>
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={recoveryChartData}>
                                            <defs>
                                                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.15} />
                                                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                                            <Area type="monotone" dataKey="seekers" stroke="var(--success)" strokeWidth={2} fill="url(#activeGrad)" name="New Seekers" />
                                            <Area type="monotone" dataKey="sessions" stroke="var(--info)" strokeWidth={2} fill="none" name="Sessions" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview */}
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                                {[{ key: '1m', label: 'This Month' }, { key: '6m', label: 'Last 6M' }, { key: 'next-6m', label: 'Next 6M' }, { key: 'this-year', label: 'This Year' }, { key: 'last-year', label: 'Last Year' }].map(opt => (
                                    <button key={opt.key} type="button" onClick={() => setFinancialRange(opt.key)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: financialRange === opt.key ? 'var(--primary)' : 'var(--bg-secondary)', color: financialRange === opt.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease' }}>{opt.label}</button>
                                ))}
                            </div>
                            <select
                                value={invoiceCategory}
                                onChange={e => setInvoiceCategory(e.target.value)}
                                style={{ padding: '4px 24px 4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238B8FA3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                            >
                                <option value="All">All Invoices</option>
                                <option value="Prevention">Prevention</option>
                                <option value="Recovery">Recovery</option>
                            </select>
                        </div>
                        <div className="stats-grid-5">
                            <StatCard icon={<Target />} value={`£${forecastedRevenue.toLocaleString()}`} label="Forecasted Revenue" accent="var(--primary)" className="stagger-1" />
                            <StatCard icon={<Receipt />} value={`£${totalInvoiced.toLocaleString()}`} label="Total Invoiced" accent="var(--info)" className="stagger-2" />
                            <StatCard icon={<TrendingUp />} value={`£${totalPaid.toLocaleString()}`} label="Paid" accent="var(--success)" className="stagger-3" />
                            <StatCard icon={<Clock />} value={`£${totalOutstanding.toLocaleString()}`} label="Outstanding" accent="var(--warning)" className="stagger-4" />
                            <StatCard icon={<CheckSquare />} value={openTasks} label={`Open Tasks (${urgentTasks} urgent)`} accent="var(--info)" className="stagger-5" />
                        </div>
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

