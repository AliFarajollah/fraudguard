import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/** Sun icon */
function SunIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" /><line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
    );
}

/** Moon icon */
function MoonIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

/**
 * Shown immediately after a non-admin registers.
 * The user has no JWT and cannot access any protected route.
 * They simply need to wait for an admin to approve their account.
 */
export function PendingApprovalPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex items-center justify-center px-4 page-bg">
            {/* Theme toggle */}
            <button onClick={toggleTheme} className="theme-toggle absolute top-4 right-4"
                    title="Toggle theme">
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>

            <div className="card w-full max-w-lg p-10 text-center">
                {/* Animated clock icon */}
                <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                         style={{ background: 'var(--status-warning-soft)',
                                  border: '2px solid var(--status-warning-border)' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                             stroke="var(--status-warning)" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-full animate-ping"
                         style={{ background: 'var(--status-warning)', opacity: 0.15 }} />
                </div>

                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Account Pending Approval
                </h1>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Your account has been created successfully and is awaiting review.
                </p>
                <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    An administrator will approve your access shortly. You'll be able to log in once your account is activated.
                </p>

                {/* What happens next */}
                <div className="rounded-xl p-4 mb-8 text-left space-y-3"
                     style={{ background: 'var(--bg-card-hover)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                         style={{ color: 'var(--text-muted)' }}>
                        What happens next?
                    </div>
                    {[
                        { icon: '🔔', text: 'An admin is notified of your registration.' },
                        { icon: '✅', text: 'Once approved, you can log in with your credentials.' },
                        { icon: '❌', text: 'If rejected, you will see a message on the login page.' },
                    ].map(({ icon, text }) => (
                        <div key={text} className="flex items-start gap-3 text-sm"
                             style={{ color: 'var(--text-secondary)' }}>
                            <span className="text-base flex-shrink-0">{icon}</span>
                            <span>{text}</span>
                        </div>
                    ))}
                </div>

                <Link to="/login"
                      className="btn-primary text-sm inline-flex items-center gap-2"
                      style={{ textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
