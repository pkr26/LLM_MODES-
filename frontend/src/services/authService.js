import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const authService = axios.create({
  baseURL: `${API_URL}/api/auth`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Secure token management with httpOnly cookies as fallback
export const tokenStorage = {
  getAccessToken: () => {
    // Try to get from memory first (most secure)
    if (window.__app_tokens?.access_token) {
      return window.__app_tokens.access_token;
    }
    // Fallback to sessionStorage (better than localStorage)
    return sessionStorage.getItem('access_token');
  },
  
  setAccessToken: (token) => {
    // Store in memory for current session
    if (!window.__app_tokens) {
      window.__app_tokens = {};
    }
    window.__app_tokens.access_token = token;
    
    // Store in sessionStorage as backup (cleared on tab close)
    sessionStorage.setItem('access_token', token);
    
    // Set expiration timer to auto-clear token
    setTimeout(() => {
      tokenStorage.clearAccessToken();
    }, 15 * 60 * 1000); // 15 minutes
  },
  
  getRefreshToken: () => {
    // Try to get from memory first
    if (window.__app_tokens?.refresh_token) {
      return window.__app_tokens.refresh_token;
    }
    // Fallback to localStorage (only for refresh token)
    return localStorage.getItem('refresh_token');
  },
  
  setRefreshToken: (token) => {
    // Store in memory
    if (!window.__app_tokens) {
      window.__app_tokens = {};
    }
    window.__app_tokens.refresh_token = token;
    
    // Store in localStorage (secure HttpOnly cookies would be better)
    localStorage.setItem('refresh_token', token);
  },
  
  clearAccessToken: () => {
    if (window.__app_tokens) {
      delete window.__app_tokens.access_token;
    }
    sessionStorage.removeItem('access_token');
  },
  
  clearTokens: () => {
    if (window.__app_tokens) {
      delete window.__app_tokens.access_token;
      delete window.__app_tokens.refresh_token;
    }
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
};

// Request interceptor to add auth header
authService.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and security
authService.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 (Unauthorized) - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken && !tokenStorage.isTokenExpired(refreshToken)) {
          // Create a new axios instance to avoid interceptor loops
          const refreshResponse = await axios.post(
            `${API_URL}/api/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;
          tokenStorage.setAccessToken(access_token);
          tokenStorage.setRefreshToken(newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return authService(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        tokenStorage.clearTokens();
        
        // Only redirect if not already on auth page
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth?expired=true';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 423 (Locked) - account locked
    if (error.response?.status === 423) {
      console.warn('Account locked due to failed login attempts');
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData) => {
    try {
      const response = await authService.post('/register', userData);
      return response.data;
    } catch (error) {
      let errorMessage = 'Registration failed';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err.message || err).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      throw new Error(errorMessage);
    }
  },

  login: async (credentials) => {
    try {
      const response = await authService.post('/login', credentials);
      const { access_token, refresh_token } = response.data;
      
      tokenStorage.setAccessToken(access_token);
      tokenStorage.setRefreshToken(refresh_token);
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail;
      
      // Handle specific error cases
      if (error.response?.status === 423) {
        throw new Error('Account temporarily locked due to multiple failed attempts');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      
      let errorMessage = 'Login failed';
      if (message) {
        if (Array.isArray(message)) {
          errorMessage = message.map(err => err.msg || err.message || err).join(', ');
        } else if (typeof message === 'string') {
          errorMessage = message;
        } else {
          errorMessage = JSON.stringify(message);
        }
      }
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        await authService.post('/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      tokenStorage.clearTokens();
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await authService.get('/me');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get user information');
    }
  },

  refreshToken: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const response = await authService.post('/refresh', {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;
    tokenStorage.setAccessToken(access_token);
    tokenStorage.setRefreshToken(newRefreshToken);

    return response.data;
  },

  forgotPassword: async (email) => {
    try {
      const response = await authService.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Password reset request failed');
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await authService.post('/reset-password', {
        token,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Password reset failed');
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await authService.post('/verify-email', null, {
        params: { token }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Email verification failed');
    }
  },

  checkPasswordStrength: (password) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noRepeats: !/(.)\1{2,}/.test(password),
      noCommon: !/123|abc|qwerty|password/i.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [];

    if (!checks.length) feedback.push('Password must be at least 12 characters');
    if (!checks.uppercase) feedback.push('Add uppercase letters');
    if (!checks.lowercase) feedback.push('Add lowercase letters');
    if (!checks.numbers) feedback.push('Add numbers');
    if (!checks.special) feedback.push('Add special characters');
    if (!checks.noRepeats) feedback.push('Avoid repeated characters');
    if (!checks.noCommon) feedback.push('Avoid common sequences');

    return { score, feedback };
  },

  isAuthenticated: () => {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    
    return !!(accessToken && !tokenStorage.isTokenExpired(accessToken)) || 
           !!(refreshToken && !tokenStorage.isTokenExpired(refreshToken));
  }
};

export default authService;