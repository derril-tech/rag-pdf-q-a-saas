import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'user';
    organizationId: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthActions {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    register: (email: string, password: string, name: string) => Promise<void>;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            // State
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Actions
            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Mock response
                    const mockUser: User = {
                        id: 'user-123',
                        email,
                        name: 'John Doe',
                        role: 'user',
                        organizationId: 'org-456'
                    };

                    const mockToken = 'mock-jwt-token';

                    set({
                        user: mockUser,
                        token: mockToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Login failed'
                    });
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            register: async (email: string, password: string, name: string) => {
                set({ isLoading: true, error: null });
                try {
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Mock response
                    const mockUser: User = {
                        id: 'user-123',
                        email,
                        name,
                        role: 'user',
                        organizationId: 'org-456'
                    };

                    const mockToken = 'mock-jwt-token';

                    set({
                        user: mockUser,
                        token: mockToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Registration failed'
                    });
                }
            },

            setUser: (user: User) => {
                set({ user, isAuthenticated: true });
            },

            setToken: (token: string) => {
                set({ token });
            },

            clearError: () => {
                set({ error: null });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);
