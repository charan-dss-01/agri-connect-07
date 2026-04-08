import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wheat, Loader2, ShoppingCart, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { calculateDistance, TRANSPORT_RATE, CLUSTER_RADIUS_KM, CLUSTER_DISCOUNT } from '@/data/mockData';
import { useTranslation } from 'react-i18next';

const IndustryBrowse = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['common', 'industry']);
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [industryProfile, setIndustryProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [listingsRes, profileRes] = await Promise.all([
      supabase.from('residue_listings').select('*').eq('status', 'available').order('created_at', { ascending: false }),
      supabase.from('industry_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setAvailableListings(listingsRes.data || []);
    setIndustryProfile(profileRes.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBuyListing = async (listing: any) => {
    if (!user?.id || !industryProfile) {
      toast({ title: t('browse.profileMissingTitle', { ns: 'industry' }), description: t('browse.profileMissingDescription', { ns: 'industry' }), variant: 'destructive' });
      return;
    }

    const { data: existingRequest } = await supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('industry_id', user.id)
      .in('status', ['pending', 'accepted', 'completed'])
      .maybeSingle();

    if (existingRequest) {
      toast({ title: t('browse.requestExistsTitle', { ns: 'industry' }), description: t('browse.requestExistsDescription', { ns: 'industry' }) });
      return;
    }

    const dist = (industryProfile.lat && industryProfile.lng && listing.lat && listing.lng)
      ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(listing.lat), Number(listing.lng))
      : 0;

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
      toast({ title: t('browse.errorTitle', { ns: 'industry' }), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('browse.requestSentTitle', { ns: 'industry' }), description: t('browse.requestSentDescription', { ns: 'industry', quantity: qty, cropType: listing.crop_type }) });
      await supabase.from('notifications').insert({
        user_id: listing.farmer_id,
        message: t('browse.notificationMessage', { ns: 'industry', company: user.companyName || t('roles.industry', { ns: 'common' }), quantity: qty, cropType: listing.crop_type }),
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
        <h2 className="text-2xl font-bold">{t('browse.title', { ns: 'industry' })}</h2>

        {availableListings.length === 0 ? (
          <div className="bg-card rounded-xl p-12 shadow-card text-center">
            <Wheat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('browse.empty', { ns: 'industry' })}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {availableListings.map(l => {
              const dist = (industryProfile?.lat && industryProfile?.lng && l.lat && l.lng)
                ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(l.lat), Number(l.lng))
                : null;
              return (
                <div key={l.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-card transition-shadow animate-fade-in">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{l.crop_type} — {Number(l.quantity)} tons</p>
                      <p className="text-xs text-muted-foreground">₹{Number(l.adjusted_price_per_ton)}/ton • {t('browse.total', { ns: 'industry', value: `₹${Number(l.total_value).toLocaleString()}` })}</p>
                    </div>
                    {l.quality_grade && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        l.quality_grade === 'A' ? 'bg-success/15 text-success' :
                        l.quality_grade === 'B' ? 'bg-warning/15 text-warning' :
                        'bg-destructive/15 text-destructive'
                      }`}>{t('browse.grade', { ns: 'industry', grade: l.quality_grade })}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {l.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.address}</span>}
                    {dist !== null && <span>📍 {t('browse.distanceAway', { ns: 'industry', distance: dist })}</span>}
                    {l.moisture_level && <span>💧 {t('browse.moisture', { ns: 'industry', value: Number(l.moisture_level) })}</span>}
                    {l.ai_confidence && <span>🤖 {t('browse.aiConfidence', { ns: 'industry', value: Number(l.ai_confidence) })}</span>}
                  </div>
                  {l.image_url && (
                    <img src={l.image_url} alt={t('browse.cropResidueAlt', { ns: 'industry' })} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <button
                    onClick={() => handleBuyListing(l)}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> {t('browse.sendRequest', { ns: 'industry' })}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default IndustryBrowse;
