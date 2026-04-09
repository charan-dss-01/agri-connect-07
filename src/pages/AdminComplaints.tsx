import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ShieldAlert, Loader2, MinusCircle, Ban, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Complaint {
  id: string;
  complainant_id: string;
  accused_id: string;
  transaction_id: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  points_deducted: number;
  created_at: string;
  complainant_name?: string;
  accused_name?: string;
  transaction?: any;
}

const DEDUCTION_OPTIONS = [
  { label: 'Warning (no deduction)', points: 0, resolution: 'warning' },
  { label: 'Minor Issue (-100 pts)', points: 100, resolution: 'minor_deduction' },
  { label: 'Medium Issue (-500 pts)', points: 500, resolution: 'medium_deduction' },
  { label: 'Fraud (-1000 pts)', points: 1000, resolution: 'fraud_deduction' },
];

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState<Complaint | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchComplaints = async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error?.code === 'PGRST205') {
      toast({
        title: 'Complaints Unavailable',
        description: 'Run the latest Supabase migrations to create the complaints table.',
        variant: 'destructive',
      });
      setComplaints([]);
      setLoading(false);
      return;
    }

    if (!data) { setLoading(false); return; }

    // Resolve names
    const allIds = [...new Set(data.flatMap(c => [c.complainant_id, c.accused_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', allIds);

    const nameMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

    // Get transactions
    const txIds = data.filter(c => c.transaction_id).map(c => c.transaction_id!);
    const { data: txs } = txIds.length
      ? await supabase.from('transactions').select('*').in('id', txIds)
      : { data: [] };
    const txMap = new Map((txs || []).map(t => [t.id, t]));

    setComplaints(data.map(c => ({
      ...c,
      points_deducted: Number(c.points_deducted) || 0,
      complainant_name: nameMap.get(c.complainant_id) || 'Unknown',
      accused_name: nameMap.get(c.accused_id) || 'Unknown',
      transaction: c.transaction_id ? txMap.get(c.transaction_id) : null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchComplaints(); }, []);

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);

  const handleAction = async (complaint: Complaint, option: typeof DEDUCTION_OPTIONS[0]) => {
    setProcessing(true);

    // Update complaint status
    await supabase.from('complaints').update({
      status: 'resolved',
      resolution: option.resolution,
      points_deducted: option.points,
    }).eq('id', complaint.id);

    // Deduct points if applicable
    //if (option.points  0) {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', complaint.accused_id)
        .maybeSingle();

      const currentPoints = Number(stats?.total_points) || 0;
      const newPoints = Math.max(0, currentPoints - option.points);

      await supabase.from('user_stats').upsert({
        user_id: complaint.accused_id,
        total_points: newPoints,
      }, { onConflict: 'user_id' });
    //}

    // Send notification to accused
    await supabase.from('notifications').insert({
      user_id: complaint.accused_id,
      message: option.points > 0
        ? `Admin action: ${option.points} points deducted due to complaint resolution.`
        : `Admin has reviewed a complaint against you and issued a warning.`,
      type: 'warning',
    });

    // Notify complainant
    await supabase.from('notifications').insert({
      user_id: complaint.complainant_id,
      message: `Your complaint has been resolved by the admin.`,
      type: 'info',
    });

    toast({ title: 'Action Taken', description: `Complaint resolved: ${option.label}` });
    setActionDialog(null);
    setProcessing(false);
    fetchComplaints();
  };

  const handleBlock = async (complaint: Complaint) => {
    setProcessing(true);
    await supabase.from('profiles').update({ approved: false }).eq('user_id', complaint.accused_id);
    await supabase.from('complaints').update({ status: 'resolved', resolution: 'blocked' }).eq('id', complaint.id);
    await supabase.from('notifications').insert({
      user_id: complaint.accused_id,
      message: 'Your account has been blocked due to a complaint.',
      type: 'warning',
    });
    toast({ title: 'User Blocked', description: `${complaint.accused_name} has been blocked.` });
    setActionDialog(null);
    setProcessing(false);
    fetchComplaints();
  };

  const handleReject = async (complaint: Complaint) => {
    setProcessing(true);
    await supabase.from('complaints').update({ status: 'rejected', resolution: 'rejected' }).eq('id', complaint.id);
    await supabase.from('notifications').insert({
      user_id: complaint.complainant_id,
      message: 'Your complaint has been reviewed and rejected.',
      type: 'info',
    });
    toast({ title: 'Complaint Rejected' });
    setActionDialog(null);
    setProcessing(false);
    fetchComplaints();
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-destructive" /> Complaint Management
          </h2>
          <div className="flex gap-2">
            {['all', 'pending', 'resolved', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${complaints.filter(c => c.status === f).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <AlertTriangle className="w-5 h-5 text-warning mb-2" />
            <p className="text-xl font-bold">{complaints.filter(c => c.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <AlertCircle className="w-5 h-5 text-success mb-2" />
            <p className="text-xl font-bold">{complaints.filter(c => c.status === 'resolved').length}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <MinusCircle className="w-5 h-5 text-destructive mb-2" />
            <p className="text-xl font-bold">{complaints.filter(c => c.status === 'rejected').length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Complaints list */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card text-center">
            <p className="text-muted-foreground">No complaints found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-card rounded-xl p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={c.status === 'pending' ? 'default' : c.status === 'resolved' ? 'secondary' : 'destructive'}>
                        {c.status}
                      </Badge>
                      {c.resolution && (
                        <Badge variant="outline" className="text-xs">{c.resolution}</Badge>
                      )}
                      {c.points_deducted > 0 && (
                        <span className="text-xs text-destructive font-medium">-{c.points_deducted} pts</span>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{c.complainant_name}</span>
                      <span className="text-muted-foreground"> filed against </span>
                      <span className="font-medium">{c.accused_name}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{c.reason}</p>
                    {c.transaction && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Transaction: {c.transaction.crop_type} • {Number(c.transaction.quantity)}t • ₹{Number(c.transaction.total_value).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {c.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => setActionDialog(c)}>
                      Take Action
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={() => !processing && setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take Action on Complaint</DialogTitle>
              <DialogDescription>
                Resolve, reject, or penalize a complaint after reviewing the report details.
              </DialogDescription>
            </DialogHeader>
            {actionDialog && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p><strong>By:</strong> {actionDialog.complainant_name}</p>
                  <p><strong>Against:</strong> {actionDialog.accused_name}</p>
                  <p className="mt-1 text-muted-foreground">{actionDialog.reason}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose Action:</p>
                  {DEDUCTION_OPTIONS.map(opt => (
                    <Button
                      key={opt.resolution}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAction(actionDialog, opt)}
                      disabled={processing}
                    >
                      <MinusCircle className="w-4 h-4 mr-2" /> {opt.label}
                    </Button>
                  ))}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleBlock(actionDialog)}
                    disabled={processing}
                  >
                    <Ban className="w-4 h-4 mr-2" /> Block User
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleReject(actionDialog)}
                    disabled={processing}
                  >
                    Reject Complaint
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
