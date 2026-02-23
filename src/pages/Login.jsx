import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('login'); // 'login' | 'reset'
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (authError) throw authError;
            // AuthContext's onAuthStateChange will handle the redirect
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Invalid email or password. Please try again.'
                : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/`,
            });
            if (resetError) throw resetError;
            setResetSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Background decoration */}
            <div className="login-bg-decoration">
                <div className="login-bg-orb login-bg-orb-1" />
                <div className="login-bg-orb login-bg-orb-2" />
                <div className="login-bg-orb login-bg-orb-3" />
            </div>

            <div className="login-container">
                {/* Left — Branding panel */}
                <div className="login-brand-panel">
                    <div className="login-brand-content">
                        <img
                            src="/logo.png"
                            alt="Against the Odds"
                            className="login-brand-logo"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <h1 className="login-brand-title">Against the Odds</h1>
                        <p className="login-brand-subtitle">CRM & Operations Hub</p>
                        <div className="login-brand-features">
                            <div className="login-feature">
                                <div className="login-feature-dot" />
                                <span>Prevention & Awareness</span>
                            </div>
                            <div className="login-feature">
                                <div className="login-feature-dot" />
                                <span>Recovery Coaching</span>
                            </div>
                            <div className="login-feature">
                                <div className="login-feature-dot" />
                                <span>Partner Management</span>
                            </div>
                        </div>
                    </div>
                    <div className="login-brand-footer">
                        <span>Reducing gambling harm through education & support</span>
                    </div>
                </div>

                {/* Right — Form panel */}
                <div className="login-form-panel">
                    {mode === 'login' ? (
                        <>
                            <div className="login-form-header">
                                <h2>Welcome back</h2>
                                <p>Sign in to your account to continue</p>
                            </div>

                            <form onSubmit={handleLogin} className="login-form">
                                {error && (
                                    <div className="login-error">
                                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="login-field">
                                    <label>Email address</label>
                                    <div className="login-input-wrapper">
                                        <Mail className="login-input-icon" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@againsttheodds.org.uk"
                                            required
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="login-field">
                                    <label>Password</label>
                                    <div className="login-input-wrapper">
                                        <Lock className="login-input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="login-toggle-password"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="login-submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="login-spinner" />
                                            Signing in…
                                        </>
                                    ) : (
                                        'Sign in'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="login-link"
                                    onClick={() => { setMode('reset'); setError(''); }}
                                >
                                    Forgot your password?
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="login-form-header">
                                <h2>Reset password</h2>
                                <p>Enter your email and we'll send a reset link</p>
                            </div>

                            {resetSent ? (
                                <div className="login-reset-success">
                                    <div className="login-reset-success-icon">✓</div>
                                    <h3>Check your inbox</h3>
                                    <p>We've sent a password reset link to <strong>{email}</strong></p>
                                    <button
                                        className="login-link"
                                        onClick={() => { setMode('login'); setResetSent(false); setError(''); }}
                                    >
                                        Back to sign in
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword} className="login-form">
                                    {error && (
                                        <div className="login-error">
                                            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="login-field">
                                        <label>Email address</label>
                                        <div className="login-input-wrapper">
                                            <Mail className="login-input-icon" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@againsttheodds.org.uk"
                                                required
                                                autoComplete="email"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="login-submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="login-spinner" />
                                                Sending…
                                            </>
                                        ) : (
                                            'Send reset link'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="login-link"
                                        onClick={() => { setMode('login'); setError(''); }}
                                    >
                                        Back to sign in
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
