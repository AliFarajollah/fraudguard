import { useState, useEffect, useCallback } from 'react';
import { NavBar } from '../components/NavBar';
import { apiClient } from '../api/client';

interface AuditEntry {
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: { id: number; email: string; role: string } | null;
}

interface AuditPage {
    data: AuditEntry[];
    total: number;
    page: number;
    limit: number;
}

const ACTION_LABELS: Record<string, string> = {
    USER_LOGIN: 'User Login',
    USER_REGISTERED: 'User Registered',
    TRANSACTION_SCORED: 'Transaction Scored',
    REVIEW_SUBMITTED: 'Review Submitted',
    BULK_UPLOAD: 'Bulk Upload',
    CSV_EXPORTED: 'CSV Exported',
    THRESHOLD_UPDATED: 'Threshold Updated',
    PASSWORD_CHANGED: 'Password Changed',
};

const ACTION_ICONS: Record<string, { bg: string; icon: string }> = {
    USER_LOGIN: { bg: 'var(--brand-primary)', icon: '🔑' },
    USER_REGISTERED: { bg: 'var(--status-success)', icon: '👤' },
    TRANSACTION_SCORED: { bg: 'var(--status-info)', icon: '⚡' },
    REVIEW_SUBMITTED: { bg: 'var(--status-warning)', icon: '✅' },
    BULK_UPLOAD: { bg: 'var(--accent-purple)', icon: '📦' },
    PASSWORD_CHANGED: { bg: 'var(--status-danger)', icon: '🔐' },
};

const ACTION_OPTIONS = [
    '', 'USER_LOGIN', 'USER_REGISTERED', 'TRANSACTION_SCORED',
    'REVIEW_SUBMITTED', 'BULK_UPLOAD', 'PASSWORD_CHANGED',
];

export function AuditLogPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const LIMIT = 20;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: LIMIT };
            if (actionFilter) params['action'] = actionFilter;
            const res = await apiClient.get<AuditPage>('/audit', { params });
            setEntries(res.data.data);
            setTotal(res.data.total);
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter]);

    useEffect(() => { void fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [actionFilter]);

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Activity Log
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Complete audit trail of all system actions — regulatory compliance
                    </p>
                </div>

                {/* Filter Bar */}
                <div className="card p-4 mb-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Action:
                            </label>
                            <select
                                id="audit-filter-action"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="input-field text-sm"
                                style={{ padding: '4px 12px' }}
                            >
                                <option value="">All Actions</option>
                                {ACTION_OPTIONS.filter(Boolean).map((a) => (
                                    <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                                ))}
                            </select>
                        </div>
                        <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                            {total} total entries
                        </span>
                    </div>
                </div>

                {/* Activity Table */}
                <div className="table-container">
                    {loading ? (
                        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                            Loading audit logs…
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                            No audit entries found.
                        </div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="table-header">
                                <tr>
                                    {['', 'Timestamp', 'User', 'Action', 'Entity', 'Details'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e) => {
                                    const iconCfg = ACTION_ICONS[e.action] ?? { bg: 'var(--text-muted)', icon: '📋' };
                                    return (
                                        <tr key={e.id} className="table-row-hover"
                                            style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                            {/* Icon */}
                                            <td className="px-4 py-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                                    style={{ background: iconCfg.bg, opacity: 0.9 }}
                                                >
                                                    {iconCfg.icon}
                                                </div>
                                            </td>
                                            {/* Timestamp */}
                                            <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                                                {new Date(e.createdAt).toLocaleDateString('en', {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                            {/* User */}
                                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {e.user?.email ?? '—'}
                                            </td>
                                            {/* Action */}
                                            <td className="px-4 py-3">
                                                <span className="badge badge-scored text-xs">
                                                    {ACTION_LABELS[e.action] ?? e.action}
                                                </span>
                                            </td>
                                            {/* Entity */}
                                            <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                                                {e.entityType
                                                    ? `${e.entityType} #${e.entityId}`
                                                    : '—'}
                                            </td>
                                            {/* Details / metadata */}
                                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                {e.metadata
                                                    ? Object.entries(e.metadata)
                                                        .map(([k, v]) => `${k}: ${String(v)}`)
                                                        .join(', ')
                                                    : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!loading && (
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn-ghost text-sm disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="btn-ghost text-sm disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}
