import { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { sampleNotifications } from '@/data/mockData';

export default function NotificationPanel() {
  const { user } = useAuth();
  const { demoMode, liveNotifications } = useDemo();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const allNotifications = demoMode ? liveNotifications : sampleNotifications;
  const myNotifications = allNotifications.filter(n => n.userId === user?.id);
  const unreadCount = myNotifications.filter(n => !n.read && !readIds.has(n.id)).length;

  const markRead = (id: string) => setReadIds(p => new Set(p).add(id));
  const markAllRead = () => setReadIds(new Set(myNotifications.map(n => n.id)));

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
              <h4 className="text-sm font-semibold">Notifications</h4>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {myNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                myNotifications.map(n => {
                  const isRead = n.read || readIds.has(n.id);
                  return (
                    <div key={n.id} className={`px-4 py-3 border-b border-border/50 flex items-start gap-3 ${!isRead ? 'bg-primary/5' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'success' ? 'bg-success' : n.type === 'warning' ? 'bg-warning' : 'bg-info'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.createdAt}</p>
                      </div>
                      {!isRead && (
                        <button onClick={() => markRead(n.id)} className="shrink-0 p-1 hover:bg-muted rounded">
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
