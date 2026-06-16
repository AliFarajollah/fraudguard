import { useState, useEffect } from 'react';
import { NavBar } from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface AlertSettings {
    id: number;
    fraudThreshold: number;
    notificationsEnabled: boolean;
    alertEmail: string | null;
}

interface AuditEntry {
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

function formatAction(action: string): string {
    const map: Record<string, string> = {
        USER_LOGIN: 'Logged in',
        USER_REGISTERED: 'Registered account',
        TRANSACTION_SCORED: 'Scored transaction',
        REVIEW_SUBMITTED: 'Submitted review',
        BULK_UPLOAD: 'Bulk uploaded transactions',
        PASSWORD_CHANGED: 'Changed password',
        CSV_EXPORTED: 'Exported CSV',
        THRESHOLD_UPDATED: 'Updated threshold',
    };
    return map[action] ?? action.replace(/_/g, ' ').toLowerCase();
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export function ProfilePage() {
    const { user } = useAuth();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pwdSaving, setPwdSaving] = useState(false);

    // Alert settings state
    const [settings, setSettings] = useState<AlertSettings | null>(null);
    const [threshold, setThreshold] = useState(0.8);
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [alertEmail, setAlertEmail] = useState('');
    const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [settingsSaving, setSettingsSaving] = useState(false);

    // Activity state
    const [activity, setActivity] = useState<AuditEntry[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    // Fetch alert settings
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await apiClient.get<AlertSettings>('/alert-settings/me');
                setSettings(res.data);
                setThreshold(Number(res.data.fraudThreshold));
                setNotifEnabled(res.data.notificationsEnabled);
                setAlertEmail(res.data.alertEmail ?? '');
            } catch {
                // silently ignore — will use defaults
            }
        };
        void fetch();
    }, []);

    // Fetch recent activity
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await apiClient.get<AuditEntry[]>('/users/me/activity');
                setActivity(res.data.slice(0, 10));
            } catch {
                // silently ignore
            } finally {
                setActivityLoading(false);
            }
        };
        void fetch();
    }, []);

    // Handle password change
    const handlePasswordChange = async () => {
        setPwdMsg(null);
        if (newPassword.length < 8) {
            setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        setPwdSaving(true);
        try {
            await apiClient.patch('/users/me', { currentPassword, newPassword });
            setPwdMsg({ type: 'success', text: 'Password updated successfully' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setPwdMsg({ type: 'error', text: msg ?? 'Failed to update password' });
        } finally {
            setPwdSaving(false);
        }
    };

    // Handle alert settings save
    const handleSettingsSave = async () => {
        setSettingsMsg(null);
        setSettingsSaving(true);
        try {
            const res = await apiClient.put<AlertSettings>('/alert-settings/me', {
                fraudThreshold: threshold,
                notificationsEnabled: notifEnabled,
                alertEmail: alertEmail || null,
            });
            setSettings(res.data);
            setSettingsMsg({ type: 'success', text: 'Settings saved successfully' });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setSettingsMsg({ type: 'error', text: msg ?? 'Failed to save settings' });
        } finally {
            setSettingsSaving(false);
        }
    };

    const ROLE_LABELS: Record<string, string> = { admin: 'Admin', analyst: 'Analyst', viewer: 'Manager' };
    const ROLE_COLORS: Record<string, string> = {
        admin: 'var(--status-danger)',
        analyst: 'var(--brand-primary)',
        viewer: 'var(--text-muted)',
    };

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-4xl mx-auto px-6 py-8">

                {/* Profile Header */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-5">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                            style={{ background: 'var(--brand-primary)', color: 'white' }}
                        >
                            {user?.email?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {user?.email}
                            </h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span
                                    className="badge"
                                    style={{
                                        background: ROLE_COLORS[user?.role ?? ''] ?? 'var(--text-muted)',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                                </span>
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Information */}
                <div className="card p-6 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                        style={{ color: 'var(--text-muted)' }}>
                        Account Information
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</span>
                            <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Role</span>
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</span>
                            <span className="badge badge-reviewed">{user?.status ?? 'active'}</span>
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="card p-6 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                        style={{ color: 'var(--text-muted)' }}>
                        Change Password
                    </h3>
                    <div className="space-y-3 max-w-sm">
                        <input
                            type="password"
                            placeholder="Current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input-field w-full text-sm"
                        />
                        <input
                            type="password"
                            placeholder="New password (min. 8 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field w-full text-sm"
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field w-full text-sm"
                        />
                        {pwdMsg && (
                            <div className={pwdMsg.type === 'success' ? 'alert-success' : 'alert-danger'}>
                                {pwdMsg.text}
                            </div>
                        )}
                        <button
                            onClick={() => void handlePasswordChange()}
                            disabled={pwdSaving || !currentPassword || !newPassword || !confirmPassword}
                            className="btn-primary text-sm disabled:opacity-40"
                        >
                            {pwdSaving ? 'Saving…' : 'Save Password'}
                        </button>
                    </div>
                </div>

                {/* Alert Settings */}
                <div className="card p-6 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                        style={{ color: 'var(--text-muted)' }}>
                        Alert Settings
                    </h3>
                    <div className="space-y-5 max-w-sm">
                        {/* Threshold slider */}
                        <div>
                            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Fraud Threshold: <strong style={{ color: 'var(--text-primary)' }}>{threshold.toFixed(2)}</strong>
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={threshold}
                                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                className="w-full"
                                style={{ accentColor: 'var(--brand-primary)' }}
                            />
                            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                <span>0.10</span>
                                <span>1.00</span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                Transactions above this probability are flagged for your review
                            </p>
                        </div>

                        {/* Notifications toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Notifications enabled
                            </span>
                            <button
                                onClick={() => setNotifEnabled(!notifEnabled)}
                                className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none"
                                style={{
                                    background: notifEnabled ? 'var(--brand-primary)' : 'var(--border-input)',
                                }}
                            >
                                <span
                                    className="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"
                                    style={{ transform: notifEnabled ? 'translateX(22px)' : 'translateX(3px)' }}
                                />
                            </button>
                        </div>

                        {/* Alert email */}
                        <div>
                            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Alert Email (optional)
                            </label>
                            <input
                                type="email"
                                placeholder="analyst@bank.com"
                                value={alertEmail}
                                onChange={(e) => setAlertEmail(e.target.value)}
                                className="input-field w-full text-sm"
                            />
                        </div>

                        {settingsMsg && (
                            <div className={settingsMsg.type === 'success' ? 'alert-success' : 'alert-danger'}>
                                {settingsMsg.text}
                            </div>
                        )}
                        <button
                            onClick={() => void handleSettingsSave()}
                            disabled={settingsSaving}
                            className="btn-primary text-sm disabled:opacity-40"
                        >
                            {settingsSaving ? 'Saving…' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card overflow-hidden">
                    <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}>
                            My Recent Activity
                        </h3>
                    </div>
                    {activityLoading ? (
                        <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                            Loading activity…
                        </div>
                    ) : activity.length === 0 ? (
                        <div className="p-6 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
                            No activity recorded yet.
                        </div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="table-header">
                                <tr>
                                    {['Action', 'Entity', 'Date'].map((h) => (
                                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activity.map((a) => (
                                    <tr key={a.id} className="table-row-hover"
                                        style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                        <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {formatAction(a.action)}
                                        </td>
                                        <td className="px-6 py-3 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                                            {a.entityType ? `${a.entityType} #${a.entityId}` : '—'}
                                        </td>
                                        <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {timeAgo(a.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </main>
        </div>
    );
}
