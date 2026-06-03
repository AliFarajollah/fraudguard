import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { MetricCard } from '../components/MetricCard';
import { apiClient } from '../api/client';
import axios from 'axios';
import type { Prediction, PredictionStats } from '../types';

export function ReviewQueuePage() {
    const navigate = useNavigate();
    const [flagged, setFlagged] = useState<Prediction[]>([]);
    const [stats, setStats] = useState<PredictionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [flaggedRes, statsRes] = await Promise.all([
                apiClient.get<Prediction[]>('/predictions/flagged'),
                apiClient.get<PredictionStats>('/predictions/stats'),
            ]);
            setFlagged(flaggedRes.data);
            setStats(statsRes.data);
        } catch (err) {
            if (axios.isAxiosError(err)) setError(err.response?.data?.message ?? 'Failed to load review queue');
            else setError('Unexpected error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void fetchData(); }, [fetchData]);

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Review Queue</h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Fraud predictions awaiting analyst review, sorted by highest risk first
                    </p>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <MetricCard label="Total Scored" value={stats.total} />
                        <MetricCard label="Flagged Fraud" value={stats.fraud_count} color="red" />
                        <MetricCard label="Pending Review" value={flagged.length} color="orange" />
                        <MetricCard label="Reviewed" value={stats.reviewed_count} color="green" />
                    </div>
                )}

                {error && <div className="alert-danger mb-4">{error}</div>}

                {loading ? (
                    <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading queue…</div>
                ) : flagged.length === 0 ? (
                    <div className="alert-success p-8 text-center">
                        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                             style={{ background: 'var(--status-success)', color: 'white' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold">All clear — no pending reviews</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            All flagged transactions have been reviewed by an analyst.
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="min-w-full">
                            <thead className="table-header">
                                <tr>
                                    {['Transaction ID', 'Amount', 'Date', 'Fraud Probability', 'Action'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {flagged.map((pred) => {
                                    const tx = pred.transaction;
                                    const probPct = (Number(pred.fraudProbability) * 100).toFixed(1);
                                    return (
                                        <tr key={pred.id} className="table-row-hover"
                                            style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                            <td className="px-4 py-3 text-sm font-mono"
                                                style={{ color: 'var(--text-secondary)' }}>
                                                #{tx?.id ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium"
                                                style={{ color: 'var(--text-primary)' }}>
                                                {tx ? `€${Number(tx.amount).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm"
                                                style={{ color: 'var(--text-muted)' }}>
                                                {tx ? new Date(tx.occurredAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="badge badge-fraud">{probPct}%</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button id={`btn-review-${pred.id}`}
                                                        onClick={() => navigate(`/transactions/${tx?.id}`)}
                                                        className="btn-primary text-sm"
                                                        style={{ padding: '6px 16px' }}>
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
