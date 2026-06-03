import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { NavBar } from '../components/NavBar';
import { mlClient } from '../api/client';
import type { TransactionFeatures, PredictionResponse } from '../types';
import {
    LEGITIMATE_EXAMPLE,
    FRAUD_EXAMPLE,
    emptyTransaction,
} from '../fixtures/sampleTransactions';

const V_FEATURES: (keyof TransactionFeatures)[] = [
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8',
    'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16',
    'V17', 'V18', 'V19', 'V20', 'V21', 'V22', 'V23', 'V24',
    'V25', 'V26', 'V27', 'V28',
];

export function ScorePage() {
    const [features, setFeatures] = useState<TransactionFeatures>(emptyTransaction());
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateField = (name: keyof TransactionFeatures, value: string) => {
        const num = value === '' || value === '-' ? 0 : parseFloat(value);
        setFeatures((prev) => ({
            ...prev,
            [name]: Number.isNaN(num) ? prev[name] : num,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setPrediction(null);
        setIsSubmitting(true);

        try {
            const { data } = await mlClient.post<PredictionResponse>('/predict', features);
            setPrediction(data);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                const data = err.response.data as { detail?: string };
                setError(data.detail ?? 'Prediction failed');
            } else {
                setError('Network error — is the ML service running on port 8000?');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen page-bg">
            <NavBar />

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Transaction Scoring
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Submit transaction features and receive a real-time fraud probability from the XGBoost model.
                    </p>
                </div>

                <div className="card p-6">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => { setFeatures(LEGITIMATE_EXAMPLE); setPrediction(null); }}
                            className="btn-ghost text-sm"
                            style={{ borderColor: 'var(--status-success)', color: 'var(--status-success)' }}
                        >
                            Load Legitimate Example
                        </button>
                        <button
                            type="button"
                            onClick={() => { setFeatures(FRAUD_EXAMPLE); setPrediction(null); }}
                            className="btn-ghost text-sm"
                            style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                        >
                            Load Fraud Example
                        </button>
                        <button
                            type="button"
                            onClick={() => { setFeatures(emptyTransaction()); setPrediction(null); setError(null); }}
                            className="btn-ghost text-sm"
                        >
                            Clear
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Amount + Time */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1"
                                       style={{ color: 'var(--text-secondary)' }}>Amount</label>
                                <input
                                    type="number" step="any" value={features.Amount}
                                    onChange={(e) => updateField('Amount', e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1"
                                       style={{ color: 'var(--text-secondary)' }}>Time</label>
                                <input
                                    type="number" step="any" value={features.Time}
                                    onChange={(e) => updateField('Time', e.target.value)}
                                    className="input-field w-full"
                                />
                            </div>
                        </div>

                        {/* V1–V28 */}
                        <div className="mb-6">
                            <div className="text-sm font-medium mb-2"
                                 style={{ color: 'var(--text-secondary)' }}>
                                PCA Features (V1–V28)
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                {V_FEATURES.map((name) => (
                                    <div key={name}>
                                        <label className="block text-xs mb-0.5"
                                               style={{ color: 'var(--text-muted)' }}>{name}</label>
                                        <input
                                            type="number" step="any" value={features[name]}
                                            onChange={(e) => updateField(name, e.target.value)}
                                            className="input-field w-full text-sm font-mono"
                                            style={{ padding: '4px 8px' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                            {isSubmitting ? 'Scoring…' : 'Score This Transaction'}
                        </button>
                    </form>

                    {error && <div className="alert-danger mt-6">{error}</div>}
                    {prediction && <PredictionResult prediction={prediction} />}
                </div>
            </main>
        </div>
    );
}

// ─── Professional Prediction Result ──────────────────────────────────────────
function PredictionResult({ prediction }: { prediction: PredictionResponse }) {
    const isFraud = prediction.predicted_label;
    const probPercent = (prediction.fraud_probability * 100).toFixed(2);

    return (
        <div className="mt-6 rounded-xl p-6"
             style={{
                 background: isFraud ? 'var(--status-danger-soft)' : 'var(--status-success-soft)',
                 border: `2px solid ${isFraud ? 'var(--status-danger-border)' : 'var(--status-success-border)'}`,
             }}>
            <div className="flex items-start gap-4">
                {/* Status indicator — a professional dot, not an emoji */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{
                         background: isFraud ? 'var(--status-danger)' : 'var(--status-success)',
                         color: 'white',
                     }}>
                    {isFraud ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </div>
                <div className="flex-1">
                    <div className="text-xl font-bold"
                         style={{ color: isFraud ? 'var(--status-danger-text)' : 'var(--status-success-text)' }}>
                        {isFraud ? 'FRAUD DETECTED' : 'LEGITIMATE'}
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {[
                            { label: 'Fraud Probability', value: `${probPercent}%` },
                            { label: 'Decision Threshold', value: `${(prediction.threshold * 100).toFixed(0)}%` },
                            { label: 'Predicted', value: isFraud ? 'Fraud' : 'Legitimate' },
                            { label: 'Model', value: `XGBoost v${prediction.model_version.replace(/^v/, '')}` },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="text-xs uppercase font-semibold tracking-wider"
                                     style={{ color: 'var(--text-muted)' }}>
                                    {item.label}
                                </div>
                                <div className="font-mono font-semibold text-lg mt-0.5"
                                     style={{ color: 'var(--text-primary)' }}>
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="w-full h-2.5 rounded-full overflow-hidden"
                             style={{ background: 'var(--border-default)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                                 style={{
                                     width: `${probPercent}%`,
                                     background: isFraud ? 'var(--status-danger)' : 'var(--status-success)',
                                 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}