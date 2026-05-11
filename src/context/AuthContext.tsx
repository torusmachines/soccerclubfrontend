import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getMeApi } from '@/services/apiService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string;
  id: string;
  scoutId?: string;
  email: string;
  fullName: string;
  role: string;
  userStatus?: string;
  consentGiven?: boolean;
  consentGivenAt?: string;
  consentVersion?: string;
  isActive?: boolean;
  loginUser?: { id: string; type: 'Player' | 'Scout' } | null;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: Omit<AuthUser, 'name'> & Partial<Pick<AuthUser, 'name'>>) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';
const API_BASE = 'https://soccerclubbackend.onrender.com/api';

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const normalizeAuthUser = useCallback((incomingUser: Omit<AuthUser, 'name'> & Partial<Pick<AuthUser, 'name'>>): AuthUser => {
    const resolvedName = incomingUser.name?.trim() || incomingUser.fullName?.trim() || '';
    return {
      ...incomingUser,
      name: resolvedName,
    };
  }, []);

  const login = useCallback((newToken: string, newUser: Omit<AuthUser, 'name'> & Partial<Pick<AuthUser, 'name'>>) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(normalizeAuthUser(newUser));
  }, [normalizeAuthUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await getMeApi();
      setToken(storedToken);
      setUser(normalizeAuthUser(res as Omit<AuthUser, 'name'> & Partial<Pick<AuthUser, 'name'>>));
    } catch {
      // Token is invalid / expired — clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [normalizeAuthUser]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.error('useAuth fallback activated: AuthContext is unavailable. Ensure components are wrapped in <AuthProvider>.');
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: () => {
        // no-op fallback to avoid runtime crash during transient HMR states
      },
      logout: () => {
        // no-op fallback to avoid runtime crash during transient HMR states
      },
      loadUser: async () => {
        // no-op fallback to avoid runtime crash during transient HMR states
      },
    };
  }
  return ctx;
};
