import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Comment {
    id: number;
    content: string;
    createdAt: string;
    authorId: number;
    author: { id: number; email: string; role: string };
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
    transactionId: number;
}

export function CommentSection({ transactionId }: Props) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await apiClient.get<Comment[]>(`/transactions/${transactionId}/comments`);
            setComments(res.data);
        } catch {
            // silently ignore — comments are supplementary
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => { void fetchComments(); }, [fetchComments]);

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (trimmed.length < 3) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiClient.post(`/transactions/${transactionId}/comments`, { content: trimmed });
            setContent('');
            await fetchComments();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        try {
            await apiClient.delete(`/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
        } catch {
            // silently ignore
        }
    };

    const canDelete = (comment: Comment) =>
        user?.role === 'admin' || comment.authorId === (user as unknown as { id: number })?.id;

    return (
        <div className="card p-6 mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-muted)' }}>
                Case Notes
            </h3>

            {loading ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading notes…</p>
            ) : comments.length === 0 ? (
                <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
                    No case notes yet.
                </p>
            ) : (
                <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                        <div key={c.id} className="flex gap-3 items-start">
                            {/* Avatar initial */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                style={{ background: 'var(--brand-primary)', color: 'white' }}
                            >
                                {c.author.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {c.author.email}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {timeAgo(c.createdAt)}
                                    </span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {c.content}
                                </p>
                            </div>
                            {canDelete(c) && (
                                <button
                                    onClick={() => void handleDelete(c.id)}
                                    className="text-xs hover:underline flex-shrink-0"
                                    style={{ color: 'var(--status-danger)' }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add comment form */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a case note…"
                    rows={2}
                    className="input-field w-full text-sm mb-2 resize-none"
                />
                {error && <p className="text-xs mb-2" style={{ color: 'var(--status-danger)' }}>{error}</p>}
                <button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || content.trim().length < 3}
                    className="btn-primary text-sm disabled:opacity-40"
                >
                    {submitting ? 'Posting…' : 'Post Note'}
                </button>
            </div>
        </div>
    );
}
