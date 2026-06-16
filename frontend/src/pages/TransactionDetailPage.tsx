import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { CommentSection } from '../components/CommentSection';
import { apiClient } from '../api/client';
import axios from 'axios';
import type { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }: { status: Transaction['status'] }) {
    const cls: Record<Transaction['status'], string> = {
        pending: 'badge-pending', scored: 'badge-scored', reviewed: 'badge-reviewed',
    };
    return <span className={`badge ${cls[status]}`}>{status}</span>;
}

function DecisionBadge({ decision }: { decision: 'confirmed_fraud' | 'false_positive' | 'needs_investigation' }) {
    const cfg = {
        confirmed_fraud:     { label: 'Confirmed Fraud',       cls: 'badge-fraud' },
        false_positive:      { label: 'False Positive',        cls: 'badge-legit' },
        needs_investigation: { label: 'Needs Investigation',   cls: 'badge-warning' },
    };
    const { label, cls } = cfg[decision];
    return <span className={`badge ${cls}`}>{label}</span>;
}

export function TransactionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const canReview = user?.role === 'admin' || user?.role === 'analyst';
    const [tx, setTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [decision, setDecision] = useState<'confirmed_fraud' | 'false_positive' | 'needs_investigation' | ''>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const fetchTransaction = useCallback(async () => {
        if (!id) return;
        setLoading(true); setError(null);
        try {
            const res = await apiClient.get<Transaction>(`/transactions/${id}`);
            setTx(res.data);
        } catch (err) {
            if (axios.isAxiosError(err)) setError(err.response?.data?.message ?? 'Failed to load transaction');
            else setError('Unexpected error');
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { void fetchTransaction(); }, [fetchTransaction]);

    const submitReview = async () => {
        if (!decision || !tx?.prediction) return;
        setSubmitting(true); setReviewError(null);
        try {
            await apiClient.post('/reviews', {
                predictionId: tx.prediction.id,
                decision,
                notes: notes.trim() || undefined,
            });
            await fetchTransaction();
            setDecision(''); setNotes('');
        } catch (err) {
            if (axios.isAxiosError(err)) setReviewError(err.response?.data?.message ?? 'Failed to submit review');
            else setReviewError('Unexpected error');
        } finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen page-bg">
                <NavBar />
                <div className="max-w-7xl mx-auto px-6 py-8 text-center pt-24" style={{ color: 'var(--text-muted)' }}>
                    Loading transaction…
                </div>
            </div>
        );
    }

    if (error || !tx) {
        return (
            <div className="min-h-screen page-bg">
                <NavBar />
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="alert-danger">{error ?? 'Transaction not found'}</div>
                </div>
            </div>
        );
    }

    const pred = tx.prediction;
    const review = pred?.review;
    const isFraud = pred?.predictedLabel === true;
    const isReviewed = !!review;

    return (
        <div className="min-h-screen page-bg">
            <NavBar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <a href="/transactions" className="text-sm hover:underline"
                       style={{ color: 'var(--brand-primary)' }}>
                        ← Back to Transactions
                    </a>
                    <h2 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                        Transaction #{tx.id}
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel 1: Transaction Info */}
                    <div className="card p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                            style={{ color: 'var(--text-muted)' }}>Transaction Info</h3>
                        <dl className="space-y-3">
                            <DataRow label="Transaction ID" value={`#${tx.id}`} mono />
                            <DataRow label="Amount" value={`€${Number(tx.amount).toFixed(2)}`} bold />
                            <DataRow label="Date" value={new Date(tx.occurredAt).toLocaleString()} />
                            <div>
                                <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</dt>
                                <dd className="mt-0.5"><StatusBadge status={tx.status} /></dd>
                            </div>
                            <DataRow label="Uploaded By" value={tx.uploadedBy?.email ?? '—'} />
                            <DataRow label="Submitted" value={new Date(tx.createdAt).toLocaleString()} muted />
                        </dl>
                    </div>

                    {/* Panel 2: Prediction */}
                    <div className="card p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                            style={{ color: 'var(--text-muted)' }}>ML Prediction</h3>
                        {!pred ? (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Not scored yet</p>
                        ) : (
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Fraud Probability</dt>
                                    <dd className="text-4xl font-bold mt-1"
                                        style={{ color: isFraud ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                        {(Number(pred.fraudProbability) * 100).toFixed(2)}%
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Predicted Label</dt>
                                    <dd>
                                        <span className={`badge ${isFraud ? 'badge-fraud' : 'badge-legit'}`}>
                                            {isFraud ? 'Fraud' : 'Legitimate'}
                                        </span>
                                    </dd>
                                </div>
                                <DataRow label="Model Version" value={pred.modelVersion} mono />
                                <DataRow label="Scored At" value={new Date(pred.createdAt).toLocaleString()} muted />
                            </dl>
                        )}
                    </div>

                    {/* Panel 3: Review */}
                    <div className="card p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                            style={{ color: 'var(--text-muted)' }}>Analyst Review</h3>

                        {/* Already reviewed */}
                        {isReviewed && review && (
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Decision</dt>
                                    <dd className="mt-0.5"><DecisionBadge decision={review.decision} /></dd>
                                </div>
                                <DataRow label="Analyst" value={review.analyst?.email ?? '—'} />
                                {review.notes && (
                                    <div>
                                        <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Notes</dt>
                                        <dd className="text-sm mt-0.5 p-2 rounded"
                                            style={{ color: 'var(--text-primary)', background: 'var(--bg-card-hover)' }}>
                                            {review.notes}
                                        </dd>
                                    </div>
                                )}
                                <DataRow label="Reviewed At" value={new Date(review.reviewedAt).toLocaleString()} muted />
                            </dl>
                        )}

                        {/* Flagged, awaiting review — only visible to analyst/admin */}
                        {!isReviewed && isFraud && pred && (
                            <div>
                                <div className="alert-warning mb-4 text-sm">
                                    This transaction was flagged as potentially fraudulent.{' '}
                                    {canReview
                                        ? 'Please review and submit your decision.'
                                        : 'An analyst or admin must submit the review decision.'}
                                </div>

                                {canReview ? (
                                    <>
                                        <div className="flex flex-col gap-2 mb-4">
                                            {([
                                                { key: 'confirmed_fraud' as const,     label: 'Confirm Fraud',          color: 'var(--status-danger)' },
                                                { key: 'false_positive' as const,      label: 'Mark False Positive',    color: 'var(--status-success)' },
                                                { key: 'needs_investigation' as const, label: 'Needs Investigation',    color: 'var(--status-warning)' },
                                            ]).map(({ key, label, color }) => (
                                                <button key={key} id={`btn-decision-${key}`}
                                                        onClick={() => setDecision(key)}
                                                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all border"
                                                        style={{
                                                            borderColor: decision === key ? color : 'var(--border-default)',
                                                            background:  decision === key ? color : 'transparent',
                                                            color:       decision === key ? 'white' : 'var(--text-secondary)',
                                                        }}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea id="review-notes" value={notes}
                                                  onChange={(e) => setNotes(e.target.value)}
                                                  placeholder="Optional notes for this decision…" rows={3}
                                                  className="input-field w-full text-sm mb-3 resize-none" />
                                        {reviewError && <div className="alert-danger text-xs mb-2">{reviewError}</div>}
                                        <button id="btn-submit-review" onClick={() => void submitReview()}
                                                disabled={!decision || submitting} className="btn-primary w-full text-sm">
                                            {submitting ? 'Submitting…' : 'Submit Review'}
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-xs italic mt-2" style={{ color: 'var(--text-muted)' }}>
                                        Your <strong>{user?.role}</strong> role is read-only. Contact an analyst or admin to review this transaction.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Legitimate — no review needed */}
                        {!isReviewed && pred && !isFraud && (
                            <div className="alert-success text-sm">
                                No review required — transaction classified as legitimate by the model.
                            </div>
                        )}

                        {/* Not scored yet */}
                        {!pred && (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                Not yet scored — no review available.
                            </p>
                        )}
                    </div>
                </div>

                {/* Panel 4: Case Notes */}
                <CommentSection transactionId={tx.id} />
            </main>
        </div>
    );
}

/** Small reusable data row for detail panels */
function DataRow({ label, value, mono, bold, muted }: {
    label: string; value: string; mono?: boolean; bold?: boolean; muted?: boolean;
}) {
    return (
        <div>
            <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</dt>
            <dd className={`text-sm mt-0.5 ${mono ? 'font-mono' : ''} ${bold ? 'text-lg font-bold' : 'font-medium'}`}
                style={{ color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {value}
            </dd>
        </div>
    );
}
