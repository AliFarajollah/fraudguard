import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthResponse } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, role?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On first load, check if we already have a token + user in localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('fraudguard_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                // If it's corrupt, wipe it
                localStorage.removeItem('fraudguard_user');
                localStorage.removeItem('fraudguard_token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', {
            email,
            password,
        });
        localStorage.setItem('fraudguard_token', data.access_token);
        localStorage.setItem('fraudguard_user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const register = async (email: string, password: string, role?: string) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/register', {
            email,
            password,
            ...(role ? { role } : {}),
        });
        localStorage.setItem('fraudguard_token', data.access_token);
        localStorage.setItem('fraudguard_user', JSON.stringify(data.user));
        setUser(data.user);
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

// Hook so components can do: const { user, login } = useAuth()
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}