import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
    children: ReactNode;
    /** If provided, only users whose role is in this list can view the page. */
    allowedRoles?: string[];
}

/**
 * Wraps any route that requires authentication (and optionally a specific role).
 * - While auth state is loading (first render) → spinner.
 * - If not authenticated → redirect to /login.
 * - If authenticated but role is not allowed → Access Denied card.
 * - Otherwise → renders children.
 */
export function ProtectedRoute({ children, allowedRoles }: Props) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center page-bg">
                <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen page-bg flex items-center justify-center px-6">
                <div className="card p-10 max-w-md w-full text-center">
                    {/* Lock icon */}
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                        style={{ background: 'var(--status-danger-soft)', border: '2px solid var(--status-danger-border)' }}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--status-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Access Denied
                    </h2>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Your role <strong style={{ color: 'var(--text-primary)' }}>{user.role}</strong> does not have
                        permission to view this page.
                    </p>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                        Required: {allowedRoles.join(' or ')}
                    </p>
                    <a
                        href="/dashboard"
                        className="btn-primary text-sm inline-block"
                        style={{ textDecoration: 'none' }}
                    >
                        ← Back to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}