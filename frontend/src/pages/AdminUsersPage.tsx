import { useState, useEffect, useCallback } from 'react';
import { NavBar } from '../components/NavBar';
import { apiClient } from '../api/client';
import axios from 'axios';
import type { User } from '../types';
import { useAuth } from '../context/AuthContext';

type UserRole = 'admin' | 'analyst' | 'viewer';

const ROLES: UserRole[] = ['admin', 'analyst', 'viewer'];

const ROLE_COLORS: Record<UserRole, { bg: string; color: string }> = {
    admin:   { bg: 'var(--status-danger)',  color: 'white' },
    analyst: { bg: 'var(--brand-primary)',   color: 'white' },
    viewer:  { bg: 'var(--text-muted)',      color: 'white' },
};

/** Maps backend role values to user-friendly display labels */
const ROLE_LABELS: Record<UserRole, string> = {
    admin:   'Admin',
    analyst: 'Analyst',
    viewer:  'Manager',
};

function RoleBadge({ role }: { role: UserRole }) {
    const cfg = ROLE_COLORS[role];
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase',
        }}>
            {ROLE_LABELS[role]}
        </span>
    );
}

export function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<number | null>(null);
    const [approvingId, setApprovingId] = useState<number | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [allRes, pendingRes] = await Promise.all([
                apiClient.get<User[]>('/users'),
                apiClient.get<User[]>('/users/pending'),
            ]);
            setUsers(allRes.data.filter(u => u.status !== 'pending'));
            setPendingUsers(pendingRes.data);
        } catch (err) {
            if (axios.isAxiosError(err)) setError(err.response?.data?.message ?? 'Failed to load users');
            else setError('Unexpected error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void fetchUsers(); }, [fetchUsers]);

    const handleApproval = async (userId: number, newStatus: 'active' | 'rejected') => {
        setApprovingId(userId);
        try {
            await apiClient.patch(`/users/${userId}/status`, { status: newStatus });
            await fetchUsers(); // refresh both lists
        } catch (err) {
            if (axios.isAxiosError(err)) setUpdateError(err.response?.data?.message ?? 'Failed to update account');
            else setUpdateError('Unexpected error');
        } finally { setApprovingId(null); }
    };

    const handleRoleChange = async (userId: number, newRole: UserRole) => {
        setUpdatingId(userId); setUpdateError(null); setSuccessId(null);
        try {
            await apiClient.patch(`/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setSuccessId(userId);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (err) {
            if (axios.isAxiosError(err)) setUpdateError(err.response?.data?.message ?? 'Failed to update role');
            else setUpdateError('Unexpected error');
        } finally { setUpdatingId(null); }
    };

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        User Management
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        View all registered accounts and assign roles. Changes take effect immediately on next login.
                    </p>
                </div>

                {/* Stats row */}
                {!loading && !error && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {ROLES.map(role => {
                            const count = users.filter(u => u.role === role).length;
                            const cfg = ROLE_COLORS[role];
                            return (
                                <div key={role} className="card p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                         style={{ background: cfg.bg }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {count}
                                        </div>
                                        <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            {role}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {error && <div className="alert-danger mb-4">{error}</div>}
                {updateError && <div className="alert-danger mb-4">{updateError}</div>}

                {/* ── Pending Approvals ───────────────────────────────── */}
                {!loading && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                Pending Approvals
                            </h3>
                            {pendingUsers.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ background: 'var(--status-danger)', color: 'white' }}>
                                    {pendingUsers.length}
                                </span>
                            )}
                        </div>

                        {pendingUsers.length === 0 ? (
                            <div className="card p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                     style={{ background: 'var(--status-success-soft)', border: '2px solid var(--status-success-border)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                         stroke="var(--status-success)" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>All caught up!</div>
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No accounts waiting for approval.</div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingUsers.map(u => (
                                    <div key={u.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap"
                                         style={{ borderLeft: '4px solid var(--status-warning)' }}>
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                                 style={{ background: 'var(--status-warning-soft)',
                                                          color: 'var(--status-warning)',
                                                          border: '2px solid var(--status-warning-border)' }}>
                                                {u.email[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {u.email}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <RoleBadge role={u.role as UserRole} />
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        Registered {new Date(u.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                id={`btn-approve-${u.id}`}
                                                disabled={approvingId === u.id}
                                                onClick={() => void handleApproval(u.id, 'active')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                                                style={{ background: 'var(--status-success)', color: 'white',
                                                         opacity: approvingId === u.id ? 0.6 : 1 }}>
                                                {approvingId === u.id ? '…' : (
                                                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                              stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="20 6 9 17 4 12" /></svg>
                                                        Approve</>)}
                                            </button>
                                            <button
                                                id={`btn-reject-${u.id}`}
                                                disabled={approvingId === u.id}
                                                onClick={() => void handleApproval(u.id, 'rejected')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                                                style={{ background: 'var(--status-danger)', color: 'white',
                                                         opacity: approvingId === u.id ? 0.6 : 1 }}>
                                                {approvingId === u.id ? '…' : (
                                                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                              stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        Reject</>)}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading users…</div>
                ) : (
                    <div className="table-container">
                        <table className="min-w-full">
                            <thead className="table-header">
                                <tr>
                                    {['ID', 'Email', 'Role', 'Joined', 'Change Role'].map(h => (
                                        <th key={h}
                                            className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isSelf = u.id === currentUser?.id;
                                    const isUpdating = updatingId === u.id;
                                    const isSuccess = successId === u.id;
                                    return (
                                        <tr key={u.id}
                                            className="table-row-hover"
                                            style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                            <td className="px-6 py-4 text-sm font-mono"
                                                style={{ color: 'var(--text-muted)' }}>#{u.id}</td>

                                            <td className="px-6 py-4 text-sm font-medium"
                                                style={{ color: 'var(--text-primary)' }}>
                                                {u.email}
                                                {isSelf && (
                                                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        (you)
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <RoleBadge role={u.role as UserRole} />
                                            </td>

                                            <td className="px-6 py-4 text-sm"
                                                style={{ color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>

                                            <td className="px-6 py-4">
                                                {isSelf ? (
                                                    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                        Cannot change own role
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            id={`role-select-${u.id}`}
                                                            value={u.role}
                                                            disabled={isUpdating}
                                                            onChange={e => void handleRoleChange(u.id, e.target.value as UserRole)}
                                                            className="input-field text-sm"
                                                            style={{ padding: '4px 10px', minWidth: '110px' }}
                                                        >
                                                            {ROLES.map(r => (
                                                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                            ))}
                                                        </select>
                                                        {isUpdating && (
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving…</span>
                                                        )}
                                                        {isSuccess && (
                                                            <span className="text-xs font-semibold" style={{ color: 'var(--status-success)' }}>
                                                                ✓ Saved
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Role legend */}
                <div className="mt-6 card p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--text-muted)' }}>Role Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {[
                            {
                                role: 'admin' as UserRole,
                                permissions: ['View all data', 'Score transactions', 'Submit reviews', 'Manage users & roles'],
                            },
                            {
                                role: 'analyst' as UserRole,
                                permissions: ['View all data', 'Score transactions', 'Bulk upload', 'Submit reviews'],
                            },
                            {
                                role: 'viewer' as UserRole,
                                permissions: ['View dashboard', 'View transactions', 'View review queue (read-only)', 'Full Analytics dashboard', 'Export flagged CSV'],
                                restricted: ['Cannot score or upload', 'Cannot submit reviews'],
                            },
                        ].map(({ role, permissions, restricted }) => (
                            <div key={role} className="rounded-lg p-3"
                                 style={{ background: 'var(--bg-card-hover)' }}>
                                <div className="mb-2"><RoleBadge role={role} /></div>
                                <ul className="space-y-1">
                                    {permissions.map(p => (
                                        <li key={p} className="flex items-center gap-1.5 text-xs"
                                            style={{ color: 'var(--text-secondary)' }}>
                                            <span style={{ color: 'var(--status-success)' }}>✓</span> {p}
                                        </li>
                                    ))}
                                    {restricted?.map(p => (
                                        <li key={p} className="flex items-center gap-1.5 text-xs"
                                            style={{ color: 'var(--text-muted)' }}>
                                            <span style={{ color: 'var(--status-danger)' }}>✗</span> {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
