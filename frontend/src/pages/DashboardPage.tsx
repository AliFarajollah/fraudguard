import { useEffect, useState } from 'react';
import { mlClient } from '../api/client';
import type { ModelInfo } from '../types';
import { NavBar } from '../components/NavBar';
import { MetricCard } from '../components/MetricCard';
import { FraudAlertBanner } from '../components/FraudAlertBanner';

export function DashboardPage() {
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModelInfo = async () => {
            try {
                const { data } = await mlClient.get<ModelInfo>('/model/info');
                setModelInfo(data);
            } catch (err) {
                setError(
                    'Failed to reach the ML service. Make sure FastAPI is running on port 8000.',
                );
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModelInfo();
    }, []);

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <FraudAlertBanner />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Model Dashboard
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Real-time performance metrics from the deployed fraud detection model.
                    </p>
                </div>

                {isLoading && (
                    <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        Loading model metrics…
                    </div>
                )}

                {error && <div className="alert-danger">{error}</div>}

                {modelInfo && !isLoading && (
                    <>
                        {/* Model summary header */}
                        <div className="card p-6 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider"
                                         style={{ color: 'var(--text-muted)' }}>
                                        Active Model
                                    </div>
                                    <div className="text-xl font-bold mt-1"
                                         style={{ color: 'var(--text-primary)' }}>
                                        {modelInfo.model_name}{' '}
                                        <span className="text-sm font-normal"
                                              style={{ color: 'var(--text-muted)' }}>
                                            v{modelInfo.model_version}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-8 text-sm">
                                    {[
                                        { label: 'Features', value: modelInfo.n_features },
                                        { label: 'Training Samples', value: modelInfo.training_samples.toLocaleString() },
                                        { label: 'Test Samples', value: modelInfo.test_samples.toLocaleString() },
                                    ].map((item) => (
                                        <div key={item.label}>
                                            <div className="text-xs uppercase tracking-wider"
                                                 style={{ color: 'var(--text-muted)' }}>
                                                {item.label}
                                            </div>
                                            <div className="font-semibold"
                                                 style={{ color: 'var(--text-primary)' }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Metric cards grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                            <MetricCard
                                label="Precision"
                                value={modelInfo.metrics.precision}
                                color="blue"
                                description="Of flagged, what fraction is actually fraud"
                            />
                            <MetricCard
                                label="Recall"
                                value={modelInfo.metrics.recall}
                                color="green"
                                description="Of all frauds, what fraction we catch"
                            />
                            <MetricCard
                                label="F1-Score"
                                value={modelInfo.metrics.f1}
                                color="purple"
                                description="Harmonic mean of precision and recall"
                            />
                            <MetricCard
                                label="ROC-AUC"
                                value={modelInfo.metrics.roc_auc}
                                color="orange"
                                description="Standard binary classification metric"
                            />
                            <MetricCard
                                label="PR-AUC"
                                value={modelInfo.metrics.pr_auc}
                                color="red"
                                description="Best metric for imbalanced data"
                            />
                        </div>

                        {/* Model comparison table */}
                        {modelInfo.all_models_compared && (
                            <div className="card overflow-hidden">
                                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    <h3 className="text-lg font-bold"
                                        style={{ color: 'var(--text-primary)' }}>
                                        Model Comparison
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        All candidates evaluated. The best model by PR-AUC was selected for deployment.
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="table-header">
                                            <tr>
                                                {['Model', 'Precision', 'Recall', 'F1', 'ROC-AUC', 'PR-AUC', 'Train Time'].map((h) => (
                                                    <th key={h}
                                                        className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${h === 'Model' ? 'text-left' : 'text-right'}`}
                                                        style={{ color: 'var(--text-muted)' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(modelInfo.all_models_compared).map(
                                                ([name, m]) => {
                                                    const isWinner = name === modelInfo.model_name;
                                                    return (
                                                        <tr key={name}
                                                            className="table-row-hover"
                                                            style={{
                                                                borderBottom: '1px solid var(--table-divider)',
                                                                background: isWinner ? 'var(--brand-primary-soft)' : undefined,
                                                            }}>
                                                            <td className="px-6 py-4 text-sm font-medium"
                                                                style={{ color: 'var(--text-primary)' }}>
                                                                {name}
                                                                {isWinner && (
                                                                    <span className="ml-2 badge"
                                                                          style={{
                                                                              background: 'var(--brand-primary)',
                                                                              color: 'var(--text-inverse)',
                                                                              fontSize: '10px',
                                                                          }}>
                                                                        SELECTED
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {[m.precision, m.recall, m.f1, m.roc_auc, m.pr_auc].map((v, i) => (
                                                                <td key={i} className="px-6 py-4 text-sm text-right font-mono"
                                                                    style={{ color: 'var(--text-secondary)' }}>
                                                                    {v.toFixed(4)}
                                                                </td>
                                                            ))}
                                                            <td className="px-6 py-4 text-sm text-right font-mono"
                                                                style={{ color: 'var(--text-secondary)' }}>
                                                                {m.train_time_seconds.toFixed(2)}s
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
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