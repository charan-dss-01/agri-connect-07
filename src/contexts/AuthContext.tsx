import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  login: (email: string, password: string, role: UserRole) => boolean;
  register: (userData: Partial<User> & { role: UserRole; email: string; password: string }) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<UserRole, User> = {
  farmer: {
    id: 'f1',
    name: 'Rajesh Kumar',
    email: 'farmer@demo.com',
    role: 'farmer',
    phone: '+91 98765 43210',
    village: 'Karnal, Haryana',
    landSize: 12,
    location: { lat: 29.6857, lng: 76.9905, address: 'Karnal, Haryana' },
  },
  industry: {
    id: 'i1',
    name: 'Sunita Verma',
    email: 'industry@demo.com',
    role: 'industry',
    companyName: 'GreenPower Biomass Ltd',
    phone: '+91 99887 76655',
    location: { lat: 28.6139, lng: 77.2090, address: 'New Delhi' },
  },
  admin: {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'admin',
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string, role: UserRole): boolean => {
    // Simulated login — accept any credentials
    setUser(DEMO_USERS[role]);
    return true;
  };

  const register = (userData: Partial<User> & { role: UserRole }): boolean => {
    setUser({ ...DEMO_USERS[userData.role], ...userData, id: `u_${Date.now()}` });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
