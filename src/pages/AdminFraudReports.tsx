import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Save, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type FraudReportRow = {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  penalty_points: number | null;
  status: 'pending' | 'verified' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type CreditEventRow = {
  id: string;
  source: string;
  delta: number;
  balance_after: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type UserProfile = {
  user_id: string;
  name: string;
  email: string | null;
  credit_score: number;
  role?: string;
};

type CreditRuleState = {
  reward_mode: 'fixed' | 'quantity_based';
  reward_fixed_points: number;
  reward_per_ton_points: number;
  penalty_default_points: number;
};

const defaultRules: CreditRuleState = {
  reward_mode: 'quantity_based',
  reward_fixed_points: 10,
  reward_per_ton_points: 8,
  penalty_default_points: 20,
};

const statusTone = {
  pending: 'bg-warning/15 text-warning',
  verified: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
} as const;

const AdminFraudReports = () => {
  const { user } = useAuth();
  const { t: tAny } = useTranslation(['admin']);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [reports, setReports] = useState<FraudReportRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [scoreHistory, setScoreHistory] = useState<CreditEventRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [rules, setRules] = useState<CreditRuleState>(defaultRules);

  const fetchHistory = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('credit_score_events')
      .select('id, source, delta, balance_after, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    setScoreHistory((data as CreditEventRow[]) || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [reportsRes, profilesRes, rolesRes, rulesRes] = await Promise.all([
      supabase.from('fraud_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, name, email, credit_score'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('credit_score_rules').select('reward_mode, reward_fixed_points, reward_per_ton_points, penalty_default_points').eq('id', true).single(),
    ]);

    const allProfiles = (profilesRes.data || []) as UserProfile[];
    const allRoles = rolesRes.data || [];
    const profileMap: Record<string, UserProfile> = {};

    allProfiles.forEach((p) => {
      const role = allRoles.find((r) => r.user_id === p.user_id)?.role;
      profileMap[p.user_id] = { ...p, role };
    });

    setReports((reportsRes.data as FraudReportRow[]) || []);
    setProfiles(profileMap);

    if (rulesRes.data) {
      setRules({
        reward_mode: rulesRes.data.reward_mode as 'fixed' | 'quantity_based',
        reward_fixed_points: Number(rulesRes.data.reward_fixed_points),
        reward_per_ton_points: Number(rulesRes.data.reward_per_ton_points),
        penalty_default_points: Number(rulesRes.data.penalty_default_points),
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedUserId) {
      setScoreHistory([]);
      return;
    }

    void fetchHistory(selectedUserId);
  }, [selectedUserId, fetchHistory]);

  const reviewReport = async (reportId: string, status: 'verified' | 'rejected') => {
    const { error } = await supabase
      .from('fraud_reports')
      .update({
        status,
        reviewed_by: user?.id ?? null,
      })
      .eq('id', reportId)
      .eq('status', 'pending');

    if (error) {
      toast({
        title: tAny('fraud.toasts.reviewFailed', { ns: 'admin' }),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: status === 'verified'
        ? tAny('fraud.toasts.reportVerified', { ns: 'admin' })
        : tAny('fraud.toasts.reportRejected', { ns: 'admin' }),
    });

    await fetchAll();

    const updated = reports.find((r) => r.id === reportId);
    if (updated?.reported_user_id) {
      setSelectedUserId(updated.reported_user_id);
      await fetchHistory(updated.reported_user_id);
    }
  };

  const saveRules = async () => {
    setSavingRules(true);
    const { error } = await supabase
      .from('credit_score_rules')
      .upsert({
        id: true,
        reward_mode: rules.reward_mode,
        reward_fixed_points: Math.max(1, Math.round(rules.reward_fixed_points)),
        reward_per_ton_points: Math.max(0, Number(rules.reward_per_ton_points)),
        penalty_default_points: Math.max(1, Math.round(rules.penalty_default_points)),
      });

    setSavingRules(false);

    if (error) {
      toast({
        title: tAny('fraud.toasts.rulesSaveFailed', { ns: 'admin' }),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: tAny('fraud.toasts.rulesSaved', { ns: 'admin' }) });
    await fetchAll();
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchStatus = statusFilter === 'all' || report.status === statusFilter;
      const reporter = profiles[report.reporter_user_id];
      const reported = profiles[report.reported_user_id];
      const q = search.trim().toLowerCase();
      const matchSearch = q.length === 0
        || report.reason.toLowerCase().includes(q)
        || (report.details || '').toLowerCase().includes(q)
        || (reporter?.name || '').toLowerCase().includes(q)
        || (reported?.name || '').toLowerCase().includes(q)
        || (reporter?.email || '').toLowerCase().includes(q)
        || (reported?.email || '').toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [profiles, reports, search, statusFilter]);

  const statusCounts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    verified: reports.filter((r) => r.status === 'verified').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  const selectedProfile = selectedUserId ? profiles[selectedUserId] : undefined;

  const sourceLabel = (source: string) => {
    return tAny(`fraud.scoreHistory.sources.${source}`, {
      ns: 'admin',
      defaultValue: source,
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-bold">{tAny('fraud.title', { ns: 'admin' })}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="w-4 h-4" />
            <span>{tAny('fraud.totalReports', { ns: 'admin', count: reports.length })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: AlertTriangle, label: tAny('fraud.summary.total', { ns: 'admin' }), value: statusCounts.all, color: 'text-primary' },
            { icon: Clock3, label: tAny('fraud.summary.pending', { ns: 'admin' }), value: statusCounts.pending, color: 'text-warning' },
            { icon: CheckCircle2, label: tAny('fraud.summary.verified', { ns: 'admin' }), value: statusCounts.verified, color: 'text-success' },
            { icon: XCircle, label: tAny('fraud.summary.rejected', { ns: 'admin' }), value: statusCounts.rejected, color: 'text-destructive' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 shadow-card">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-semibold">{tAny('fraud.rules.title', { ns: 'admin' })}</h3>
            <button
              onClick={saveRules}
              disabled={savingRules}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {savingRules ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {tAny('fraud.rules.save', { ns: 'admin' })}
            </button>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              {tAny('fraud.rules.rewardMode', { ns: 'admin' })}
              <select
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={rules.reward_mode}
                onChange={(e) => setRules((prev) => ({ ...prev, reward_mode: e.target.value as 'fixed' | 'quantity_based' }))}
              >
                <option value="fixed">{tAny('fraud.rules.fixed', { ns: 'admin' })}</option>
                <option value="quantity_based">{tAny('fraud.rules.quantityBased', { ns: 'admin' })}</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              {tAny('fraud.rules.fixedPoints', { ns: 'admin' })}
              <input
                type="number"
                min={1}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={rules.reward_fixed_points}
                onChange={(e) => setRules((prev) => ({ ...prev, reward_fixed_points: Number(e.target.value) || 1 }))}
              />
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              {tAny('fraud.rules.perTonPoints', { ns: 'admin' })}
              <input
                type="number"
                min={0}
                step="0.1"
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={rules.reward_per_ton_points}
                onChange={(e) => setRules((prev) => ({ ...prev, reward_per_ton_points: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              {tAny('fraud.rules.defaultPenalty', { ns: 'admin' })}
              <input
                type="number"
                min={1}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={rules.penalty_default_points}
                onChange={(e) => setRules((prev) => ({ ...prev, penalty_default_points: Number(e.target.value) || 1 }))}
              />
            </label>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tAny('fraud.searchPlaceholder', { ns: 'admin' })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'verified', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {tAny(`fraud.filters.${status}`, { ns: 'admin' })} ({statusCounts[status]})
                  </button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{tAny('fraud.noMatch', { ns: 'admin' })}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredReports.map((report) => {
                  const reporter = profiles[report.reporter_user_id];
                  const reported = profiles[report.reported_user_id];
                  const selected = selectedUserId === report.reported_user_id;

                  return (
                    <div key={report.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{report.reason}</p>
                          {report.details && <p className="text-xs text-muted-foreground">{report.details}</p>}
                          <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
                            <span>{tAny('fraud.reporter', { ns: 'admin' })}: {reporter?.name || tAny('fraud.unknownUser', { ns: 'admin' })}</span>
                            <span>{tAny('fraud.reported', { ns: 'admin' })}: {reported?.name || tAny('fraud.unknownUser', { ns: 'admin' })}</span>
                            <span>{tAny('fraud.penalty', { ns: 'admin', points: report.penalty_points ?? rules.penalty_default_points })}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusTone[report.status]}`}>
                            {tAny(`fraud.status.${report.status}`, { ns: 'admin' })}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-1">{new Date(report.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedUserId(report.reported_user_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selected ? 'bg-info text-info-foreground' : 'bg-info/10 text-info hover:bg-info/20'
                          }`}
                        >
                          {tAny('fraud.viewScoreHistory', { ns: 'admin' })}
                        </button>

                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => reviewReport(report.id, 'verified')}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20"
                            >
                              {tAny('fraud.actions.verify', { ns: 'admin' })}
                            </button>
                            <button
                              onClick={() => reviewReport(report.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20"
                            >
                              {tAny('fraud.actions.reject', { ns: 'admin' })}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">{tAny('fraud.scoreHistory.title', { ns: 'admin' })}</h3>
              {selectedProfile ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedProfile.name || tAny('fraud.unknownUser', { ns: 'admin' })}</p>
                  <p>{selectedProfile.email || '-'}</p>
                  <p className="text-success mt-1">{tAny('fraud.scoreHistory.currentScore', { ns: 'admin', score: selectedProfile.credit_score })}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{tAny('fraud.scoreHistory.selectHint', { ns: 'admin' })}</p>
              )}
            </div>

            <div className="max-h-[540px] overflow-y-auto divide-y divide-border">
              {selectedProfile && scoreHistory.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground">{tAny('fraud.scoreHistory.empty', { ns: 'admin' })}</div>
              )}
              {scoreHistory.map((event) => (
                <div key={event.id} className="p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{sourceLabel(event.source)}</span>
                    <span className={event.delta >= 0 ? 'text-success' : 'text-destructive'}>
                      {event.delta >= 0 ? '+' : ''}{event.delta}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">{new Date(event.created_at).toLocaleString()}</p>
                  {event.balance_after !== null && (
                    <p className="mt-1 text-info">{tAny('fraud.scoreHistory.balanceAfter', { ns: 'admin', score: event.balance_after })}</p>
                  )}
                  {typeof event.metadata?.reason === 'string' && (
                    <p className="mt-1 text-muted-foreground">{tAny('fraud.scoreHistory.reason', { ns: 'admin', reason: event.metadata.reason as string })}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminFraudReports;



