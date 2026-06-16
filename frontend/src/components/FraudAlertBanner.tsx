import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Prediction } from '../types';

const DISMISS_KEY = 'fraudguard_banner_dismissed';

export function FraudAlertBanner() {
    const [count, setCount] = useState(0);
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem(DISMISS_KEY) === 'true',
    );
    const navigate = useNavigate();

    useEffect(() => {
        if (dismissed) return;
        const fetch = async () => {
            try {
                const res = await apiClient.get<Prediction[]>('/predictions/flagged');
                setCount(res.data.length);
            } catch {
                // non-critical — silently ignore
            }
        };
        void fetch();
    }, [dismissed]);

    if (dismissed || count === 0) return null;

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, 'true');
        setDismissed(true);
    };

    return (
        <div
            style={{
                background: 'var(--status-danger)',
                color: 'white',
            }}
            className="px-6 py-3 flex items-center justify-between gap-4"
        >
            <div className="flex items-center gap-2 text-sm font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {count} high-probability fraud transaction{count !== 1 ? 's' : ''} require review
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/reviews')}
                    className="text-sm font-semibold underline hover:no-underline"
                    style={{ color: 'white' }}
                >
                    Review Now
                </button>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss alert"
                    style={{ color: 'white', opacity: 0.8 }}
                    className="hover:opacity-100"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}
