import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { apiClient } from '../api/client';
import axios from 'axios';
import type { Prediction, Review, PredictionStats, ReviewStats } from '../types';

// ─── Local Data Shapes ────────────────────────────────────────────────────────
interface TrendDay    { date: string; fraud: number; legit: number; }
interface RiskBucket  { range: string; count: number; }

// ─── Chart: Stacked Bar (Fraud Trend) ────────────────────────────────────────
function TrendBarChart({ data }: { data: TrendDay[] }) {
    const maxVal = Math.max(...data.map(d => d.fraud + d.legit), 1);
    const [hovered, setHovered] = useState<number | null>(null);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm italic"
                 style={{ color: 'var(--text-muted)' }}>
                No trend data for the last 30 days
            </div>
        );
    }
    return (
        <div>
            <div className="flex items-end gap-px h-48 w-full relative">
                {data.map((d, i) => {
                    const fraudH  = (d.fraud  / maxVal) * 100;
                    const legitH  = (d.legit  / maxVal) * 100;
                    const isHov   = hovered === i;
                    return (
                        <div key={d.date}
                             className="flex flex-col justify-end flex-1 cursor-pointer relative"
                             style={{ height: '100%' }}
                             onMouseEnter={() => setHovered(i)}
                             onMouseLeave={() => setHovered(null)}>
                            {/* Tooltip */}
                            {isHov && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap
                                                rounded-lg px-2 py-1 text-xs shadow-lg pointer-events-none"
                                     style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                                              color: 'var(--text-primary)' }}>
                                    <div className="font-semibold">{new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                                    <div style={{ color: 'var(--status-danger)' }}>🔴 {d.fraud} fraud</div>
                                    <div style={{ color: 'var(--status-success)' }}>🟢 {d.legit} legit</div>
                                </div>
                            )}
                            {/* Fraud bar (red, on top) */}
                            {d.fraud > 0 && (
                                <div style={{
                                    height: `${fraudH}%`,
                                    background: isHov ? '#ef4444' : 'var(--status-danger)',
                                    borderRadius: '2px 2px 0 0',
                                    transition: 'background 0.15s',
                                }} />
                            )}
                            {/* Legit bar (green, on bottom) */}
                            {d.legit > 0 && (
                                <div style={{
                                    height: `${legitH}%`,
                                    background: isHov ? '#22c55e' : 'var(--status-success)',
                                    opacity: 0.7,
                                    transition: 'background 0.15s',
                                }} />
                            )}
                            {/* Empty bar placeholder */}
                            {d.fraud === 0 && d.legit === 0 && (
                                <div style={{ height: '2px', background: 'var(--border-default)' }} />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* X-axis — show every ~5th label */}
            <div className="flex mt-1.5">
                {data.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center overflow-hidden">
                        {i % Math.max(Math.floor(data.length / 6), 1) === 0 && (
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div className="flex gap-5 mt-3 justify-center">
                {[['var(--status-danger)', 'Fraud'], ['var(--status-success)', 'Legitimate']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Chart: SVG Donut ────────────────────────────────────────────────────────
function DonutChart({ segments, center }: {
    segments: { label: string; value: number; color: string }[];
    center: { value: string; label: string };
}) {
    const total = segments.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-44 text-sm italic"
                 style={{ color: 'var(--text-muted)' }}>
                No review decisions yet
            </div>
        );
    }

    const r = 54; const cx = 74; const cy = 74;
    const circ = 2 * Math.PI * r;
    let cum = 0;
    const arcs = segments.filter(s => s.value > 0).map(s => {
        const pct   = s.value / total;
        const dash  = pct * circ;
        const gap   = circ - dash;
        const angle = cum * 360 - 90;
        cum += pct;
        return { ...s, dash, gap, angle };
    });

    return (
        <div>
            <div className="flex justify-center">
                <svg width="148" height="148" viewBox="0 0 148 148">
                    <circle cx={cx} cy={cy} r={r} fill="none"
                            stroke="var(--border-default)" strokeWidth="22" />
                    {arcs.map((a, i) => (
                        <circle key={i} cx={cx} cy={cy} r={r}
                                fill="none" stroke={a.color} strokeWidth="22"
                                strokeDasharray={`${a.dash} ${a.gap}`}
                                transform={`rotate(${a.angle}, ${cx}, ${cy})`} />
                    ))}
                    <text x={cx} y={cy - 7} textAnchor="middle"
                          fill="var(--text-primary)" fontSize="22" fontWeight="700">
                        {center.value}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle"
                          fill="var(--text-muted)" fontSize="10">
                        {center.label}
                    </text>
                </svg>
            </div>
            <div className="space-y-2 mt-3">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                        <span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                            {s.value}
                            <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                                ({total > 0 ? Math.round(s.value / total * 100) : 0}%)
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Chart: Risk Histogram ────────────────────────────────────────────────────
function RiskHistogram({ data }: { data: RiskBucket[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const [hovered, setHovered] = useState<number | null>(null);

    const COLORS = [
        '#22c55e', '#4ade80', '#a3e635', '#facc15',
        '#fb923c', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d',
    ];

    if (data.every(d => d.count === 0)) {
        return (
            <div className="flex items-center justify-center h-44 text-sm italic"
                 style={{ color: 'var(--text-muted)' }}>
                No prediction data yet
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-end gap-1.5 h-44">
                {data.map((d, i) => {
                    const isHov = hovered === i;
                    const h = Math.max((d.count / maxCount) * 100, d.count > 0 ? 3 : 0);
                    return (
                        <div key={d.range}
                             className="flex flex-col items-center flex-1 cursor-pointer"
                             onMouseEnter={() => setHovered(i)}
                             onMouseLeave={() => setHovered(null)}>
                            {/* Count label */}
                            <div className="text-center mb-1 transition-opacity"
                                 style={{ fontSize: '10px', color: 'var(--text-primary)',
                                          opacity: isHov ? 1 : 0 }}>
                                {d.count}
                            </div>
                            <div className="w-full rounded-t transition-all"
                                 style={{ height: `${h}%`, background: COLORS[i],
                                          opacity: isHov ? 1 : 0.8,
                                          boxShadow: isHov ? `0 0 8px ${COLORS[i]}66` : 'none' }} />
                        </div>
                    );
                })}
            </div>
            {/* X-axis labels */}
            <div className="flex mt-1.5 gap-1.5">
                {data.map((d, i) => (
                    <div key={d.range} className="flex-1 text-center" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {i % 2 === 0 ? `${i * 10}%` : ''}
                    </div>
                ))}
                <div className="flex-1 text-center" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>100%</div>
            </div>
            <p className="text-center mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Hover a bar to see count · Green = low risk → Red = high risk
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
    const navigate = useNavigate();

    const [predStats,   setPredStats]   = useState<PredictionStats | null>(null);
    const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
    const [trends,      setTrends]      = useState<TrendDay[]>([]);
    const [riskDist,    setRiskDist]    = useState<RiskBucket[]>([]);
    const [flagged,     setFlagged]     = useState<Prediction[]>([]);
    const [recentRevs,  setRecentRevs]  = useState<Review[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true); setError(null);
            try {
                const [ps, rs, tr, rd, fl, rv] = await Promise.all([
                    apiClient.get<PredictionStats>('/predictions/stats'),
                    apiClient.get<ReviewStats>('/reviews/stats'),
                    apiClient.get<TrendDay[]>('/predictions/trends'),
                    apiClient.get<RiskBucket[]>('/predictions/risk-distribution'),
                    apiClient.get<Prediction[]>('/predictions/flagged'),
                    apiClient.get<Review[]>('/reviews'),
                ]);
                setPredStats(ps.data);
                setReviewStats(rs.data);
                setTrends(tr.data);
                setRiskDist(rd.data);
                setFlagged(fl.data.slice(0, 10));
                setRecentRevs(rv.data.slice(0, 10));
            } catch (err) {
                if (axios.isAxiosError(err)) setError(err.response?.data?.message ?? 'Failed to load analytics');
                else setError('Unexpected error');
            } finally { setLoading(false); }
        };
        void fetchAll();
    }, []);

    // Computed metrics
    const eurAtRisk = flagged.reduce((sum, p) => sum + Number(p.transaction?.amount ?? 0), 0);
    const fraudRate = predStats && predStats.total > 0
        ? ((predStats.fraud_count / predStats.total) * 100).toFixed(1)
        : '0.0';
    const reviewedPct = predStats && predStats.fraud_count > 0
        ? Math.round((predStats.reviewed_count / predStats.fraud_count) * 100)
        : 0;

    // Export flagged as CSV
    const exportCSV = () => {
        const header = 'Transaction ID,Amount (€),Fraud Probability,Date';
        const rows = flagged.map(p =>
            `${p.transaction?.id ?? ''},${Number(p.transaction?.amount ?? 0).toFixed(2)},${(Number(p.fraudProbability) * 100).toFixed(2)}%,${p.transaction?.occurredAt ? new Date(p.transaction.occurredAt).toLocaleDateString() : ''}`
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `fraudguard-flagged-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Management Analytics
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Real-time fraud detection insights — last 30 days
                        </p>
                    </div>
                    <button id="btn-export-csv" onClick={exportCSV}
                            className="btn-ghost text-sm flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Flagged CSV
                    </button>
                </div>

                {error && <div className="alert-danger mb-6">{error}</div>}

                {loading ? (
                    <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
                        Loading analytics…
                    </div>
                ) : (
                    <>
                        {/* ── KPI Cards ─────────────────────────────────────────── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                {
                                    label: 'Total Scored',
                                    value: (predStats?.total ?? 0).toLocaleString(),
                                    sub: 'transactions',
                                    icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                            <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                        </svg>
                                    ),
                                    iconBg: 'var(--brand-primary)',
                                },
                                {
                                    label: 'Fraud Rate',
                                    value: `${fraudRate}%`,
                                    sub: `${predStats?.fraud_count ?? 0} flagged`,
                                    icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    ),
                                    iconBg: 'var(--status-danger)',
                                },
                                {
                                    label: '€ at Risk',
                                    value: `€${eurAtRisk.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                                    sub: 'unreviewed fraud',
                                    icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <line x1="12" y1="1" x2="12" y2="23" />
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    ),
                                    iconBg: 'var(--status-warning)',
                                },
                                {
                                    label: 'Review Coverage',
                                    value: `${reviewedPct}%`,
                                    sub: `${predStats?.reviewed_count ?? 0} of ${predStats?.fraud_count ?? 0} reviewed`,
                                    icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ),
                                    iconBg: 'var(--status-success)',
                                },
                            ].map(card => (
                                <div key={card.label} className="card p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                         style={{ background: card.iconBg }}>
                                        {card.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-2xl font-bold font-mono leading-none"
                                             style={{ color: 'var(--text-primary)' }}>
                                            {card.value}
                                        </div>
                                        <div className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                                            {card.label}
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {card.sub}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Charts Row 1: Trend + Donut ──────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Trend Chart — 2/3 width */}
                            <div className="card p-6 lg:col-span-2">
                                <h3 className="text-sm font-semibold mb-4"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    FRAUD TREND — LAST 30 DAYS
                                </h3>
                                <TrendBarChart data={trends} />
                            </div>

                            {/* Donut — 1/3 width */}
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold mb-4"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    REVIEW DECISIONS
                                </h3>
                                <DonutChart
                                    center={{ value: String(reviewStats?.total ?? 0), label: 'reviews' }}
                                    segments={[
                                        { label: 'Confirmed Fraud',     value: reviewStats?.confirmed_fraud     ?? 0, color: 'var(--status-danger)' },
                                        { label: 'False Positive',      value: reviewStats?.false_positive      ?? 0, color: 'var(--status-success)' },
                                        { label: 'Needs Investigation', value: reviewStats?.needs_investigation ?? 0, color: 'var(--status-warning)' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* ── Charts Row 2: Histogram + Top Risky ─────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Risk Distribution Histogram */}
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold mb-4"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    RISK SCORE DISTRIBUTION
                                </h3>
                                <RiskHistogram data={riskDist} />
                            </div>

                            {/* Top 10 Highest-Risk Unreviewed */}
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold mb-4"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    TOP 10 HIGHEST-RISK (UNREVIEWED)
                                </h3>
                                {flagged.length === 0 ? (
                                    <div className="alert-success text-sm text-center py-6">
                                        ✓ All fraud predictions have been reviewed
                                    </div>
                                ) : (
                                    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '260px' }}>
                                        {flagged.map((p, i) => {
                                            const pct = (Number(p.fraudProbability) * 100);
                                            return (
                                                <div key={p.id}
                                                     className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                                                     style={{ background: 'var(--bg-card-hover)' }}
                                                     onClick={() => navigate(`/transactions/${p.transaction?.id}`)}>
                                                    <span className="text-xs font-mono w-4 flex-shrink-0"
                                                          style={{ color: 'var(--text-muted)' }}>
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                                                                Tx #{p.transaction?.id ?? '—'}
                                                                {p.transaction?.amount && ` · €${Number(p.transaction.amount).toFixed(0)}`}
                                                            </span>
                                                            <span className="font-bold" style={{ color: 'var(--status-danger)' }}>
                                                                {pct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        {/* Mini probability bar */}
                                                        <div className="h-1.5 w-full rounded-full overflow-hidden"
                                                             style={{ background: 'var(--border-default)' }}>
                                                            <div className="h-full rounded-full transition-all"
                                                                 style={{ width: `${pct}%`, background: 'var(--status-danger)' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Recent Review Decisions ──────────────────────────── */}
                        <div className="card overflow-hidden">
                            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                    RECENT ANALYST DECISIONS
                                </h3>
                            </div>
                            {recentRevs.length === 0 ? (
                                <div className="p-8 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                    No review decisions have been submitted yet.
                                </div>
                            ) : (
                                <table className="min-w-full">
                                    <thead className="table-header">
                                        <tr>
                                            {['Analyst', 'Decision', 'Notes', 'Date'].map(h => (
                                                <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                                    style={{ color: 'var(--text-muted)' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentRevs.map(r => {
                                            const cfg = {
                                                confirmed_fraud:     { label: 'Confirmed Fraud',     cls: 'badge-fraud' },
                                                false_positive:      { label: 'False Positive',      cls: 'badge-legit' },
                                                needs_investigation: { label: 'Needs Investigation', cls: 'badge-warning' },
                                            }[r.decision] ?? { label: r.decision, cls: '' };
                                            return (
                                                <tr key={r.id} className="table-row-hover"
                                                    style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                                    <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        {r.analyst?.email ?? '—'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-sm max-w-xs truncate"
                                                        style={{ color: 'var(--text-muted)' }}>
                                                        {r.notes ?? <span className="italic">—</span>}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm"
                                                        style={{ color: 'var(--text-muted)' }}>
                                                        {new Date(r.reviewedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
