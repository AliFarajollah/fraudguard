import { useState } from 'react';
import { apiClient } from '../api/client';
import axios from 'axios';

const SAMPLE_PAYLOAD = JSON.stringify(
    {
        transactions: [
            {
                amount: 0,
                occurredAt: new Date().toISOString(),
                features: {
                    Time: 406, Amount: 0,
                    V1: -2.3122, V2: 1.9519, V3: -1.6099, V4: 3.9979,
                    V5: -0.5221, V6: -1.4265, V7: -2.5374, V8: 1.3917,
                    V9: -2.77, V10: -2.7722, V11: 3.202, V12: -2.8999,
                    V13: -0.5952, V14: -4.2893, V15: 0.3898, V16: -1.1407,
                    V17: -2.8301, V18: -0.0168, V19: 0.417, V20: 0.1267,
                    V21: 0.5172, V22: -0.035, V23: -0.4653, V24: 0.3201,
                    V25: 0.0445, V26: 0.1778, V27: 0.2611, V28: -0.1432,
                },
            },
        ],
    },
    null,
    2,
);

interface BulkResult { processed: number; failed: number; }
interface Props { onClose: () => void; onSuccess: () => void; }

export function BulkUploadModal({ onClose, onSuccess }: Props) {
    const [jsonInput, setJsonInput] = useState('');
    const [preview, setPreview] = useState<object[] | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkResult | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handlePreview = () => {
        setPreviewError(null); setPreview(null);
        try {
            const parsed = JSON.parse(jsonInput);
            const rows: object[] = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.transactions) ? parsed.transactions : null;
            if (!rows) throw new Error('Expected a JSON array or an object with a "transactions" array');
            setPreview(rows.slice(0, 3));
        } catch (err) {
            setPreviewError(err instanceof Error ? err.message : 'Invalid JSON');
        }
    };

    const handleUpload = async () => {
        setUploadError(null);
        let body: { transactions: object[] };
        try {
            const parsed = JSON.parse(jsonInput);
            if (Array.isArray(parsed)) body = { transactions: parsed };
            else if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.transactions))
                body = parsed as { transactions: object[] };
            else throw new Error('Invalid format');
        } catch { setUploadError('Invalid JSON input.'); return; }

        setUploading(true);
        try {
            const res = await apiClient.post<BulkResult>('/transactions/bulk', body);
            setResult(res.data);
        } catch (err) {
            if (axios.isAxiosError(err)) setUploadError(err.response?.data?.message ?? 'Upload failed');
            else setUploadError('Unexpected error');
        } finally { setUploading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.5)' }}
             role="dialog" aria-modal="true">
            <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4"
                     style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                        Bulk Upload & Score Transactions
                    </h2>
                    <button id="btn-close-modal" onClick={onClose}
                            className="text-2xl leading-none" style={{ color: 'var(--text-muted)' }}>
                        ×
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    {result ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                                 style={{
                                     background: result.failed === 0 ? 'var(--status-success)' : 'var(--status-warning)',
                                     color: 'white',
                                 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Complete</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Processed: <strong>{result.processed}</strong> · Failed:{' '}
                                <strong style={{ color: result.failed > 0 ? 'var(--status-danger)' : undefined }}>
                                    {result.failed}
                                </strong>
                            </p>
                            <button id="btn-done" onClick={onSuccess} className="btn-primary mt-4 text-sm">Done</button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Sample payload (click to copy):
                                </p>
                                <pre id="sample-payload"
                                     onClick={() => void navigator.clipboard.writeText(SAMPLE_PAYLOAD)}
                                     className="rounded-lg p-3 text-xs font-mono cursor-pointer overflow-auto max-h-40 whitespace-pre-wrap transition-colors"
                                     style={{
                                         background: 'var(--bg-code)',
                                         color: 'var(--text-secondary)',
                                         border: '1px solid var(--border-default)',
                                     }}>
                                    {SAMPLE_PAYLOAD}
                                </pre>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    Click the code block to copy it to clipboard.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1"
                                       style={{ color: 'var(--text-secondary)' }}>
                                    Paste your JSON array here:
                                </label>
                                <textarea id="bulk-json-input" value={jsonInput}
                                          onChange={(e) => setJsonInput(e.target.value)} rows={8}
                                          placeholder='{ "transactions": [ { "amount": 100, ... } ] }'
                                          className="input-field w-full text-sm font-mono resize-none" />
                            </div>

                            <div className="flex gap-3">
                                <button id="btn-preview" onClick={handlePreview}
                                        disabled={!jsonInput.trim()} className="btn-ghost text-sm disabled:opacity-40">
                                    Preview first 3 rows
                                </button>
                            </div>

                            {previewError && <div className="alert-danger text-xs">{previewError}</div>}

                            {preview && (
                                <div className="table-container overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="table-header">
                                            <tr>
                                                {['#', 'Amount', 'Date', 'Features (keys)'].map((h) => (
                                                    <th key={h} className="px-3 py-2 text-left"
                                                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((row, i) => {
                                                const r = row as Record<string, unknown>;
                                                const featureKeys = typeof r['features'] === 'object' && r['features'] !== null
                                                    ? Object.keys(r['features']).length : 0;
                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--table-divider)' }}>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>€{String(r['amount'] ?? '—')}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                                                            {r['occurredAt'] ? new Date(r['occurredAt'] as string).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{featureKeys} feature keys</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {uploadError && <div className="alert-danger text-xs">{uploadError}</div>}

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
                                <button id="btn-upload-score" onClick={() => void handleUpload()}
                                        disabled={!jsonInput.trim() || uploading}
                                        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                                    {uploading ? 'Scoring…' : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            Upload & Score All
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
