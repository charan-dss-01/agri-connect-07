import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Leaf, LogOut, Home, BarChart3, Users, Factory, Wheat, Menu, Settings, ShoppingCart, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationPanel from '@/components/NotificationPanel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation('common');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = user?.role === 'farmer'
    ? [
        { icon: Home, label: t('navigation.dashboard'), path: '/farmer' },
        { icon: Wheat, label: t('navigation.listResidue'), path: '/farmer/list' },
        { icon: BarChart3, label: t('navigation.myRequests'), path: '/farmer/requests' },
        { icon: Settings, label: t('navigation.settings'), path: '/farmer/settings' },
      ]
    : user?.role === 'industry'
    ? [
        { icon: Home, label: t('navigation.dashboard'), path: '/industry' },
        { icon: ShoppingCart, label: t('navigation.browseListings'), path: '/industry/browse' },
        { icon: Factory, label: t('navigation.myRequests'), path: '/industry/requests' },
        { icon: Settings, label: t('navigation.settings'), path: '/industry/settings' },
      ]
    : [
        { icon: Home, label: t('navigation.dashboard'), path: '/admin' },
        { icon: Users, label: t('navigation.users'), path: '/admin/users' },
        { icon: BarChart3, label: t('navigation.transactions'), path: '/admin/transactions' },
        { icon: ShieldAlert, label: t('navigation.fraudReports'), path: '/admin/fraud-reports' },
        { icon: ShieldAlert, label: 'Complaints', path: '/admin/complaints' },
        { icon: Settings, label: t('navigation.settings'), path: '/admin/settings' },
      ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-background/95 overflow-hidden">
      {sidebarOpen && (
        <motion.div 
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      <AnimatePresence>
        <motion.aside 
          className={`fixed md:static z-40 h-full w-64 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 flex flex-col transition-transform duration-200 border-r border-sidebar-border/40 backdrop-blur-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          <motion.div 
            className="flex items-center gap-2.5 px-5 py-6 border-b border-sidebar-border/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div 
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
              whileHover={{ scale: 1.05 }}
            >
              <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">{t('brand.name')}</h1>
              <p className="text-[10px] text-sidebar-foreground/70 uppercase tracking-widest">{t('brand.tagline')}</p>
            </div>
          </motion.div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, idx) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group relative ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-foreground shadow-lg shadow-primary/20'
                      : 'text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/55'
                  }`}
                >
                  {location.pathname === item.path && (
                    <motion.div 
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-accent to-primary rounded-r-full"
                      layoutId="activeIndicator"
                    />
                  )}
                  <span className={`transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'scale-110' : ''}`}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <motion.div 
            className="px-3 pb-4 border-t border-sidebar-border/30 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              onClick={handleLogout}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-red-500/20 transition-colors text-sm font-medium group"
            >
              <LogOut className="w-4 h-4 group-hover:animate-pulse" />
              {t('navigation.logout')}
            </motion.button>
          </motion.div>
        </motion.aside>
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.header 
          className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-border/20 bg-card/40 backdrop-blur-xl shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <motion.button 
              className="md:hidden p-2 rounded-lg hover:bg-accent/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </motion.button>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('header.welcomeBack')}</p>
              <p className="font-semibold text-sm text-foreground">{user?.name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <NotificationPanel />
            <motion.div 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/30"
              whileHover={{ scale: 1.05 }}
            >
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </motion.div>
          </div>
        </motion.header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
