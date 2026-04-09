import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface TransactedUser {
  user_id: string;
  name: string;
  transaction_id: string;
  crop_type: string;
}

export default function ComplaintDialog() {
  const { user } = useAuth();
  const { t } = useTranslation(['common']);
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

      if (!txs?.length) {
        setTransactedUsers([]);
        return;
      }

      const otherIds = [...new Set(txs.map(tx => tx[otherField] as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', otherIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      const users: TransactedUser[] = txs.map(tx => ({
        user_id: tx[otherField] as string,
        name: profileMap.get(tx[otherField] as string) || t('complaints.unknownUser', { defaultValue: 'Unknown' }),
        transaction_id: tx.id,
        crop_type: tx.crop_type,
      }));

      const seen = new Set<string>();
      setTransactedUsers(
        users.filter(u => {
          if (seen.has(u.transaction_id)) return false;
          seen.add(u.transaction_id);
          return true;
        }),
      );
    };

    void fetchTransactedUsers();
  }, [open, t, user?.id, user?.role]);

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
          title: t('complaints.unavailableTitle', { defaultValue: 'Complaints Unavailable' }),
          description: t('complaints.unavailableDescription', {
            defaultValue: 'The complaints feature is not set up in this Supabase project yet. Run the latest migrations.',
          }),
          variant: 'destructive',
        });
      } else if (error.code === '23505') {
        toast({
          title: t('complaints.duplicateTitle', { defaultValue: 'Duplicate Complaint' }),
          description: t('complaints.duplicateDescription', {
            defaultValue: 'You already filed a complaint for this transaction.',
          }),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: error.message,
          variant: 'destructive',
        });
      }
      setSubmitting(false);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: selected.user_id,
      message: t('complaints.notificationMessage', {
        defaultValue: 'A complaint has been filed against you regarding transaction for {{cropType}}.',
        cropType: selected.crop_type,
      }),
      type: 'warning',
    });

    toast({
      title: t('complaints.filedTitle', { defaultValue: 'Complaint Filed' }),
      description: t('complaints.filedDescription', {
        defaultValue: 'Your complaint has been submitted for review.',
      }),
    });

    setOpen(false);
    setReason('');
    setSelectedUser('');
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-destructive/30 bg-gradient-to-r from-destructive/10 to-warning/10 text-destructive hover:bg-destructive/15 hover:shadow-lg hover:shadow-destructive/15 transition-all"
        >
          <AlertTriangle className="w-4 h-4" /> {t('complaints.raiseButton', { defaultValue: 'Raise Complaint' })}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg border-destructive/30 bg-card/90 backdrop-blur-2xl rounded-2xl p-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-warning/5 to-background opacity-70 pointer-events-none" />

        <DialogHeader>
          <div className="relative z-10 border-b border-destructive/20 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </span>
              {t('complaints.title', { defaultValue: 'Raise Complaint' })}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed">
              {t('complaints.description', {
                defaultValue: 'Select a related transaction and explain the issue for admin review.',
              })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="relative z-10 px-6 py-5 space-y-5">
          <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            {t('complaints.warningBanner', {
              defaultValue: 'Please provide accurate details. False reports may result in account review.',
            })}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-tight">
              {t('complaints.selectTransaction', { defaultValue: 'Select Transaction' })}
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background/70 focus:ring-2 focus:ring-primary/30">
                <SelectValue placeholder={t('complaints.chooseTransaction', { defaultValue: 'Choose a transaction...' })} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 bg-popover/95 backdrop-blur-xl">
                {transactedUsers.map(u => (
                  <SelectItem key={u.transaction_id} value={u.transaction_id} className="rounded-lg py-2.5">
                    {u.name} — {u.crop_type} (#{u.transaction_id.slice(0, 8)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transactedUsers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('complaints.noTransactions', {
                  defaultValue: 'No transactions found to file a complaint against.',
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-tight">
              {t('complaints.reason', { defaultValue: 'Reason' })}
            </label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('complaints.reasonPlaceholder', { defaultValue: 'Describe the issue...' })}
              maxLength={1000}
              className="min-h-32 rounded-xl border-border/60 bg-background/70 focus-visible:ring-2 focus-visible:ring-destructive/30"
            />
            <div className="text-[11px] text-muted-foreground text-right">{reason.length}/1000</div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl border-border/60">
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedUser || !reason.trim() || submitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-destructive to-warning text-white hover:opacity-95 shadow-lg shadow-destructive/20"
            >
              {submitting
                ? t('complaints.submitting', { defaultValue: 'Submitting...' })
                : t('complaints.submit', { defaultValue: 'Submit Complaint' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
