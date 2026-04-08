import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Leaf, LogOut, Home, BarChart3, Users, Factory, Wheat, Menu, Settings, ShoppingCart, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
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
        { icon: Settings, label: t('navigation.settings'), path: '/admin/settings' },
      ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static z-40 h-full w-64 gradient-hero flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">{t('brand.name')}</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">{t('brand.tagline')}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                location.pathname === item.path
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            {t('navigation.logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-md hover:bg-muted" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-muted-foreground">{t('header.welcomeBack')}</p>
              <p className="font-semibold text-sm">{user?.name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <NotificationPanel />
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
