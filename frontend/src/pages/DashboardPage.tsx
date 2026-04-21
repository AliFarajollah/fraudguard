import { useEffect, useState } from 'react';
import { mlClient } from '../api/client';
import type { ModelInfo } from '../types';
import { NavBar } from '../components/NavBar';
import { MetricCard } from '../components/MetricCard';

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
        <div className="min-h-screen bg-slate-50">
            <NavBar />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">Model Dashboard</h2>
                    <p className="text-slate-600 mt-1">
                        Real-time metrics from the fraud detection model in production.
                    </p>
                </div>

                {isLoading && (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
                        Loading model metrics…
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                        {error}
                    </div>
                )}

                {modelInfo && !isLoading && (
                    <>
                        {/* Model summary header */}
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <div className="text-sm text-slate-500 uppercase tracking-wide">
                                        Active Model
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 mt-1">
                                        {modelInfo.model_name}{' '}
                                        <span className="text-slate-400 text-base font-normal">
                                            v{modelInfo.model_version}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-6 text-sm text-slate-600">
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase">Features</div>
                                        <div className="font-semibold text-slate-800">
                                            {modelInfo.n_features}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase">Training Samples</div>
                                        <div className="font-semibold text-slate-800">
                                            {modelInfo.training_samples.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase">Test Samples</div>
                                        <div className="font-semibold text-slate-800">
                                            {modelInfo.test_samples.toLocaleString()}
                                        </div>
                                    </div>
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
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Model Comparison
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        All candidates evaluated. The best model by PR-AUC was
                                        selected for deployment.
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    Model
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    Precision
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    Recall
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    F1
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    ROC-AUC
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    PR-AUC
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    Train Time
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {Object.entries(modelInfo.all_models_compared).map(
                                                ([name, m]) => {
                                                    const isWinner = name === modelInfo.model_name;
                                                    return (
                                                        <tr
                                                            key={name}
                                                            className={isWinner ? 'bg-blue-50' : ''}
                                                        >
                                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                                {name}
                                                                {isWinner && (
                                                                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                                                                        SELECTED
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono">
                                                                {m.precision.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono">
                                                                {m.recall.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono">
                                                                {m.f1.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono">
                                                                {m.roc_auc.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono font-semibold">
                                                                {m.pr_auc.toFixed(4)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-right text-slate-600 font-mono">
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