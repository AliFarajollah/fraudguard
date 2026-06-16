import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

/** Sun icon for light mode toggle */
function SunIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

/** Moon icon for dark mode toggle */
function MoonIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

/** Role badge — distinct colour per role so it's immediately recognisable */
function RoleBadge({ role }: { role: string }) {
    // 'viewer' is displayed as 'Manager' in the UI throughout the app
    const LABELS: Record<string, string> = { admin: 'Admin', analyst: 'Analyst', viewer: 'Manager' };
    const cfg: Record<string, { bg: string; color: string }> = {
        admin:   { bg: 'var(--status-danger)',   color: 'white' },
        analyst: { bg: 'var(--brand-primary)',    color: 'white' },
        viewer:  { bg: 'var(--text-muted)',       color: 'white' },
    };
    const style = cfg[role] ?? cfg.viewer;
    return (
        <span
            className="badge"
            style={{
                background: style.bg,
                color: style.color,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                padding: '2px 8px',
                borderRadius: '999px',
                textTransform: 'uppercase',
            }}
        >
            {LABELS[role] ?? role}
        </span>
    );
}

export function NavBar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [flaggedCount, setFlaggedCount] = useState(0);

    // Poll pending approvals count every 30s when logged in as admin
    useEffect(() => {
        if (user?.role !== 'admin') return;
        const fetchCount = async () => {
            try {
                const { data } = await apiClient.get<{ count: number }>('/users/pending/count');
                setPendingCount(data.count);
            } catch { /* silently ignore — nav badge is non-critical */ }
        };
        void fetchCount();
        const interval = setInterval(fetchCount, 30_000);
        return () => clearInterval(interval);
    }, [user?.role]);

    // Poll flagged predictions count every 60s for review queue badge
    useEffect(() => {
        if (!user) return;
        const fetchFlagged = async () => {
            try {
                const { data } = await apiClient.get<unknown[]>('/predictions/flagged');
                setFlaggedCount(data.length);
            } catch { /* silently ignore */ }
        };
        void fetchFlagged();
        const interval = setInterval(fetchFlagged, 60_000);
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive
                ? 'text-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
        }`;

    const isViewer  = user?.role === 'viewer';
    const isAdmin   = user?.role === 'admin';

    return (
        <nav className="nav-bar">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                             style={{ background: 'var(--brand-primary)' }}>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-inverse)' }}>F</span>
                        </div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            FraudGuard
                        </h1>
                    </div>

                    {/* Navigation links — filtered by role */}
                    <div className="flex gap-1">
                        <NavLink to="/dashboard" className={navLinkClass}>
                            Dashboard
                        </NavLink>

                        {/* Hidden from viewers — they cannot score transactions */}
                        {!isViewer && (
                            <NavLink to="/score" className={navLinkClass}>
                                Score Transaction
                            </NavLink>
                        )}

                        <NavLink to="/transactions" className={navLinkClass}>
                            Transactions
                        </NavLink>

                        <NavLink to="/reviews" className={navLinkClass}>
                            <span className="flex items-center gap-1.5">
                                Review Queue
                                {flaggedCount > 0 && (
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full leading-none"
                                          style={{ background: 'var(--status-danger)', color: 'white',
                                                   fontSize: '10px', minWidth: '18px', textAlign: 'center' }}>
                                        {flaggedCount}
                                    </span>
                                )}
                            </span>
                        </NavLink>

                        {/* Analytics — visible to all, especially valuable for managers */}
                        <NavLink to="/analytics" className={navLinkClass}>
                            <span className="flex items-center gap-1">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6"  y1="20" x2="6"  y2="14" />
                                </svg>
                                Analytics
                            </span>
                        </NavLink>

                        <NavLink to="/reports" className={navLinkClass}>Reports</NavLink>
                        <NavLink to="/model/performance" className={navLinkClass}>Model Monitor</NavLink>
                        <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>

                        {/* Admin-only links */}
                        {isAdmin && (
                            <>
                                <NavLink to="/admin/users" className={navLinkClass}>
                                    <span className="flex items-center gap-1.5 relative">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Users
                                        {pendingCount > 0 && (
                                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full leading-none"
                                                  style={{ background: 'var(--status-danger)', color: 'white',
                                                           fontSize: '10px', minWidth: '18px', textAlign: 'center' }}>
                                                {pendingCount}
                                            </span>
                                        )}
                                    </span>
                                </NavLink>
                                <NavLink to="/audit" className={navLinkClass}>Audit Log</NavLink>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme toggle */}
                    <button
                        id="btn-theme-toggle"
                        onClick={toggleTheme}
                        className="theme-toggle"
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>

                    {/* User info + role badge */}
                    {user && (
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2 mb-0.5">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {user.email}
                                </span>
                                <RoleBadge role={user.role} />
                            </div>
                        </div>
                    )}

                    <button onClick={handleLogout} className="btn-ghost text-sm">
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    );
}