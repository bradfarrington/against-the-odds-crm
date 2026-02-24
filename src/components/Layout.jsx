import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
    LayoutDashboard,
    Building2,
    Users,
    CheckSquare,
    NotebookPen,
    CalendarDays,
    Columns3,
    FolderOpen,
    Receipt,
    HeartHandshake,
    FolderKanban,
    FileText,
    UsersRound,
    Settings,
    LogOut,
    Loader2,
    Menu,
    X,
} from 'lucide-react';

const navSections = [
    {
        items: [
            { to: '/', icon: <LayoutDashboard />, label: 'Dashboard' },
        ],
    },
    {
        label: 'Core',
        items: [
            { to: '/calendar', icon: <CalendarDays />, label: 'Calendar' },
            { to: '/contacts', icon: <Users />, label: 'Contacts' },
            { to: '/companies', icon: <Building2 />, label: 'Companies' },
            { to: '/tasks', icon: <CheckSquare />, label: 'Tasks' },
            { to: '/meeting-notes', icon: <NotebookPen />, label: 'Meeting Notes' },
        ],
    },
    {
        label: 'Prevention',
        items: [
            { to: '/workshop-tracker', icon: <Columns3 />, label: 'Workshop Tracker' },
            { to: '/prevention/resources', icon: <FolderOpen />, label: 'Resources' },
            { to: '/prevention/invoices', icon: <Receipt />, label: 'Invoices' },
        ],
    },
    {
        label: 'Recovery',
        items: [
            { to: '/recovery-seekers', icon: <UsersRound />, label: 'Recovery Seekers' },
            { to: '/treatment-tracker', icon: <HeartHandshake />, label: 'Treatment Tracker' },
            { to: '/recovery/resources', icon: <FolderOpen />, label: 'Resources' },
            { to: '/recovery/invoices', icon: <Receipt />, label: 'Invoices' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { to: '/projects', icon: <FolderKanban />, label: 'Projects' },
            { to: '/contracts', icon: <FileText />, label: 'Contracts' },
            { to: '/staff-hub', icon: <UsersRound />, label: 'Staff Hub' },
        ],
    },
];

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme } = useTheme();
    const { user, logout } = useAuth();
    const { state, dataLoading, dataError, reloadData } = useData();

    const staff = state.staff || [];
    // Try to find the logged-in user's staff record by email
    const currentStaff = user ? staff.find(s => s.email === user.email) : null;

    const userDisplayName = currentStaff
        ? `${currentStaff.firstName} ${currentStaff.lastName}`
        : user?.email?.split('@')[0] || 'User';
    const userRole = currentStaff?.role || 'Team Member';
    const userInitials = currentStaff
        ? `${currentStaff.firstName[0]}${currentStaff.lastName[0]}`
        : userDisplayName[0]?.toUpperCase() || 'U';

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    // Show loading state while data is being fetched
    if (dataLoading) {
        return (
            <div className="app-loading">
                <Loader2 className="app-loading-spinner" />
                <span>Loading data…</span>
            </div>
        );
    }

    // Show error state if data fetch failed
    if (dataError) {
        return (
            <div className="app-loading">
                <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-md)', fontWeight: 600 }}>
                    Failed to load data
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 13 }}>
                    {dataError}
                </div>
                <button className="btn btn-primary" onClick={reloadData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <div className="mobile-header-logo">
                    <img src="/logo.png" alt="Against the Odds" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                    <span className="mobile-header-title">Against the Odds</span>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setIsSidebarOpen(true)}>
                    <Menu style={{ width: 24, height: 24 }} />
                </button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 'var(--space-md)' }}>
                    <div className="sidebar-logo">
                        <img src="/logo.png" alt="Against the Odds" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
                    </div>
                    <button className="btn btn-ghost btn-icon mobile-close-btn" onClick={() => setIsSidebarOpen(false)} style={{ display: 'none' }}>
                        <X style={{ width: 24, height: 24 }} />
                    </button>
                </div>

                {/* Logged-in user */}
                <div className="user-selector">
                    <div className="user-selector-btn" style={{ cursor: 'default' }}>
                        <div className="user-avatar" style={{ background: 'var(--primary)' }}>
                            {userInitials}
                        </div>
                        <div className="user-selector-info">
                            <div className="user-selector-name">{userDisplayName}</div>
                            <div className="user-selector-role">{userRole}</div>
                        </div>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleLogout}
                            title="Sign out"
                            style={{ padding: 6, marginLeft: 'auto' }}
                        >
                            <LogOut style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navSections.map((section, i) => (
                        <div key={section.label || i}>
                            {section.label && <div className="sidebar-section-label">{section.label}</div>}
                            {section.items.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    {item.icon}
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <NavLink to="/settings" className={({ isActive }) => `settings-link ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        <Settings style={{ width: 18, height: 18 }} />
                        Settings
                    </NavLink>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
