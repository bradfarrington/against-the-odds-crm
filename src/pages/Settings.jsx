import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Sun, Moon, Database, RotateCcw, Link, CheckCircle, Mail } from 'lucide-react';

export default function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const [isOutlookConnected, setIsOutlookConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        async function checkConnection() {
            if (!user) return;
            const { data } = await supabase
                .from('user_oauth_connections')
                .select('id, microsoft_email')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) setIsOutlookConnected(true);
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
        const state = user.id;

        const loginUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=offline_access%20Mail.ReadWrite%20Mail.Send%20User.Read&state=${state}`;

        window.location.href = loginUrl;
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
                                            <CheckCircle size={16} /> Connected
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
