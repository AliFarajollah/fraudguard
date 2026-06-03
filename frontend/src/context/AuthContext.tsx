import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthResponse } from '../types';
import { apiClient } from '../api/client';

/** Returned by register() — tells the caller whether account is pending or active */
export interface RegisterResult {
    pending: boolean;    // true  → non-admin, awaiting approval (no JWT issued)
    // false → admin, logged in immediately
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, role?: string) => Promise<RegisterResult>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On first load, restore session from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('fraudguard_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('fraudguard_user');
                localStorage.removeItem('fraudguard_token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
        localStorage.setItem('fraudguard_token', data.access_token);
        localStorage.setItem('fraudguard_user', JSON.stringify(data.user));
        setUser(data.user);
    };

    /**
     * register() now handles two cases:
     *  - Admin roles:      API returns { access_token, user } → log in immediately
     *  - Non-admin roles:  API returns { pending: true, message } → no token, must wait for approval
     *
     * Returns { pending: true/false } so the page can redirect appropriately.
     */
    const register = async (email: string, password: string, role?: string): Promise<RegisterResult> => {
        const { data } = await apiClient.post<
            AuthResponse | { pending: true; message: string }
        >('/auth/register', {
            email,
            password,
            ...(role ? { role } : {}),
        });

        if ('pending' in data && data.pending) {
            // Account created but needs admin approval — do NOT set auth state
            return { pending: true };
        }

        // Admin registration — log in immediately
        const authData = data as AuthResponse;
        localStorage.setItem('fraudguard_token', authData.access_token);
        localStorage.setItem('fraudguard_user', JSON.stringify(authData.user));
        setUser(authData.user);
        return { pending: false };
    };

    const logout = () => {
        localStorage.removeItem('fraudguard_token');
        localStorage.removeItem('fraudguard_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}