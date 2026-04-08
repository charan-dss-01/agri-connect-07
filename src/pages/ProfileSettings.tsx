import { useState, useEffect } from 'react';
import { Save, Loader2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import LocationPicker from '@/components/LocationPicker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState('Power Plant');
  const [monthlyRequirement, setMonthlyRequirement] = useState('');
  const [priceOfferedPerTon, setPriceOfferedPerTon] = useState('');
  const { t } = useTranslation(['common', 'settings']);

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

    void fetchProfile();
  }, [user?.id, user?.role]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name,
        phone: phone || null,
        village: village || null,
        land_size: landSize ? parseFloat(landSize) : null,
        lat,
        lng,
        address: address || null,
      })
      .eq('user_id', user.id);

    if (profileError) {
      toast({ title: t('toasts.errorTitle', { ns: 'settings' }), description: profileError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (user.role === 'industry') {
      const { error: indError } = await supabase
        .from('industry_profiles')
        .update({
          company_name: companyName,
          industry_type: industryType,
          monthly_requirement: parseFloat(monthlyRequirement) || 0,
          price_offered_per_ton: parseFloat(priceOfferedPerTon) || 0,
          lat,
          lng,
          address: address || null,
        })
        .eq('user_id', user.id);

      if (indError) {
        toast({ title: t('toasts.errorTitle', { ns: 'settings' }), description: indError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    toast({
      title: t('toasts.updatedTitle', { ns: 'settings' }),
      description: t('toasts.updatedDescription', { ns: 'settings' }),
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('title', { ns: 'settings' })}</h2>
            <p className="text-sm capitalize text-muted-foreground">
              {t('accountLabel', {
                ns: 'settings',
                role: user?.role ? t(`roles.${user.role}`, { ns: 'common' }) : '',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl bg-card p-6 shadow-card">
          <h3 className="mb-2 text-lg font-semibold">{t('personalInformation', { ns: 'settings' })}</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">{t('fields.fullName', { ns: 'settings' })}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{t('fields.email', { ns: 'settings' })}</label>
              <input type="email" value={user?.email || ''} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{t('fields.phone', { ns: 'settings' })}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder={t('fields.phonePlaceholder', { ns: 'settings' })}
              />
            </div>
            {user?.role === 'farmer' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.village', { ns: 'settings' })}</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('fields.villagePlaceholder', { ns: 'settings' })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.landSize', { ns: 'settings' })}</label>
                  <input
                    type="number"
                    value={landSize}
                    onChange={(e) => setLandSize(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('fields.landSizePlaceholder', { ns: 'settings' })}
                  />
                </div>
              </>
            )}
          </div>

          {user?.role === 'industry' && (
            <>
              <h3 className="mb-2 mt-6 text-lg font-semibold">{t('companyDetails', { ns: 'settings' })}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.companyName', { ns: 'settings' })}</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.industryType', { ns: 'settings' })}</label>
                  <select value={industryType} onChange={(e) => setIndustryType(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="Power Plant">{t('industryTypes.powerPlant', { ns: 'settings' })}</option>
                    <option value="Biofuel">{t('industryTypes.biofuel', { ns: 'settings' })}</option>
                    <option value="Paper Mill">{t('industryTypes.paperMill', { ns: 'settings' })}</option>
                    <option value="Compost Unit">{t('industryTypes.compostUnit', { ns: 'settings' })}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.monthlyRequirement', { ns: 'settings' })}</label>
                  <input
                    type="number"
                    value={monthlyRequirement}
                    onChange={(e) => setMonthlyRequirement(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('fields.monthlyRequirementPlaceholder', { ns: 'settings' })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{t('fields.priceOfferedPerTon', { ns: 'settings' })}</label>
                  <input
                    type="number"
                    value={priceOfferedPerTon}
                    onChange={(e) => setPriceOfferedPerTon(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('fields.priceOfferedPerTonPlaceholder', { ns: 'settings' })}
                  />
                </div>
              </div>
            </>
          )}

          <LocationPicker
            lat={lat || undefined}
            lng={lng || undefined}
            address={address}
            onLocationChange={(newLat, newLng, newAddress) => {
              setLat(newLat);
              setLng(newLng);
              setAddress(newAddress);
            }}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('actions.saveChanges', { ns: 'common' })}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
