import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData, ACTIONS } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import { Sun, Moon, Database, RotateCcw, Link, CheckCircle, Mail, Plus, Edit2, Trash2, X, Check, Building2 } from 'lucide-react';

function LookupListManager({ title, items, addAction, updateAction, deleteAction, dispatch }) {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        dispatch({ type: addAction, payload: { name: newName.trim(), sortOrder: items.length } });
        setNewName('');
    };

    const handleUpdate = (item) => {
        if (!editingName.trim()) return;
        dispatch({ type: updateAction, payload: { ...item, name: editingName.trim() } });
        setEditingId(null);
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure? Existing records using this value will keep their current text but this option will no longer appear in dropdowns.')) {
            dispatch({ type: deleteAction, payload: id });
        }
    };

    return (
        <div>
            <div style={{ fontWeight: 500, marginBottom: 'var(--space-sm)', fontSize: 14 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '6px 0' }}>
                        {editingId === item.id ? (
                            <>
                                <input
                                    className="form-input"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(item); if (e.key === 'Escape') setEditingId(null); }}
                                    style={{ flex: 1 }}
                                    autoFocus
                                />
                                <button className="btn btn-ghost btn-sm" onClick={() => handleUpdate(item)} title="Save" style={{ color: 'var(--success)' }}>
                                    <Check size={14} />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} title="Cancel">
                                    <X size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                <span style={{ flex: 1, fontSize: 14 }}>{item.name}</span>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(item.id); setEditingName(item.name); }} title="Edit">
                                    <Edit2 size={13} />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} title="Delete" style={{ color: 'var(--danger)' }}>
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <input
                    className="form-input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}…`}
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newName.trim()}>
                    <Plus size={14} /> Add
                </button>
            </form>
        </div>
    );
}

export default function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const { state, dispatch } = useData();
    const [isOutlookConnected, setIsOutlookConnected] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState('');
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        async function checkConnection() {
            if (!user) return;
            const { data } = await supabase
                .from('user_oauth_connections')
                .select('id, microsoft_email')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                setIsOutlookConnected(true);
                setConnectedEmail(data.microsoft_email);
            }
            setIsChecking(false);
        }
        checkConnection();
    }, [user]);

    const handleConnectOutlook = () => {
        if (!user) return;

        const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'PENDING_CLIENT_ID';
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (!supabaseUrl) {
            alert("Supabase URL not configured.");
            return;
        }

        const redirectUri = `${supabaseUrl}/functions/v1/outlook-auth`;
        const stateParam = user.id;

        const loginUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=offline_access%20Calendars.ReadWrite%20Mail.ReadWrite%20Mail.Send%20User.Read&state=${stateParam}&prompt=select_account`;

        window.location.href = loginUrl;
    };

    const handleDisconnectOutlook = async () => {
        if (!user) return;

        if (!confirm('Are you sure you want to disconnect your Microsoft Outlook account? You will no longer be able to send emails from the CRM.')) {
            return;
        }

        setIsChecking(true);
        const { error } = await supabase
            .from('user_oauth_connections')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            alert(`Error disconnecting account: ${error.message}`);
        } else {
            setIsOutlookConnected(false);
            setConnectedEmail('');
        }
        setIsChecking(false);
    };

    const handleClearData = () => {
        if (confirm('This will delete all CRM data and reload with default seed data. Are you sure?')) {
            localStorage.removeItem('ato-crm-data');
            window.location.reload();
        }
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Settings</h1>
                    <div className="page-header-subtitle">Manage your CRM preferences</div>
                </div>
            </div>
            <div className="page-body">
                <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {/* Company Configuration */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <Building2 size={18} /> Company Configuration
                            </h3>
                        </div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                            <LookupListManager
                                title="Company Types"
                                items={state.companyTypes || []}
                                addAction={ACTIONS.ADD_COMPANY_TYPE}
                                updateAction={ACTIONS.UPDATE_COMPANY_TYPE}
                                deleteAction={ACTIONS.DELETE_COMPANY_TYPE}
                                dispatch={dispatch}
                            />
                            <div style={{ borderTop: '1px solid var(--border)' }} />
                            <LookupListManager
                                title="Industries"
                                items={state.companyIndustries || []}
                                addAction={ACTIONS.ADD_COMPANY_INDUSTRY}
                                updateAction={ACTIONS.UPDATE_COMPANY_INDUSTRY}
                                deleteAction={ACTIONS.DELETE_COMPANY_INDUSTRY}
                                dispatch={dispatch}
                            />
                            <div style={{ borderTop: '1px solid var(--border)' }} />
                            <LookupListManager
                                title="Company Statuses"
                                items={state.companyStatuses || []}
                                addAction={ACTIONS.ADD_COMPANY_STATUS}
                                updateAction={ACTIONS.UPDATE_COMPANY_STATUS}
                                deleteAction={ACTIONS.DELETE_COMPANY_STATUS}
                                dispatch={dispatch}
                            />
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="card">
                        <div className="card-header"><h3>Appearance</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>Theme</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Switch between light and dark mode</div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <button
                                        className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => theme !== 'light' && toggleTheme()}
                                    >
                                        <Sun style={{ width: 16, height: 16 }} /> Light
                                    </button>
                                    <button
                                        className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => theme !== 'dark' && toggleTheme()}
                                    >
                                        <Moon style={{ width: 16, height: 16 }} /> Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="card">
                        <div className="card-header"><h3>Data Management</h3></div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>Storage</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All data is stored locally in your browser</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Database style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>localStorage</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--danger)' }}>Reset All Data</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Clear everything and reload default seed data</div>
                                </div>
                                <button className="btn btn-secondary" onClick={handleClearData}>
                                    <RotateCcw style={{ width: 16, height: 16 }} /> Reset Data
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Integrations */}
                    <div className="card">
                        <div className="card-header"><h3>Connected Accounts</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: '#0078D4', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>Microsoft 365 Outlook</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            Connect your email to sync conversations with contacts and send emails directly from the CRM.
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {isChecking ? (
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Checking...</span>
                                    ) : isOutlookConnected ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
                                                <CheckCircle size={16} /> Connected as {connectedEmail}
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={handleConnectOutlook}>
                                                    <RotateCcw size={14} /> Reconnect
                                                </button>
                                                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }} onClick={handleDisconnectOutlook}>
                                                    Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="btn btn-primary" onClick={handleConnectOutlook}>
                                            <Link size={16} /> Connect Account
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div className="card">
                        <div className="card-header"><h3>About</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
                                <img src="/logo.png" alt="ATO" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 16 }}>Against the Odds CRM</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        A comprehensive CRM for managing awareness, prevention, and recovery coaching operations.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
