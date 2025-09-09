import { create } from 'zustand';
import { authAPI, tokenStorage } from '../services/authService';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize auth state from localStorage
  initializeAuth: async () => {
    try {
      const token = tokenStorage.getAccessToken();
      if (token) {
        const user = await authAPI.getCurrentUser();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Register new user and automatically log them in
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // Register the user
      await authAPI.register(userData);
      
      // Automatically log them in after successful registration
      await authAPI.login({
        email: userData.email,
        password: userData.password
      });
      
      // Get the full user profile after login
      const fullUser = await authAPI.getCurrentUser();
      
      set({ user: fullUser, isAuthenticated: true, isLoading: false });
      return { success: true, user: fullUser, autoLogin: true };
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle Pydantic validation errors
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  // Login user
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.login(credentials);
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Update user
  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...userData } });
    }
  },

  // Check if user is authenticated
  checkAuth: () => {
    const token = tokenStorage.getAccessToken();
    return !!token && get().isAuthenticated;
  },
}));

export default useAuthStore;