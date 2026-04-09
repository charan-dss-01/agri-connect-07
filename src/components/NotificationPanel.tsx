import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { fallbackLanguage, languageLocales } from '@/i18n/resources';

interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}

const NOTIFICATION_LIMIT = 20;
const CHANNEL_CLEANUP_DELAY_MS = 1500;

let sharedNotificationsChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedNotificationsUserId: string | null = null;
let sharedNotificationsSubscribers = 0;
let sharedNotificationsCleanupTimer: ReturnType<typeof setTimeout> | null = null;
const sharedNotificationListeners = new Set<(notification: NotificationItem) => void>();

const clearSharedNotificationsCleanup = () => {
  if (sharedNotificationsCleanupTimer !== null) {
    clearTimeout(sharedNotificationsCleanupTimer);
    sharedNotificationsCleanupTimer = null;
  }
};

const scheduleChannelRemoval = (channel: ReturnType<typeof supabase.channel>) => {
  window.setTimeout(() => {
    void supabase.removeChannel(channel);
  }, CHANNEL_CLEANUP_DELAY_MS);
};

const ensureNotificationsChannel = (userId: string) => {
  clearSharedNotificationsCleanup();

  if (sharedNotificationsChannel && sharedNotificationsUserId === userId) {
    return sharedNotificationsChannel;
  }

  if (sharedNotificationsChannel) {
    const staleChannel = sharedNotificationsChannel;
    sharedNotificationsChannel = null;
    sharedNotificationsUserId = null;
    scheduleChannelRemoval(staleChannel);
  }

  sharedNotificationsUserId = userId;
  sharedNotificationsChannel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const notification = payload.new as NotificationItem;
      sharedNotificationListeners.forEach((listener) => listener(notification));
    })
    .subscribe();

  return sharedNotificationsChannel;
};

const subscribeToNotifications = (userId: string, listener: (notification: NotificationItem) => void) => {
  ensureNotificationsChannel(userId);
  sharedNotificationsSubscribers += 1;
  sharedNotificationListeners.add(listener);

  return () => {
    sharedNotificationListeners.delete(listener);
    sharedNotificationsSubscribers = Math.max(0, sharedNotificationsSubscribers - 1);

    if (sharedNotificationsSubscribers > 0 || !sharedNotificationsChannel) {
      return;
    }

    clearSharedNotificationsCleanup();
    sharedNotificationsCleanupTimer = window.setTimeout(() => {
      if (sharedNotificationsSubscribers > 0 || !sharedNotificationsChannel) {
        return;
      }

      const channelToRemove = sharedNotificationsChannel;
      sharedNotificationsChannel = null;
      sharedNotificationsUserId = null;
      sharedNotificationsCleanupTimer = null;
      void supabase.removeChannel(channelToRemove);
    }, CHANNEL_CLEANUP_DELAY_MS);
  };
};

export default function NotificationPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let active = true;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LIMIT);

      if (!active) {
        return;
      }

      setNotifications((data || []) as NotificationItem[]);
    };

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      if (!active) {
        return;
      }

      setNotifications((prev) => [
        notification,
        ...prev.filter((item) => item.id !== notification.id),
      ].slice(0, NOTIFICATION_LIMIT));
    });

    void fetchNotifications();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeLanguage = ((i18n.resolvedLanguage ?? fallbackLanguage).split('-')[0] as keyof typeof languageLocales);
  const locale = languageLocales[activeLanguage] ?? languageLocales.en;

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-4.5 h-4.5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold">{t('notifications.title')}</h4>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">{t('notifications.markAllRead')}</button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('notifications.empty')}</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-border/50 flex items-start gap-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.type === 'success' ? 'bg-success' : n.type === 'warning' ? 'bg-warning' : 'bg-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Intl.DateTimeFormat(locale).format(new Date(n.created_at))}</p>
                    </div>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="shrink-0 p-1 hover:bg-muted rounded">
                        <Check className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
