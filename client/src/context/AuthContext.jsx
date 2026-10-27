import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mealrelay_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const savedToken = localStorage.getItem('mealrelay_token');
    if (!savedToken) {
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data.user);
        setOrganization(res.data.organization);
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Session restoration failed:', err.message);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem('mealrelay_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setOrganization(res.data.organization);
      return res.data;
    }
    throw new Error('Login failed');
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.data) {
      localStorage.setItem('mealrelay_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setOrganization(res.data.organization);
      return res.data;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('mealrelay_token');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const value = {
    user,
    organization,
    token,
    isLoading,
    isAuthenticated: !!user,
    isDonor: user?.role === 'DONOR',
    isNgo: user?.role === 'NGO',
    isAdmin: user?.role === 'ADMIN',
    isApproved: organization?.approvalStatus === 'APPROVED',
    login,
    register,
    logout,
    refreshUser: fetchCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
