import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'Citizen' | 'Clerk' | 'Officer' | 'Manager' | 'Super Admin';
  department_id?: number | null;
  department_name?: string | null;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  theme: 'dark' | 'light';
  notifications: Notification[];
  activeRequestId: number | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (n: Notification) => void;
  setActiveRequestId: (id: number | null) => void;
}

export const useStore = create<AppState>((set) => {
  // Load initial state from LocalStorage
  const savedToken = localStorage.getItem('govflow_token');
  const savedUser = localStorage.getItem('govflow_user');
  
  let initialUser: User | null = null;
  if (savedUser) {
    try {
      initialUser = JSON.parse(savedUser);
    } catch (e) {
      localStorage.removeItem('govflow_user');
    }
  }

  return {
    user: initialUser,
    token: savedToken,
    theme: (localStorage.getItem('govflow_theme') as 'dark' | 'light') || 'dark',
    notifications: [],
    activeRequestId: null,

    setAuth: (user, token) => {
      localStorage.setItem('govflow_token', token);
      localStorage.setItem('govflow_user', JSON.stringify(user));
      set({ user, token });
    },

    logout: () => {
      localStorage.removeItem('govflow_token');
      localStorage.removeItem('govflow_user');
      set({ user: null, token: null, notifications: [], activeRequestId: null });
    },

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('govflow_theme', nextTheme);
      return { theme: nextTheme };
    }),

    setNotifications: (notifications) => set({ notifications }),
    
    addNotification: (n) => set((state) => ({ 
      notifications: [n, ...state.notifications] 
    })),

    setActiveRequestId: (id) => set({ activeRequestId: id }),
  };
});
