import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { generateRandomListing, sampleNotifications, type ResidueListing, type Notification } from '@/data/mockData';

interface DemoContextType {
  demoMode: boolean;
  toggleDemo: () => void;
  liveListings: ResidueListing[];
  liveNotifications: Notification[];
  liveStats: { farmers: number; industries: number; transactions: number; biomass: number };
}

const DemoContext = createContext<DemoContextType | null>(null);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoMode] = useState(false);
  const [liveListings, setLiveListings] = useState<ResidueListing[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>(sampleNotifications);
  const [liveStats, setLiveStats] = useState({ farmers: 24, industries: 4, transactions: 4, biomass: 31 });

  const toggleDemo = useCallback(() => setDemoMode(p => !p), []);

  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      const newListing = generateRandomListing();
      setLiveListings(p => [newListing, ...p].slice(0, 20));
      setLiveStats(p => ({
        farmers: p.farmers + (Math.random() > 0.7 ? 1 : 0),
        industries: p.industries,
        transactions: p.transactions + 1,
        biomass: p.biomass + newListing.quantity,
      }));
      setLiveNotifications(p => [{
        id: `n_${Date.now()}`,
        userId: 'a1',
        message: `New listing: ${newListing.quantity}t ${newListing.cropType} from ${newListing.location.address}`,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'info' as const,
      }, ...p].slice(0, 30));
    }, 3000);
    return () => clearInterval(interval);
  }, [demoMode]);

  return (
    <DemoContext.Provider value={{ demoMode, toggleDemo, liveListings, liveNotifications, liveStats }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be inside DemoProvider');
  return ctx;
};
