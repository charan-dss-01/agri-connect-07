import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TransactedUser {
  user_id: string;
  name: string;
  transaction_id: string;
  crop_type: string;
}

export default function ComplaintDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [transactedUsers, setTransactedUsers] = useState<TransactedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    const fetchTransactedUsers = async () => {
      const isFarmer = user.role === 'farmer';
      const myField = isFarmer ? 'farmer_id' : 'industry_id';
      const otherField = isFarmer ? 'industry_id' : 'farmer_id';

      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq(myField, user.id);

      if (!txs?.length) return;

      const otherIds = [...new Set(txs.map(t => t[otherField] as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', otherIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      // Build list with transaction info
      const users: TransactedUser[] = txs.map(tx => ({
        user_id: tx[otherField] as string,
        name: profileMap.get(tx[otherField] as string) || 'Unknown',
        transaction_id: tx.id,
        crop_type: tx.crop_type,
      }));

      // Deduplicate by transaction
      const seen = new Set<string>();
      setTransactedUsers(users.filter(u => {
        if (seen.has(u.transaction_id)) return false;
        seen.add(u.transaction_id);
        return true;
      }));
    };
    fetchTransactedUsers();
  }, [open, user?.id, user?.role]);

  const handleSubmit = async () => {
    if (!selectedUser || !reason.trim() || !user?.id) return;
    const selected = transactedUsers.find(u => u.transaction_id === selectedUser);
    if (!selected) return;

    setSubmitting(true);
    const { error } = await supabase.from('complaints').insert({
      complainant_id: user.id,
      accused_id: selected.user_id,
      transaction_id: selected.transaction_id,
      reason: reason.trim(),
      status: 'pending',
    });

    if (error) {
      if (error.code === 'PGRST205') {
        toast({
          title: 'Complaints Unavailable',
          description: 'The complaints feature is not set up in this Supabase project yet. Run the latest migrations.',
          variant: 'destructive',
        });
      } else if (error.code === '23505') {
        toast({ title: 'Duplicate Complaint', description: 'You already filed a complaint for this transaction.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      // Send notification to accused
      await supabase.from('notifications').insert({
        user_id: selected.user_id,
        message: `A complaint has been filed against you regarding transaction for ${selected.crop_type}.`,
        type: 'warning',
      });
      toast({ title: 'Complaint Filed', description: 'Your complaint has been submitted for review.' });
      setOpen(false);
      setReason('');
      setSelectedUser('');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <AlertTriangle className="w-4 h-4" /> Raise Complaint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Raise Complaint
          </DialogTitle>
          <DialogDescription>
            Select a related transaction and explain the issue for admin review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Select Transaction</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a transaction..." />
              </SelectTrigger>
              <SelectContent>
                {transactedUsers.map(u => (
                  <SelectItem key={u.transaction_id} value={u.transaction_id}>
                    {u.name} — {u.crop_type} (#{u.transaction_id.slice(0, 8)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transactedUsers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No transactions found to file a complaint against.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the issue..."
              maxLength={1000}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || !reason.trim() || submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
