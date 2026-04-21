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

// The 28 anonymised PCA feature names, used to generate inputs
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
        // Parse but allow empty string while typing
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
            const { data } = await mlClient.post<PredictionResponse>(
                '/predict',
                features,
            );
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
        <div className="min-h-screen bg-slate-50">
            <NavBar />

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">
                        Transaction Scoring
                    </h2>
                    <p className="text-slate-600 mt-1">
                        Submit transaction features and receive a real-time fraud
                        probability from the XGBoost model.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setFeatures(LEGITIMATE_EXAMPLE);
                                setPrediction(null);
                            }}
                            className="px-4 py-2 bg-green-100 text-green-800 font-medium rounded-lg hover:bg-green-200 transition-colors"
                        >
                            Load Legitimate Example
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFeatures(FRAUD_EXAMPLE);
                                setPrediction(null);
                            }}
                            className="px-4 py-2 bg-red-100 text-red-800 font-medium rounded-lg hover:bg-red-200 transition-colors"
                        >
                            Load Fraud Example
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFeatures(emptyTransaction());
                                setPrediction(null);
                                setError(null);
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Amount + Time */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Amount
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={features.Amount}
                                    onChange={(e) => updateField('Amount', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Time
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={features.Time}
                                    onChange={(e) => updateField('Time', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* V1–V28 features in a responsive grid */}
                        <div className="mb-6">
                            <div className="text-sm font-medium text-slate-700 mb-2">
                                PCA Features (V1–V28)
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                {V_FEATURES.map((name) => (
                                    <div key={name}>
                                        <label className="block text-xs text-slate-500 mb-0.5">
                                            {name}
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={features[name]}
                                            onChange={(e) => updateField(name, e.target.value)}
                                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                        >
                            {isSubmitting ? 'Scoring…' : 'Score This Transaction'}
                        </button>
                    </form>

                    {/* Error banner */}
                    {error && (
                        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    {/* Prediction result */}
                    {prediction && (
                        <PredictionResult prediction={prediction} />
                    )}
                </div>
            </main>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Prediction result component — the "wow" visual
// ─────────────────────────────────────────────────────────────
function PredictionResult({ prediction }: { prediction: PredictionResponse }) {
    const isFraud = prediction.predicted_label;
    const probPercent = (prediction.fraud_probability * 100).toFixed(2);

    const bgColor = isFraud ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
    const iconColor = isFraud ? 'text-red-600' : 'text-green-600';
    const headingColor = isFraud ? 'text-red-800' : 'text-green-800';
    const label = isFraud ? 'FRAUD DETECTED' : 'LEGITIMATE';
    const icon = isFraud ? '🚨' : '✓';

    return (
        <div className={`mt-6 border-2 rounded-xl p-6 ${bgColor}`}>
            <div className="flex items-start gap-4">
                <div className={`text-5xl ${iconColor}`}>{icon}</div>
                <div className="flex-1">
                    <div className={`text-2xl font-bold ${headingColor}`}>{label}</div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-slate-500 uppercase text-xs">
                                Fraud Probability
                            </div>
                            <div className="font-mono font-semibold text-lg text-slate-800">
                                {probPercent}%
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-500 uppercase text-xs">
                                Decision Threshold
                            </div>
                            <div className="font-mono font-semibold text-lg text-slate-800">
                                {(prediction.threshold * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-500 uppercase text-xs">Predicted</div>
                            <div className="font-mono font-semibold text-lg text-slate-800">
                                {isFraud ? 'Fraud' : 'Legitimate'}
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-500 uppercase text-xs">Model</div>
                            <div className="font-mono font-semibold text-lg text-slate-800">
                                XGBoost v{prediction.model_version.replace(/^v/, '')}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar visualizing probability */}
                    <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full ${isFraud ? 'bg-red-500' : 'bg-green-500'} transition-all duration-500`}
                                style={{ width: `${probPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}