import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CROP_PRICES, TRANSPORT_RATE, calculateDistance,
  CLUSTER_RADIUS_KM, CLUSTER_DISCOUNT
} from '@/data/mockData';
import { Wheat, Send, CheckCircle, Upload, Users, Loader2 } from 'lucide-react';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import ClusterSavings from '@/components/ClusterSavings';
import LocationPicker from '@/components/LocationPicker';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const FarmerListResidue = () => {
  const { user } = useAuth();
  const { t: rawT } = useTranslation(['common', 'farmer']);
  const t = rawT as unknown as (key: string, options?: Record<string, unknown>) => string;
  const [cropType, setCropType] = useState('Paddy');
  const [quantity, setQuantity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [aiTrigger, setAiTrigger] = useState(0);
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);
  const [aiResult, setAiResult] = useState<{ moisture: number; grade: 'A' | 'B' | 'C'; confidence: number } | null>(null);
  const [submittingListing, setSubmittingListing] = useState(false);
  const [currentListingId, setCurrentListingId] = useState<string | null>(null);
  const [industries, setIndustries] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [locationAddress, setLocationAddress] = useState(user?.location?.address || '');
  const [locationLat, setLocationLat] = useState<number | undefined>(user?.location?.lat);
  const [locationLng, setLocationLng] = useState<number | undefined>(user?.location?.lng);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [indRes, listRes] = await Promise.all([
      supabase.from('industry_profiles').select('*'),
      supabase.from('residue_listings').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }),
    ]);
    setIndustries(indRes.data || []);
    setMyListings(listRes.data || []);
    setLoadingData(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pricePerTon = adjustedPrice ?? (CROP_PRICES[cropType] || 1500);
  const qty = parseFloat(quantity) || 0;
  const totalValue = qty * pricePerTon;

  const nearbyIndustries = useMemo(() => {
    const sourceLat = locationLat ?? user?.location?.lat;
    const sourceLng = locationLng ?? user?.location?.lng;

    return industries
      .map(ind => {
        const dist = sourceLat && sourceLng && ind.lat && ind.lng
          ? calculateDistance(sourceLat, sourceLng, Number(ind.lat), Number(ind.lng))
          : 0;
        const baseCost = dist * TRANSPORT_RATE * qty;
        const isCluster = dist <= CLUSTER_RADIUS_KM;
        const transportCost = isCluster ? baseCost * (1 - CLUSTER_DISCOUNT) : baseCost;
        const netProfit = (Number(ind.price_offered_per_ton) * qty) - transportCost;

        return {
          ...ind,
          distance: dist,
          transportCost,
          netProfit,
          isCluster,
          originalCost: baseCost,
          savings: isCluster ? baseCost * CLUSTER_DISCOUNT : 0,
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [industries, locationLat, locationLng, user?.location?.lat, user?.location?.lng, qty]);

  const handleSubmitListing = async () => {
    if (!user?.id || qty <= 0) return;
    setSubmittingListing(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('residue-images').upload(path, imageFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('residue-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const basePrice = CROP_PRICES[cropType] || 1500;
    const { data, error } = await supabase.from('residue_listings').insert({
      farmer_id: user.id,
      crop_type: cropType,
      quantity: qty,
      moisture_level: aiResult?.moisture || null,
      quality_grade: aiResult?.grade || null,
      ai_confidence: aiResult?.confidence || null,
      base_price_per_ton: basePrice,
      adjusted_price_per_ton: pricePerTon,
      total_value: totalValue,
      lat: locationLat || user.location?.lat || null,
      lng: locationLng || user.location?.lng || null,
      address: locationAddress || user.location?.address || null,
      image_url: imageUrl,
      status: 'available',
    }).select().single();

    if (error) {
      toast({ title: t('listing.errorTitle', { ns: 'farmer' }), description: error.message, variant: 'destructive' });
    } else {
      setCurrentListingId(data.id);
      setSubmitted(true);
      toast({ title: t('listing.submittedToastTitle', { ns: 'farmer' }), description: t('listing.submittedToastDescription', { ns: 'farmer', quantity: qty, cropType }) });
    }
    setSubmittingListing(false);
  };

  const handleSendRequest = async (ind: any) => {
    if (!user?.id || !currentListingId) return;

    const { data: existingRequest } = await supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', currentListingId)
      .eq('industry_id', ind.user_id)
      .in('status', ['pending', 'accepted', 'completed'])
      .maybeSingle();

    if (existingRequest) {
      toast({ title: t('listing.requestExistsTitle', { ns: 'farmer' }), description: t('listing.requestExistsDescription', { ns: 'farmer' }) });
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      listing_id: currentListingId,
      farmer_id: user.id,
      industry_id: ind.user_id,
      crop_type: cropType,
      quantity: qty,
      price_per_ton: Number(ind.price_offered_per_ton),
      total_value: Number(ind.price_offered_per_ton) * qty,
      transport_distance: ind.distance,
      transport_cost: ind.transportCost,
      net_profit: ind.netProfit,
      cluster_eligible: ind.isCluster,
      transport_savings: ind.savings,
      carbon_saved: qty * 1.5,
      credit_points: qty * 8,
      status: 'pending',
    });

    if (error) {
      toast({ title: t('listing.errorTitle', { ns: 'farmer' }), description: error.message, variant: 'destructive' });
    } else {
      setSentRequests(prev => [...prev, ind.id]);
      toast({ title: t('listing.requestSentTitle', { ns: 'farmer' }), description: t('listing.requestSentDescription', { ns: 'farmer' }) });
      await supabase.from('notifications').insert({
        user_id: ind.user_id,
        message: t('listing.notificationMessage', { ns: 'farmer', name: user.name || t('roles.farmer', { ns: 'common' }), quantity: qty, cropType }),
        type: 'info',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setAiTrigger(p => p + 1);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setAiTrigger(0);
    setAdjustedPrice(null);
    setAiResult(null);
    setImageFile(null);
    setCurrentListingId(null);
    setCropType('Paddy');
    setQuantity('');
    setSentRequests([]);
  };

  const handleAnalysisComplete = useCallback((res: { moisture: number; grade: 'A' | 'B' | 'C'; confidence: number; adjustedPrice: number; detectedCropType?: string }) => {
    setAdjustedPrice(res.adjustedPrice);
    setAiResult(res);

    if (res.detectedCropType && res.detectedCropType !== cropType) {
      setCropType(res.detectedCropType);
    }
  }, [cropType]);

  const handleLocationChange = useCallback((newLat: number, newLng: number, newAddr: string) => {
    setLocationLat(newLat);
    setLocationLng(newLng);
    setLocationAddress(newAddr);
  }, []);

  if (loadingData) {
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('listing.title', { ns: 'farmer' })}</h2>
          {submitted && (
            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Wheat className="w-4 h-4" /> {t('listing.newListing', { ns: 'farmer' })}
            </button>
          )}
        </div>

        {/* New Listing Form */}
        <div className="bg-card rounded-xl p-6 shadow-card animate-scale-in">
          {!submitted ? (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-medium mb-1 block">{t('listing.uploadLabel', { ns: 'farmer' })}</label>
                <label className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors block">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{imageFile ? imageFile.name : t('listing.uploadPlaceholder', { ns: 'farmer' })}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t('listing.uploadHint', { ns: 'farmer' })}</p>
                </label>
              </div>

              <AIAnalysisPanel
                cropType={cropType}
                trigger={aiTrigger}
                imageFile={imageFile}
                onAnalysisComplete={handleAnalysisComplete}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">{t('listing.cropType', { ns: 'farmer' })}</label>
                  <select value={cropType} onChange={e => { setCropType(e.target.value); setAdjustedPrice(null); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="Paddy">{t('cropTypes.paddy', { ns: 'farmer' })}</option>
                    <option value="Wheat">{t('cropTypes.wheat', { ns: 'farmer' })}</option>
                    <option value="Sugarcane">{t('cropTypes.sugarcane', { ns: 'farmer' })}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">{t('listing.quantity', { ns: 'farmer' })}</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder={t('listing.quantityPlaceholder', { ns: 'farmer' })} />
                </div>
              </div>
              <LocationPicker
                lat={locationLat}
                lng={locationLng}
                address={locationAddress}
                onLocationChange={handleLocationChange}
                compact
              />

              {qty > 0 && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('listing.estimatedBreakdown', { ns: 'farmer' })}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{t('listing.pricePerTon', { ns: 'farmer' })}</span><span className="font-medium">₹{pricePerTon}</span>
                    <span className="text-muted-foreground">{t('listing.totalValue', { ns: 'farmer' })}</span><span className="font-medium text-success">₹{totalValue.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmitListing}
                disabled={submittingListing || qty <= 0}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submittingListing && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('listing.submitListing', { ns: 'farmer' })}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('listing.successTitle', { ns: 'farmer' })}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('listing.successDescription', { ns: 'farmer', quantity: qty, cropType, value: `₹${totalValue.toLocaleString()}` })}</p>
                </div>
              </div>

              <h4 className="font-semibold">{t('listing.nearbyIndustries', { ns: 'farmer' })}</h4>
              <div className="space-y-3">
                {nearbyIndustries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('listing.noIndustries', { ns: 'farmer' })}</p>
                ) : nearbyIndustries.map(ind => (
                  <div key={ind.id} className="bg-muted/50 rounded-lg p-4 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{ind.company_name}</p>
                          {ind.isCluster && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success">
                              <Users className="w-2.5 h-2.5" /> {t('cluster.eligible', { ns: 'farmer' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{ind.industry_type} • {ind.address || t('listing.unknownAddress', { ns: 'farmer' })}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>📍 {t('listing.distance', { ns: 'farmer', distance: ind.distance })}</span>
                          <span>₹{Number(ind.price_offered_per_ton)}/ton</span>
                          <span>🚚 {t('listing.transportCost', { ns: 'farmer', value: `₹${ind.transportCost.toLocaleString()}` })}</span>
                          <span className="text-success font-medium">{t('listing.netProfit', { ns: 'farmer', value: `₹${ind.netProfit.toLocaleString()}` })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(ind)}
                        disabled={sentRequests.includes(ind.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                          sentRequests.includes(ind.id)
                            ? 'bg-success/10 text-success cursor-default'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {sentRequests.includes(ind.id) ? <><CheckCircle className="w-3 h-3" /> {t('listing.sent', { ns: 'farmer' })}</> : <><Send className="w-3 h-3" /> {t('listing.sendRequest', { ns: 'farmer' })}</>}
                      </button>
                    </div>
                    <ClusterSavings isClusterEligible={ind.isCluster} originalCost={ind.originalCost} distance={ind.distance} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Listings */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="font-semibold text-lg mb-4">My Listings ({myListings.length})</h3>
          {myListings.length === 0 ? (
            <div className="text-center py-8">
              <Wheat className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No listings yet. Submit one above to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {myListings.map(l => (
                <div key={l.id} className="border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{l.crop_type} — {Number(l.quantity)} tons</p>
                      <p className="text-xs text-muted-foreground">₹{Number(l.adjusted_price_per_ton)}/ton • Total: ₹{Number(l.total_value).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      l.status === 'available' ? 'bg-success/15 text-success' :
                      l.status === 'pending' ? 'bg-warning/15 text-warning' :
                      l.status === 'completed' ? 'bg-info/15 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>{l.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {l.quality_grade && <span>Grade {l.quality_grade}</span>}
                    {l.moisture_level && <span>💧 {Number(l.moisture_level)}%</span>}
                    {l.ai_confidence && <span>🤖 {Number(l.ai_confidence)}%</span>}
                    <span>{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                  {l.image_url && (
                    <img src={l.image_url} alt="Crop" className="w-full h-24 object-cover rounded-lg mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerListResidue;