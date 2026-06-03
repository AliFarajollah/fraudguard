import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'analyst' | 'admin' | 'viewer'>('analyst');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const { register } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await register(email, password, role);
            // Admin → logged in immediately; everyone else → awaiting approval
            navigate(result.pending ? '/pending-approval' : '/dashboard');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                const data = err.response.data as { message?: string | string[] };
                const msg = Array.isArray(data.message)
                    ? data.message.join(', ')
                    : data.message ?? 'Registration failed';
                setError(msg);
            } else {
                setError('Network error — is the API running?');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4"
             style={{ background: 'var(--bg-page)' }}>
            <div className="card w-full max-w-md p-8">
                <div className="flex justify-end mb-4">
                    <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
                        {theme === 'light' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" /><line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="mb-6 text-center">
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                         style={{ background: 'var(--brand-primary)' }}>
                        <span className="text-xl font-bold" style={{ color: 'var(--text-inverse)' }}>F</span>
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        FraudGuard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Create an account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1"
                               style={{ color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            type="email" required value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field w-full"
                            placeholder="analyst@bank.com" disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1"
                               style={{ color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password" required minLength={8} value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field w-full"
                            placeholder="Minimum 8 characters" disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1"
                               style={{ color: 'var(--text-secondary)' }}>Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'analyst' | 'admin' | 'viewer')}
                            className="input-field w-full" disabled={isSubmitting}
                        >
                            <option value="analyst">Analyst</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Manager</option>
                        </select>
                    </div>

                    {error && <div className="alert-danger text-sm">{error}</div>}

                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                        {isSubmitting ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium hover:underline"
                          style={{ color: 'var(--brand-primary)' }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}