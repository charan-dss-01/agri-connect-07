import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, ShieldCheck, ShieldX, Loader2, Mail, Phone, MapPin, Wheat } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface MergedUser {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  village: string | null;
  land_size: number | null;
  credit_score: number;
  approved: boolean;
  created_at: string;
  role: string;
  companyName?: string;
  industryType?: string;
}

const AdminUsers = () => {
  const { t } = useTranslation(['common', 'admin']);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchUsers = async () => {
    const [profilesRes, rolesRes, indRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('industry_profiles').select('*'),
    ]);

    const allProfiles = profilesRes.data || [];
    const allRoles = rolesRes.data || [];
    const allInd = indRes.data || [];

    const merged: MergedUser[] = allProfiles.map(p => {
      const role = allRoles.find(r => r.user_id === p.user_id);
      const ind = allInd.find(i => i.user_id === p.user_id);
      return {
        ...p,
        role: role?.role || 'farmer',
        companyName: ind?.company_name,
        industryType: ind?.industry_type || undefined,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleApproval = async (userId: string, currentApproved: boolean) => {
    const { error } = await supabase.from('profiles').update({ approved: !currentApproved }).eq('user_id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, approved: !currentApproved } : u));
      toast({ title: currentApproved ? t('toasts.userBlocked', { ns: 'admin' }) : t('toasts.userApproved', { ns: 'admin' }) });
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.village || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && u.approved) ||
      (statusFilter === 'blocked' && !u.approved);
    return matchSearch && matchRole && matchStatus;
  });

  const roleCounts = {
    all: users.length,
    farmer: users.filter(u => u.role === 'farmer').length,
    industry: users.filter(u => u.role === 'industry').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('users.title', { ns: 'admin' })}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t('users.totalUsers', { ns: 'admin', count: users.length })}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('users.summary.totalUsers', { ns: 'admin' }), value: users.length, color: 'text-primary' },
            { label: t('users.summary.farmers', { ns: 'admin' }), value: roleCounts.farmer, color: 'text-success' },
            { label: t('users.summary.industries', { ns: 'admin' }), value: roleCounts.industry, color: 'text-info' },
            { label: t('users.summary.blocked', { ns: 'admin' }), value: users.filter(u => !u.approved).length, color: 'text-destructive' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('users.searchPlaceholder', { ns: 'admin' })}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'farmer', 'industry', 'admin'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t(`users.filters.${r}`, { ns: 'admin' })} ({roleCounts[r]})
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'blocked'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t(`users.filters.${s}`, { ns: 'admin' })}
              </button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('users.noMatch', { ns: 'admin' })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.user', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.contact', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.role', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.details', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.status', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.joined', { ns: 'admin' })}</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{t('dashboard.tableHeaders.action', { ns: 'admin' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.name || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name || t('users.unnamed', { ns: 'admin' })}</p>
                            {u.companyName && <p className="text-xs text-muted-foreground">{u.companyName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {u.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {u.email}
                            </p>
                          )}
                          {u.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {u.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'farmer' ? 'bg-success/15 text-success' :
                          u.role === 'industry' ? 'bg-info/15 text-info' :
                          'bg-warning/15 text-warning'
                        }`}>
                          {u.role === 'farmer' ? '🌾' : u.role === 'industry' ? '🏭' : '🔧'} {u.role === 'farmer' ? t('roles.farmer', { ns: 'common' }) : u.role === 'industry' ? t('roles.industry', { ns: 'common' }) : t('roles.admin', { ns: 'common' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.role === 'farmer' && (
                          <div className="space-y-0.5">
                            {u.village && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {u.village}</p>}
                            {u.land_size && <p className="flex items-center gap-1"><Wheat className="w-3 h-3" /> {t('users.acres', { ns: 'admin', value: Number(u.land_size) })}</p>}
                          </div>
                        )}
                        {u.role === 'industry' && u.industryType && (
                          <p>{u.industryType}</p>
                        )}
                        {u.role === 'admin' && <p>{t('users.administrator', { ns: 'admin' })}</p>}
                        <p className="text-success">{t('dashboard.credits', { ns: 'admin', count: Number(u.credit_score || 0) })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.approved ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                        }`}>
                          {u.approved ? t('users.active', { ns: 'admin' }) : t('users.blocked', { ns: 'admin' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => toggleApproval(u.user_id, u.approved)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              u.approved
                                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                : 'bg-success/10 text-success hover:bg-success/20'
                            }`}
                          >
                            {u.approved ? <><ShieldX className="w-3 h-3" /> {t('users.block', { ns: 'admin' })}</> : <><ShieldCheck className="w-3 h-3" /> {t('users.approve', { ns: 'admin' })}</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
