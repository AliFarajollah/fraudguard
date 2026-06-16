import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { apiClient } from '../api/client';
import type { TransactionStats } from '../types';

interface PerformanceData {
    daily: Array<{ date: string; total: number; flagged: number; confirmed_fraud: number; false_positive: number }>;
    precision: number;
    recall: number;
    total_reviewed: number;
}

interface SlaData {
    avg_hours_to_review: number;
    under_1h: number;
    under_4h: number;
    under_24h: number;
    over_24h: number;
}

interface FraudSummary {
    stats: TransactionStats;
    performance: PerformanceData;
    sla: SlaData;
}

// ─── Report Card Component ───────────────────────────────────────────────────
function ReportCard({ title, description, icon, actionLabel, onAction, loading }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    actionLabel: string;
    onAction: () => void;
    loading?: boolean;
}) {
    return (
        <div className="card p-6 flex flex-col">
            <div className="flex items-start gap-4 mb-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--brand-primary-soft)' }}
                >
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {description}
                    </p>
                </div>
            </div>
            <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                <button
                    onClick={onAction}
                    disabled={loading}
                    className="btn-primary text-sm w-full disabled:opacity-50"
                >
                    {loading ? 'Generating…' : actionLabel}
                </button>
            </div>
        </div>
    );
}

// ─── Fraud Summary Report Modal ──────────────────────────────────────────────
function FraudSummaryModal({ data, onClose }: { data: FraudSummary; onClose: () => void }) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const total = data.stats.total;
    const flagged = data.stats.confirmed_fraud + data.stats.false_positive;
    const reviewed = data.performance.total_reviewed;
    const pending = flagged - reviewed;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="card p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto" id="fraud-summary-report">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center"
                                 style={{ background: 'var(--brand-primary)' }}>
                                <span className="text-xs font-bold" style={{ color: 'white' }}>F</span>
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                FraudGuard — Fraud Summary Report
                            </h2>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Period: {weekAgo.toLocaleDateString('en', { month: 'long', day: 'numeric' })} – {now.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Generated: {now.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Transactions Section */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Transactions
                    </h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Total scored', value: total },
                            { label: 'Flagged (>threshold)', value: `${flagged} (${total > 0 ? ((flagged / total) * 100).toFixed(1) : 0}%)` },
                            { label: 'Reviewed', value: reviewed },
                            { label: 'Pending review', value: Math.max(0, pending) },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm"
                                 style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Analyst Verdicts */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Analyst Verdicts
                    </h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Confirmed fraud', value: data.stats.confirmed_fraud, pct: reviewed > 0 ? ((data.stats.confirmed_fraud / reviewed) * 100).toFixed(1) : '0' },
                            { label: 'False positives', value: data.stats.false_positive, pct: reviewed > 0 ? ((data.stats.false_positive / reviewed) * 100).toFixed(1) : '0' },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm"
                                 style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {item.value} ({item.pct}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Model Performance */}
                <div className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Model Performance (Production)
                    </h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Precision', value: data.performance.precision.toFixed(3) },
                            { label: 'Recall', value: data.performance.recall.toFixed(3) },
                            { label: 'Avg review time', value: `${data.sla.avg_hours_to_review} hours` },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm"
                                 style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <button
                        onClick={() => window.print()}
                        className="btn-primary text-sm flex-1"
                    >
                        Print Report
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-ghost text-sm flex-1"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function ReportsPage() {
    const navigate = useNavigate();
    const [summaryData, setSummaryData] = useState<FraudSummary | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleGenerateSummary = async () => {
        setLoadingSummary(true);
        try {
            const [statsRes, perfRes, slaRes] = await Promise.all([
                apiClient.get<TransactionStats>('/transactions/stats'),
                apiClient.get<PerformanceData>('/predictions/performance'),
                apiClient.get<SlaData>('/reviews/sla'),
            ]);
            setSummaryData({
                stats: statsRes.data,
                performance: perfRes.data,
                sla: slaRes.data,
            });
            setShowSummary(true);
        } catch {
            // silently ignore
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const res = await apiClient.get('/transactions/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `fraudguard_transactions_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            // silently ignore
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Reports
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Generate and export compliance reports for management and regulators
                    </p>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Report 1 — Fraud Summary */}
                    <ReportCard
                        title="Fraud Summary Report"
                        description="Overview of fraud detections, analyst reviews, and model performance for the reporting period."
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        }
                        actionLabel="Generate Report"
                        onAction={() => void handleGenerateSummary()}
                        loading={loadingSummary}
                    />

                    {/* Report 2 — Transaction Audit Export */}
                    <ReportCard
                        title="Transaction Audit Export"
                        description="Complete export of all transactions with predictions and review decisions in CSV format."
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        }
                        actionLabel="Download CSV"
                        onAction={() => void handleExportCSV()}
                        loading={exporting}
                    />

                    {/* Report 3 — Analyst Activity */}
                    <ReportCard
                        title="Analyst Activity Report"
                        description="Reviews completed per analyst, average review time, and decision breakdown statistics."
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        }
                        actionLabel="View Analytics"
                        onAction={() => navigate('/analytics')}
                    />

                    {/* Report 4 — Model Performance */}
                    <ReportCard
                        title="Model Monitoring Report"
                        description="Production precision/recall vs initial test metrics — detect model drift over time."
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        }
                        actionLabel="View Report"
                        onAction={() => navigate('/model/performance')}
                    />
                </div>

            </main>

            {/* Fraud Summary Modal */}
            {showSummary && summaryData && (
                <FraudSummaryModal
                    data={summaryData}
                    onClose={() => setShowSummary(false)}
                />
            )}
        </div>
    );
}
