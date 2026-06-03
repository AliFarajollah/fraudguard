import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { MetricCard } from '../components/MetricCard';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { apiClient } from '../api/client';
import axios from 'axios';
import type { Transaction, TransactionStats, PaginatedResponse } from '../types';

function StatusBadge({ status }: { status: Transaction['status'] }) {
    const cls: Record<Transaction['status'], string> = {
        pending: 'badge-pending',
        scored: 'badge-scored',
        reviewed: 'badge-reviewed',
    };
    return <span className={`badge ${cls[status]}`}>{status}</span>;
}

function FraudProbBadge({ prob, label }: { prob?: number; label?: boolean }) {
    if (prob === undefined) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
    const pct = (prob * 100).toFixed(1);
    return (
        <span className={`badge ${label ? 'badge-fraud' : 'badge-legit'}`}>
            {pct}%
        </span>
    );
}

export function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const [labelFilter, setLabelFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);

    const LIMIT = 20;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, limit: LIMIT };
            if (statusFilter) params['status'] = statusFilter;
            if (labelFilter) params['predictedLabel'] = labelFilter;

            const [txRes, statsRes] = await Promise.all([
                apiClient.get<PaginatedResponse<Transaction>>('/transactions', { params }),
                apiClient.get<TransactionStats>('/transactions/stats'),
            ]);
            setTransactions(txRes.data.data);
            setTotal(txRes.data.total);
            setStats(statsRes.data);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message ?? 'Failed to load transactions');
            } else {
                setError('Unexpected error');
            }
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, labelFilter]);

    useEffect(() => { void fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [statusFilter, labelFilter]);

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Transactions</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            All submitted credit card transactions and their fraud scores
                        </p>
                    </div>
                    <button id="btn-open-bulk-upload" onClick={() => setModalOpen(true)}
                            className="btn-primary text-sm flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload CSV
                    </button>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <MetricCard label="Total Transactions" value={stats.total} />
                        <MetricCard label="Scored" value={stats.scored} color="blue" />
                        <MetricCard label="Confirmed Fraud" value={stats.confirmed_fraud} color="red" />
                        <MetricCard label="False Positives" value={stats.false_positive} color="green" />
                    </div>
                )}

                {error && <div className="alert-danger mb-4">{error}</div>}

                {/* Filters */}
                <div className="card p-4 mb-4 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</label>
                        <select id="filter-status" value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-field text-sm" style={{ padding: '4px 12px' }}>
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="scored">Scored</option>
                            <option value="reviewed">Reviewed</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Prediction:</label>
                        <select id="filter-label" value={labelFilter}
                                onChange={(e) => setLabelFilter(e.target.value)}
                                className="input-field text-sm" style={{ padding: '4px 12px' }}>
                            <option value="">All</option>
                            <option value="true">Fraud</option>
                            <option value="false">Legitimate</option>
                        </select>
                    </div>
                    <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                        {total} result{total !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                <div className="table-container">
                    {loading ? (
                        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading transactions…</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>No transactions found.</div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="table-header">
                                <tr>
                                    {['ID', 'Amount', 'Date', 'Status', 'Fraud Prob.', 'Uploaded By', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="table-row-hover"
                                        style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                        <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>#{tx.id}</td>
                                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            €{Number(tx.amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(tx.occurredAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                                        <td className="px-4 py-3">
                                            <FraudProbBadge prob={tx.prediction?.fraudProbability} label={tx.prediction?.predictedLabel} />
                                        </td>
                                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {tx.uploadedBy?.email ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link to={`/transactions/${tx.id}`}
                                                  className="text-sm font-medium hover:underline"
                                                  style={{ color: 'var(--brand-primary)' }}>
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!loading && (
                    <div className="flex items-center justify-between mt-4">
                        <button id="btn-prev-page" onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1} className="btn-ghost text-sm disabled:opacity-40">
                            Previous
                        </button>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button id="btn-next-page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages} className="btn-ghost text-sm disabled:opacity-40">
                            Next
                        </button>
                    </div>
                )}
            </main>

            {modalOpen && (
                <BulkUploadModal onClose={() => setModalOpen(false)}
                                 onSuccess={() => { setModalOpen(false); void fetchData(); }} />
            )}
        </div>
    );
}
