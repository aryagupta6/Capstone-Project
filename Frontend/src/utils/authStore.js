import { create } from 'zustand';

/**
 * Zustand global auth state store.
 * Manages user session, JWT credentials, and local storage synchronizations.
 */
const useAuthStore = create((set) => ({
  user: localStorage.getItem('token')
    ? {
        email: localStorage.getItem('email'),
        role: localStorage.getItem('role') || 'USER',
        planType: localStorage.getItem('planType') || 'FREE',
        status: localStorage.getItem('status') || 'PENDING_APPROVAL',
        token: localStorage.getItem('token'),
      }
    : null,
  
  isAuthenticated: !!localStorage.getItem('token'),

  // Authenticate session and write metadata to localStorage
  login: (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('email', userData.email);
    localStorage.setItem('role', userData.role);
    localStorage.setItem('planType', userData.planType || 'FREE');
    localStorage.setItem('status', userData.status || 'PENDING_APPROVAL');

    set({
      user: userData,
      isAuthenticated: true,
    });
  },

  // Clear state and log out
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('planType');
    localStorage.removeItem('status');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('apiSecret');
    
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  // Safely update user plan settings
  setPlan: (planType) => {
    localStorage.setItem('planType', planType);
    set((state) => ({
      user: state.user ? { ...state.user, planType } : null,
    }));
  },
}));

export default useAuthStore;
