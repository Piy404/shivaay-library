import { useEffect, useState, useCallback } from 'react';
import api, { clearCsrfToken, ensureCsrfToken } from '../utils/api';
import { AuthContext } from './useAuth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      await ensureCsrfToken();
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    localStorage.removeItem('userInfo');
    (async () => {
      try {
        await ensureCsrfToken();
        const { data } = await api.get('/auth/me');
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      await ensureCsrfToken();
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires2FA) {
        return { success: true, requires2FA: true };
      }
      setUser(data.user);
      return { success: true, requires2FA: false, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactorLogin = async (code) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/verify-login', { code });
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Invalid verification code',
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      await ensureCsrfToken();
      const { data } = await api.post('/auth/register', payload);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      const validationMsg = error.response?.data?.errors?.[0]?.message;
      return {
        success: false,
        error: validationMsg || error.response?.data?.message || 'Registration failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      clearCsrfToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        loading,
        login,
        verifyTwoFactorLogin,
        register,
        logout,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
