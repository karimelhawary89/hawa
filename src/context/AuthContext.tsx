import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/erp';
import { apiRequest } from '../lib/api';

interface ActiveTimer {
  matterId: string;
  matterTitle: string;
  startedAt: number;
  elapsedSeconds: number;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isPro: boolean;
  plan: 'free' | 'pro';
  dir: 'rtl' | 'ltr';
  toggleDirection: () => void;
  loginWithEmail: (email: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  signup: (name: string, email: string, role?: string) => Promise<void>;
  logout: () => void;
  switchPlan: (plan: 'free' | 'pro') => Promise<void>;
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
  activeTimer: ActiveTimer | null;
  startTimer: (matterId: string, matterTitle: string) => void;
  stopTimer: () => ActiveTimer | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'baraa_erp_session_user';
const DIR_KEY = 'baraa_erp_dir';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [dir, setDir] = useState<'rtl' | 'ltr'>(() => {
    const saved = localStorage.getItem(DIR_KEY);
    return saved === 'ltr' ? 'ltr' : 'rtl';
  });
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', dir === 'rtl' ? 'ar' : 'en');
    localStorage.setItem(DIR_KEY, dir);
  }, [dir]);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setActiveTimer((prev) => (prev ? { ...prev, elapsedSeconds: Math.floor((Date.now() - prev.startedAt) / 1000) } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.matterId]);

  const persistUser = (u: UserProfile | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loginWithEmail = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      persistUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginDemo = useCallback(async () => {
    await loginWithEmail('karim@baraa-legal.com');
  }, [loginWithEmail]);

  const signup = useCallback(async (name: string, email: string, role?: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, role }),
      });
      persistUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    persistUser(null);
  }, []);

  const switchPlan = useCallback(
    async (plan: 'free' | 'pro') => {
      if (!user) return;
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/switch-plan', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, plan }),
      });
      persistUser(data.user);
    },
    [user]
  );

  const updateUserProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      const data = await apiRequest<{ item: UserProfile }>(`/api/entities/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      persistUser(data.item);
    },
    [user]
  );

  const toggleDirection = useCallback(() => {
    setDir((d) => (d === 'rtl' ? 'ltr' : 'rtl'));
  }, []);

  const startTimer = useCallback((matterId: string, matterTitle: string) => {
    setActiveTimer({
      matterId,
      matterTitle,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    });
  }, []);

  const stopTimer = useCallback(() => {
    const snap = activeTimer;
    setActiveTimer(null);
    return snap;
  }, [activeTimer]);

  const plan = user?.plan || 'free';
  const isPro = plan === 'pro';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPro,
        plan,
        dir,
        toggleDirection,
        loginWithEmail,
        loginDemo,
        signup,
        logout,
        switchPlan,
        updateUserProfile,
        activeTimer,
        startTimer,
        stopTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function usePlan() {
  const { isPro, plan, switchPlan } = useAuth();
  return { isPro, plan, isFree: !isPro, switchPlan };
}
