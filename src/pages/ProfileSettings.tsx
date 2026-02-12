import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, User } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import { toast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [landSize, setLandSize] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  // Industry fields
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState('Power Plant');
  const [monthlyRequirement, setMonthlyRequirement] = useState('');
  const [priceOfferedPerTon, setPriceOfferedPerTon] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setName(profile.name || '');
        setPhone(profile.phone || '');
        setVillage(profile.village || '');
        setLandSize(profile.land_size ? String(profile.land_size) : '');
        setLat(profile.lat);
        setLng(profile.lng);
        setAddress(profile.address || '');
      }

      if (user.role === 'industry') {
        const { data: indProfile } = await supabase
          .from('industry_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (indProfile) {
          setCompanyName(indProfile.company_name || '');
          setIndustryType(indProfile.industry_type || 'Power Plant');
          setMonthlyRequirement(String(indProfile.monthly_requirement || ''));
          setPriceOfferedPerTon(String(indProfile.price_offered_per_ton || ''));
          if (indProfile.lat) setLat(Number(indProfile.lat));
          if (indProfile.lng) setLng(Number(indProfile.lng));
          if (indProfile.address) setAddress(indProfile.address);
        }
      }

      setLoading(false);
    };
    fetchProfile();
  }, [user?.id, user?.role]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const { error: profileError } = await supabase.from('profiles').update({
      name,
      phone: phone || null,
      village: village || null,
      land_size: landSize ? parseFloat(landSize) : null,
      lat,
      lng,
      address: address || null,
    }).eq('user_id', user.id);

    if (profileError) {
      toast({ title: 'Error', description: profileError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (user.role === 'industry') {
      const { error: indError } = await supabase.from('industry_profiles').update({
        company_name: companyName,
        industry_type: industryType,
        monthly_requirement: parseFloat(monthlyRequirement) || 0,
        price_offered_per_ton: parseFloat(priceOfferedPerTon) || 0,
        lat,
        lng,
        address: address || null,
      }).eq('user_id', user.id);

      if (indError) {
        toast({ title: 'Error', description: indError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    toast({ title: 'Profile Updated!', description: 'Your settings have been saved.' });
    setSaving(false);
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
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role} Account</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-lg mb-2">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Email</label>
              <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="+91 98765 43210" />
            </div>
            {user?.role === 'farmer' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block">Village</label>
                  <input type="text" value={village} onChange={e => setVillage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. Karnal, Haryana" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Land Size (acres)</label>
                  <input type="number" value={landSize} onChange={e => setLandSize(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 5" />
                </div>
              </>
            )}
          </div>

          {user?.role === 'industry' && (
            <>
              <h3 className="font-semibold text-lg mt-6 mb-2">Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Company Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Industry Type</label>
                  <select value={industryType} onChange={e => setIndustryType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option>Power Plant</option>
                    <option>Biofuel</option>
                    <option>Paper Mill</option>
                    <option>Compost Unit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Monthly Requirement (tons)</label>
                  <input type="number" value={monthlyRequirement} onChange={e => setMonthlyRequirement(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Price Offered (₹/ton)</label>
                  <input type="number" value={priceOfferedPerTon} onChange={e => setPriceOfferedPerTon(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 2000" />
                </div>
              </div>
            </>
          )}

          <LocationPicker
            lat={lat || undefined}
            lng={lng || undefined}
            address={address}
            onLocationChange={(newLat, newLng, newAddr) => {
              setLat(newLat);
              setLng(newLng);
              setAddress(newAddr);
            }}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mt-4"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
