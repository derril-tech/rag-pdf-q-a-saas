import { create } from 'zustand';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
}

interface Modal {
    id: string;
    isOpen: boolean;
    component: React.ComponentType<any>;
    props?: Record<string, any>;
}

interface UIState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
    modals: Modal[];
    loadingStates: Record<string, boolean>;
}

interface UIActions {
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    openModal: (modal: Omit<Modal, 'id' | 'isOpen'>) => string;
    closeModal: (id: string) => void;
    setLoading: (key: string, loading: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
    // State
    sidebarOpen: false,
    theme: 'light',
    notifications: [],
    modals: [],
    loadingStates: {},

    // Actions
    toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
    },

    setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
    },

    setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        // Apply theme to document
        document.documentElement.classList.toggle('dark', theme === 'dark');
    },

    addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random()}`;
        const newNotification: Notification = {
            ...notification,
            id,
            duration: notification.duration || 5000
        };

        set(state => ({
            notifications: [...state.notifications, newNotification]
        }));

        // Auto-remove notification after duration
        if (newNotification.duration > 0) {
            setTimeout(() => {
                get().removeNotification(id);
            }, newNotification.duration);
        }
    },

    removeNotification: (id: string) => {
        set(state => ({
            notifications: state.notifications.filter(n => n.id !== id)
        }));
    },

    clearNotifications: () => {
        set({ notifications: [] });
    },

    openModal: (modal) => {
        const id = `modal-${Date.now()}-${Math.random()}`;
        const newModal: Modal = {
            ...modal,
            id,
            isOpen: true
        };

        set(state => ({
            modals: [...state.modals, newModal]
        }));

        return id;
    },

    closeModal: (id: string) => {
        set(state => ({
            modals: state.modals.map(m =>
                m.id === id ? { ...m, isOpen: false } : m
            )
        }));

        // Remove modal after animation
        setTimeout(() => {
            set(state => ({
                modals: state.modals.filter(m => m.id !== id)
            }));
        }, 200);
    },

    setLoading: (key: string, loading: boolean) => {
        set(state => ({
            loadingStates: {
                ...state.loadingStates,
                [key]: loading
            }
        }));
    }
}));
