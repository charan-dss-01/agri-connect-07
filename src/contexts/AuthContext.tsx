import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthError, Session, User as SupaUser } from '@supabase/supabase-js';

export type UserRole = 'farmer' | 'industry' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approved: boolean;
  phone?: string;
  village?: string;
  landSize?: number;
  companyName?: string;
  location?: { lat: number; lng: number; address: string };
}

const ADMIN_EMAIL = 'admin@agriconnect.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_STORAGE_KEY = 'agri_admin_session';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    village?: string;
    landSize?: number;
    companyName?: string;
    lat?: number;
    lng?: number;
    address?: string;
    industryType?: string;
    monthlyRequirement?: number;
    priceOfferedPerTon?: number;
  }) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const getReadableAuthError = (error: AuthError): string => {
    if (error.status === 400) {
      const normalized = error.message.toLowerCase();

      if (normalized.includes('invalid login credentials')) {
        return 'Invalid email or password.';
      }

      if (normalized.includes('email not confirmed')) {
        return 'Please confirm your email before signing in.';
      }

      if (normalized.includes('anonymous sign-ins are disabled')) {
        return 'This sign-in method is disabled for this project.';
      }
    }

    return error.message;
  };

  const fetchUserProfile = async (supaUser: SupaUser): Promise<User | null> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', supaUser.id)
      .maybeSingle();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supaUser.id)
      .maybeSingle();

    if (profile?.approved === false) return null;

    const role = (roleData?.role as UserRole) || 'farmer';

    let companyName: string | undefined;
    if (role === 'industry') {
      const { data: industryProfile } = await supabase
        .from('industry_profiles')
        .select('company_name')
        .eq('user_id', supaUser.id)
        .maybeSingle();
      companyName = industryProfile?.company_name;
    }

    return {
      id: supaUser.id,
      name: profile?.name || '',
      email: supaUser.email || '',
      role,
      approved: profile?.approved ?? true,
      phone: profile?.phone || undefined,
      village: profile?.village || undefined,
      landSize: profile?.land_size ? Number(profile.land_size) : undefined,
      companyName,
      location: profile?.lat && profile?.lng
        ? {
            lat: Number(profile.lat),
            lng: Number(profile.lng),
            address: profile.address || '',
          }
        : undefined,
    };
  };

  useEffect(() => {
    const restoreAdminSession = () => {
      const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!storedAdmin) return null;

      try {
        return JSON.parse(storedAdmin) as User;
      } catch {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        return null;
      }
    };

    const storedAdmin = restoreAdminSession();

    const syncSessionUser = async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        if (storedAdmin) {
          setUser(storedAdmin);
          setLoading(false);
          return;
        }

        setUser(null);
        setLoading(false);
        return;
      }

      const nextUser = await fetchUserProfile(nextSession.user);
      if (!nextUser) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setTimeout(() => {
        void syncSessionUser(nextSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void syncSessionUser(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { error: 'Email and password are required.' };
    }

    if (normalizedEmail === ADMIN_EMAIL && normalizedPassword === ADMIN_PASSWORD) {
      const adminUser: User = {
        id: 'local-admin',
        name: 'Admin',
        email: ADMIN_EMAIL,
        role: 'admin',
        approved: true,
      };

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      setSession(null);
      return {};
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (error) return { error: getReadableAuthError(error) };

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('approved')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profile?.approved === false) {
        await supabase.auth.signOut();
        return { error: 'Your account has been blocked. Contact the administrator.' };
      }
    }

    return {};
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    village?: string;
    landSize?: number;
    companyName?: string;
    lat?: number;
    lng?: number;
    address?: string;
    industryType?: string;
    monthlyRequirement?: number;
    priceOfferedPerTon?: number;
  }): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };

    if (data.user && data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: userData.phone || null,
          village: userData.village || null,
          land_size: userData.landSize || null,
          lat: userData.lat || null,
          lng: userData.lng || null,
          address: userData.address || null,
        })
        .eq('user_id', data.user.id);
      if (profileError) return { error: profileError.message };

      if (userData.role === 'industry' && userData.companyName) {
        const { error: industryError } = await supabase
          .from('industry_profiles')
          .update({
            company_name: userData.companyName,
            monthly_requirement: userData.monthlyRequirement || 0,
            price_offered_per_ton: userData.priceOfferedPerTon || 0,
            lat: userData.lat || null,
            lng: userData.lng || null,
            address: userData.address || null,
            industry_type: userData.industryType || 'Power Plant',
          })
          .eq('user_id', data.user.id);
        if (industryError) return { error: industryError.message };
      }
    }

    return { requiresEmailConfirmation: !data.session };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
