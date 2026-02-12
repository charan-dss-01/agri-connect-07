import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Factory, Wheat, CheckCircle, XCircle, Clock, Calendar, IndianRupee, Loader2, ShoppingCart, MapPin } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { calculateDistance, TRANSPORT_RATE, CLUSTER_RADIUS_KM, CLUSTER_DISCOUNT } from '@/data/mockData';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const IndustryDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({});
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'accept' | 'reject' | 'complete' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'browse'>('requests');
  const [industryProfile, setIndustryProfile] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [txRes, listingsRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('industry_id', user.id).order('created_at', { ascending: false }),
      supabase.from('residue_listings').select('*').eq('status', 'available').order('created_at', { ascending: false }),
      supabase.from('industry_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setTransactions(txRes.data || []);
    setAvailableListings(listingsRes.data || []);
    setIndustryProfile(profileRes.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingRequests = transactions.filter(t => t.status === 'pending');
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const totalBiomass = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0);
  const totalSpent = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_value), 0);

  const doAction = async () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;

    if (type === 'accept') {
      const pickupDate = pickupDates[id] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const { error } = await supabase.from('transactions').update({ status: 'accepted', pickup_date: pickupDate }).eq('id', id);
      if (!error) {
        toast({ title: 'Request Accepted', description: 'Pickup has been scheduled.' });
        const tx = transactions.find(t => t.id === id);
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: `Your sell request has been accepted! Pickup: ${pickupDate}`, type: 'success' });
          if (tx.listing_id) await supabase.from('residue_listings').update({ status: 'pending' }).eq('id', tx.listing_id);
        }
      }
    } else if (type === 'reject') {
      const { error } = await supabase.from('transactions').update({ status: 'rejected' }).eq('id', id);
      if (!error) {
        toast({ title: 'Request Rejected', variant: 'destructive' });
        const tx = transactions.find(t => t.id === id);
        if (tx) await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: 'Your sell request was rejected.', type: 'warning' });
      }
    } else {
      const tx = transactions.find(t => t.id === id);
      const carbonSaved = tx ? Number(tx.quantity) * 1500 : 0;
      const creditPoints = tx ? Number(tx.quantity) * 10 : 0;
      const { error } = await supabase.from('transactions').update({ status: 'completed', carbon_saved: carbonSaved, credit_points: creditPoints }).eq('id', id);
      if (!error) {
        toast({ title: 'Transaction Completed!', description: 'Biomass has been received.' });
        if (tx) {
          await supabase.from('notifications').insert({ user_id: tx.farmer_id, message: `Transaction completed! ${Number(tx.quantity)}t biomass received. Carbon credits: ${creditPoints}`, type: 'success' });
          if (tx.listing_id) await supabase.from('residue_listings').update({ status: 'completed' }).eq('id', tx.listing_id);
        }
      }
    }
    setConfirmAction(null);
    fetchData();
  };

  const handleBuyListing = async (listing: any) => {
    if (!user?.id || !industryProfile) return;

    const dist = (industryProfile.lat && industryProfile.lng && listing.lat && listing.lng)
      ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(listing.lat), Number(listing.lng))
      : Math.floor(Math.random() * 50 + 10);

    const qty = Number(listing.quantity);
    const baseCost = dist * TRANSPORT_RATE * qty;
    const isCluster = dist <= CLUSTER_RADIUS_KM;
    const transportCost = isCluster ? baseCost * (1 - CLUSTER_DISCOUNT) : baseCost;
    const pricePerTon = Number(industryProfile.price_offered_per_ton) || Number(listing.adjusted_price_per_ton);
    const totalValue = pricePerTon * qty;
    const netProfit = totalValue - transportCost;
    const carbonSaved = qty * 1.5;
    const creditPoints = qty * 8;

    const { error } = await supabase.from('transactions').insert({
      listing_id: listing.id,
      farmer_id: listing.farmer_id,
      industry_id: user.id,
      crop_type: listing.crop_type,
      quantity: qty,
      price_per_ton: pricePerTon,
      total_value: totalValue,
      transport_distance: dist,
      transport_cost: transportCost,
      net_profit: netProfit,
      cluster_eligible: isCluster,
      transport_savings: isCluster ? baseCost * CLUSTER_DISCOUNT : 0,
      carbon_saved: carbonSaved,
      credit_points: creditPoints,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Purchase Request Sent!', description: `Request sent for ${qty}t of ${listing.crop_type}` });
      await supabase.from('notifications').insert({
        user_id: listing.farmer_id,
        message: `${user.companyName || 'An industry'} wants to buy ${qty}t of ${listing.crop_type}!`,
        type: 'success',
      });
      fetchData();
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Industry Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Pending Requests', value: pendingRequests.length.toString(), color: 'text-warning' },
            { icon: CheckCircle, label: 'Completed', value: completedCount.toString(), color: 'text-success' },
            { icon: Wheat, label: 'Biomass Procured', value: `${totalBiomass}t`, color: 'text-primary' },
            { icon: IndianRupee, label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, color: 'text-info' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
          >
            My Requests ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'browse' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
          >
            <span className="flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Browse Listings ({availableListings.length})</span>
          </button>
        </div>

        {/* Browse Available Listings */}
        {activeTab === 'browse' && (
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="font-semibold text-lg mb-4">Available Crop Residue Listings</h3>
            {availableListings.length === 0 ? (
              <div className="text-center py-12">
                <Wheat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No available listings at this time. Check back later!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableListings.map(l => {
                  const dist = (industryProfile?.lat && industryProfile?.lng && l.lat && l.lng)
                    ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(l.lat), Number(l.lng))
                    : null;
                  return (
                    <div key={l.id} className="border border-border rounded-lg p-4 hover:shadow-card transition-shadow animate-fade-in">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{l.crop_type} — {Number(l.quantity)} tons</p>
                          <p className="text-xs text-muted-foreground">₹{Number(l.adjusted_price_per_ton)}/ton • Total: ₹{Number(l.total_value).toLocaleString()}</p>
                        </div>
                        {l.quality_grade && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            l.quality_grade === 'A' ? 'bg-success/15 text-success' :
                            l.quality_grade === 'B' ? 'bg-warning/15 text-warning' :
                            'bg-destructive/15 text-destructive'
                          }`}>Grade {l.quality_grade}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        {l.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.address}</span>}
                        {dist !== null && <span>📍 {dist} km away</span>}
                        {l.moisture_level && <span>💧 {Number(l.moisture_level)}% moisture</span>}
                        {l.ai_confidence && <span>🤖 {Number(l.ai_confidence)}% AI conf.</span>}
                      </div>
                      {l.image_url && (
                        <img src={l.image_url} alt="Crop residue" className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <button
                        onClick={() => handleBuyListing(l)}
                        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Send Purchase Request
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Incoming Requests */}
        {activeTab === 'requests' && (
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="font-semibold text-lg mb-4">Incoming Requests</h3>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Factory className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No incoming requests at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map(t => (
                  <div key={t.id} className="border border-border rounded-lg p-4 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{t.crop_type} — {Number(t.quantity)} tons</p>
                          <StatusBadge status={t.status} />
                          {t.cluster_eligible && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">Cluster</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ₹{Number(t.price_per_ton)}/ton • {Number(t.transport_distance || 0)} km away
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total: ₹{Number(t.total_value).toLocaleString()} • Transport: ₹{Number(t.transport_cost || 0).toLocaleString()}
                          {Number(t.transport_savings) > 0 && <span className="text-success"> (saved ₹{Number(t.transport_savings).toLocaleString()})</span>}
                        </p>
                        {t.pickup_date && (
                          <p className="text-xs text-info mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Pickup: {t.pickup_date}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {t.status === 'pending' && (
                          <>
                            <input
                              type="date"
                              value={pickupDates[t.id] || ''}
                              onChange={e => setPickupDates(p => ({ ...p, [t.id]: e.target.value }))}
                              className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs"
                            />
                            <button onClick={() => setConfirmAction({ id: t.id, type: 'accept' })} className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Accept
                            </button>
                            <button onClick={() => setConfirmAction({ id: t.id, type: 'reject' })} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        {t.status === 'accepted' && (
                          <button onClick={() => setConfirmAction({ id: t.id, type: 'complete' })} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>

                    <button onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)} className="text-[10px] text-primary mt-2 hover:underline">
                      {expandedTx === t.id ? 'Hide' : 'Show'} Timeline
                    </button>
                    {expandedTx === t.id && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <TransactionTimeline transaction={{
                          id: t.id, farmerId: t.farmer_id, farmerName: '', industryId: t.industry_id, industryName: '',
                          cropType: t.crop_type, quantity: Number(t.quantity), pricePerTon: Number(t.price_per_ton),
                          totalValue: Number(t.total_value), transportCost: Number(t.transport_cost || 0),
                          netProfit: Number(t.net_profit || 0), distance: Number(t.transport_distance || 0),
                          status: t.status, createdAt: t.created_at, pickupDate: t.pickup_date,
                          clusterEligible: t.cluster_eligible, transportSavings: Number(t.transport_savings || 0),
                        }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'accept' ? 'Accept Request?' : confirmAction?.type === 'reject' ? 'Reject Request?' : 'Mark Completed?'}
        message={confirmAction?.type === 'accept' ? 'This will schedule a pickup for this request.' : confirmAction?.type === 'reject' ? 'This action cannot be undone.' : 'Confirm that biomass has been received.'}
        confirmLabel={confirmAction?.type === 'reject' ? 'Reject' : 'Confirm'}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'success'}
        onConfirm={doAction}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  );
};

export default IndustryDashboard;
