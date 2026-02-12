import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupaUser, Session } from '@supabase/supabase-js';

export type UserRole = 'farmer' | 'industry' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  village?: string;
  landSize?: number;
  companyName?: string;
  location?: { lat: number; lng: number; address: string };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (userData: { name: string; email: string; password: string; role: UserRole; phone?: string; village?: string; landSize?: number; companyName?: string; lat?: number; lng?: number; address?: string; industryType?: string; monthlyRequirement?: number; priceOfferedPerTon?: number }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supaUser: SupaUser): Promise<User | null> => {
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', supaUser.id)
      .maybeSingle();

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supaUser.id)
      .maybeSingle();

    const role = (roleData?.role as UserRole) || 'farmer';

    // Fetch industry profile if industry
    let companyName: string | undefined;
    if (role === 'industry') {
      const { data: indProfile } = await supabase
        .from('industry_profiles')
        .select('company_name')
        .eq('user_id', supaUser.id)
        .maybeSingle();
      companyName = indProfile?.company_name;
    }

    return {
      id: supaUser.id,
      name: profile?.name || '',
      email: supaUser.email || '',
      role,
      phone: profile?.phone || undefined,
      village: profile?.village || undefined,
      landSize: profile?.land_size ? Number(profile.land_size) : undefined,
      companyName,
      location: profile?.lat && profile?.lng ? { lat: Number(profile.lat), lng: Number(profile.lng), address: profile.address || '' } : undefined,
    };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          const u = await fetchUserProfile(session.user);
          setUser(u);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user).then(u => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const register = async (userData: { name: string; email: string; password: string; role: UserRole; phone?: string; village?: string; landSize?: number; companyName?: string; lat?: number; lng?: number; address?: string; industryType?: string; monthlyRequirement?: number; priceOfferedPerTon?: number }): Promise<{ error?: string }> => {
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

    // Update profile with additional data
    if (data.user) {
      await supabase.from('profiles').update({
        phone: userData.phone || null,
        village: userData.village || null,
        land_size: userData.landSize || null,
        lat: userData.lat || null,
        lng: userData.lng || null,
        address: userData.address || null,
      }).eq('user_id', data.user.id);

      // Create industry profile if industry
      if (userData.role === 'industry' && userData.companyName) {
        await supabase.from('industry_profiles').insert({
          user_id: data.user.id,
          company_name: userData.companyName,
          monthly_requirement: userData.monthlyRequirement || 0,
          price_offered_per_ton: userData.priceOfferedPerTon || 0,
          lat: userData.lat || null,
          lng: userData.lng || null,
          address: userData.address || null,
          industry_type: userData.industryType || 'Power Plant',
        });
      }
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
