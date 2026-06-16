import { useState, useEffect } from 'react';
import { NavBar } from '../components/NavBar';
import { MetricCard } from '../components/MetricCard';
import { apiClient, mlClient } from '../api/client';
import type { ModelInfo } from '../types';

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

// ─── Bar Chart Component ─────────────────────────────────────────────────────
function MetricsBarChart({ title, metrics }: {
    title: string;
    metrics: { label: string; value: number; color: string }[];
}) {
    const maxVal = Math.max(...metrics.map(m => m.value), 0.01);
    return (
        <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-muted)' }}>{title}</h4>
            <div className="space-y-3">
                {metrics.map((m) => (
                    <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                                {m.value.toFixed(4)}
                            </span>
                        </div>
                        <div className="h-3 w-full rounded-full overflow-hidden"
                             style={{ background: 'var(--border-default)' }}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${(m.value / maxVal) * 100}%`,
                                    background: m.color,
                                    minWidth: m.value > 0 ? '4px' : '0',
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Daily Trend Line Chart (SVG) ────────────────────────────────────────────
function DailyTrendChart({ data }: { data: PerformanceData['daily'] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm italic"
                 style={{ color: 'var(--text-muted)' }}>
                No daily data available
            </div>
        );
    }

    const W = 700, H = 200, PAD = 40;
    const chartW = W - PAD * 2;
    const chartH = H - PAD * 2;
    const rates = data.map(d => d.total > 0 ? (d.confirmed_fraud / d.total) * 100 : 0);
    const maxRate = Math.max(...rates, 1);

    const points = rates.map((r, i) => ({
        x: PAD + (i / Math.max(data.length - 1, 1)) * chartW,
        y: PAD + chartH - (r / maxRate) * chartH,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${PAD + chartH} L ${points[0].x} ${PAD + chartH} Z`;

    const [hovered, setHovered] = useState<number | null>(null);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '250px' }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = PAD + chartH - pct * chartH;
                    return (
                        <g key={pct}>
                            <line x1={PAD} y1={y} x2={W - PAD} y2={y}
                                  stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4,4" />
                            <text x={PAD - 6} y={y + 4} textAnchor="end"
                                  fill="var(--text-muted)" fontSize="10">
                                {(maxRate * pct).toFixed(0)}%
                            </text>
                        </g>
                    );
                })}

                {/* Area fill */}
                <path d={areaD} fill="var(--brand-primary)" opacity="0.08" />

                {/* Line */}
                <path d={pathD} fill="none" stroke="var(--brand-primary)" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 5 : 3}
                            fill="var(--brand-primary)" stroke="var(--bg-card)" strokeWidth="2"
                            style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)} />
                ))}

                {/* X axis labels */}
                {data.map((d, i) => {
                    if (i % Math.max(Math.floor(data.length / 6), 1) !== 0) return null;
                    return (
                        <text key={d.date} x={points[i].x} y={H - 8} textAnchor="middle"
                              fill="var(--text-muted)" fontSize="9">
                            {new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </text>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hovered !== null && data[hovered] && (
                <div
                    className="absolute z-10 rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        left: `${(points[hovered].x / W) * 100}%`,
                        top: '10px',
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-semibold">
                        {new Date(data[hovered].date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </div>
                    <div>Total: {data[hovered].total}</div>
                    <div>Flagged: {data[hovered].flagged}</div>
                    <div style={{ color: 'var(--status-danger)' }}>Confirmed: {data[hovered].confirmed_fraud}</div>
                    <div style={{ color: 'var(--status-success)' }}>False Pos: {data[hovered].false_positive}</div>
                    <div className="font-bold mt-1">Rate: {rates[hovered].toFixed(1)}%</div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function ModelPerformancePage() {
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [sla, setSla] = useState<SlaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const [modelRes, perfRes, slaRes] = await Promise.all([
                    mlClient.get<ModelInfo>('/model/info').catch(() => null),
                    apiClient.get<PerformanceData>('/predictions/performance'),
                    apiClient.get<SlaData>('/reviews/sla'),
                ]);
                if (modelRes) setModelInfo(modelRes.data);
                setPerformance(perfRes.data);
                setSla(slaRes.data);
            } catch {
                setError('Failed to load performance data');
            } finally {
                setLoading(false);
            }
        };
        void fetchAll();
    }, []);

    const initialMetrics = modelInfo?.metrics;
    const prodMetrics = performance;

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Model Performance Monitoring
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Comparing initial test metrics vs production analyst feedback — detect model drift
                    </p>
                </div>

                {error && <div className="alert-danger mb-6">{error}</div>}

                {loading ? (
                    <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
                        Loading model performance data…
                    </div>
                ) : (
                    <>
                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <MetricCard
                                label="Initial PR-AUC"
                                value={initialMetrics?.pr_auc ?? 0}
                                color="blue"
                                description="From training evaluation"
                            />
                            <MetricCard
                                label="Production Precision"
                                value={prodMetrics?.precision ?? 0}
                                color="green"
                                description="From analyst feedback"
                            />
                            <MetricCard
                                label="Production Recall"
                                value={prodMetrics?.recall ?? 0}
                                color="purple"
                                description="From analyst feedback"
                            />
                            <MetricCard
                                label="Reviews Completed"
                                value={prodMetrics?.total_reviewed ?? 0}
                                color="orange"
                                description="Total analyst decisions"
                            />
                        </div>

                        {/* Side-by-side charts: Initial vs Production */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Initial Test Results */}
                            <div className="card p-6">
                                <MetricsBarChart
                                    title="Initial Test Results (Training)"
                                    metrics={initialMetrics ? [
                                        { label: 'Precision', value: initialMetrics.precision, color: 'var(--accent-blue)' },
                                        { label: 'Recall', value: initialMetrics.recall, color: 'var(--accent-green)' },
                                        { label: 'F1-Score', value: initialMetrics.f1, color: 'var(--accent-purple)' },
                                        { label: 'PR-AUC', value: initialMetrics.pr_auc, color: 'var(--accent-amber)' },
                                    ] : [
                                        { label: 'Precision', value: 0, color: 'var(--text-muted)' },
                                        { label: 'Recall', value: 0, color: 'var(--text-muted)' },
                                        { label: 'F1-Score', value: 0, color: 'var(--text-muted)' },
                                        { label: 'PR-AUC', value: 0, color: 'var(--text-muted)' },
                                    ]}
                                />
                            </div>

                            {/* Production Feedback */}
                            <div className="card p-6">
                                <MetricsBarChart
                                    title="Production Feedback (Analyst Reviews)"
                                    metrics={prodMetrics ? [
                                        { label: 'Precision', value: prodMetrics.precision, color: 'var(--accent-blue)' },
                                        { label: 'Recall', value: prodMetrics.recall, color: 'var(--accent-green)' },
                                        { label: 'F1-Score', value: prodMetrics.precision + prodMetrics.recall > 0
                                            ? (2 * prodMetrics.precision * prodMetrics.recall) / (prodMetrics.precision + prodMetrics.recall)
                                            : 0, color: 'var(--accent-purple)' },
                                    ] : []}
                                />
                            </div>
                        </div>

                        {/* Daily Fraud Rate Trend */}
                        <div className="card p-6 mb-6">
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                                style={{ color: 'var(--text-muted)' }}>
                                Daily Confirmed Fraud Rate — Last 30 Days
                            </h3>
                            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                                Tracks what percentage of scored transactions analysts confirmed as fraud
                            </p>
                            <DailyTrendChart data={performance?.daily ?? []} />
                        </div>

                        {/* SLA Compliance */}
                        {sla && (
                            <div className="card p-6 mb-6">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                                    style={{ color: 'var(--text-muted)' }}>
                                    Review SLA Compliance
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[
                                        { label: '< 1 hour', value: sla.under_1h, color: 'var(--status-success)' },
                                        { label: '1–4 hours', value: sla.under_4h, color: 'var(--accent-blue)' },
                                        { label: '4–24 hours', value: sla.under_24h, color: 'var(--status-warning)' },
                                        { label: '> 24 hours', value: sla.over_24h, color: 'var(--status-danger)' },
                                        { label: 'Avg Review Time', value: `${sla.avg_hours_to_review}h`, color: 'var(--brand-primary)' },
                                    ].map((item) => (
                                        <div key={item.label} className="text-center p-4 rounded-lg"
                                             style={{ background: 'var(--bg-card-hover)' }}>
                                            <div className="text-2xl font-bold font-mono mb-1"
                                                 style={{ color: item.color }}>
                                                {item.value}
                                            </div>
                                            <div className="text-xs font-medium"
                                                 style={{ color: 'var(--text-muted)' }}>
                                                {item.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Model Comparison Reference Table */}
                        {modelInfo?.all_models_compared && (
                            <div className="card overflow-hidden">
                                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: 'var(--text-muted)' }}>
                                        Reference: Models Evaluated at Training Time
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="table-header">
                                            <tr>
                                                {['Model', 'Precision', 'Recall', 'F1', 'ROC-AUC', 'PR-AUC', 'Train Time'].map((h) => (
                                                    <th key={h}
                                                        className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${h === 'Model' ? 'text-left' : 'text-right'}`}
                                                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(modelInfo.all_models_compared).map(([name, m]) => {
                                                const isWinner = name === modelInfo.model_name;
                                                return (
                                                    <tr key={name} className="table-row-hover"
                                                        style={{
                                                            borderBottom: '1px solid var(--table-divider)',
                                                            background: isWinner ? 'var(--brand-primary-soft)' : undefined,
                                                        }}>
                                                        <td className="px-6 py-3 text-sm font-medium"
                                                            style={{ color: 'var(--text-primary)' }}>
                                                            {name}
                                                            {isWinner && (
                                                                <span className="ml-2 badge"
                                                                      style={{ background: 'var(--brand-primary)', color: 'var(--text-inverse)', fontSize: '10px' }}>
                                                                    DEPLOYED
                                                                </span>
                                                            )}
                                                        </td>
                                                        {[m.precision, m.recall, m.f1, m.roc_auc, m.pr_auc].map((v, i) => (
                                                            <td key={i} className="px-6 py-3 text-sm text-right font-mono"
                                                                style={{ color: 'var(--text-secondary)' }}>
                                                                {v.toFixed(4)}
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-3 text-sm text-right font-mono"
                                                            style={{ color: 'var(--text-secondary)' }}>
                                                            {m.train_time_seconds.toFixed(2)}s
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
