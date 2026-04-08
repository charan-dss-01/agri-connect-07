import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Factory, Wheat, BarChart3, Sprout, Recycle, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { fallbackLanguage, languageLocales } from '@/i18n/resources';

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

interface StatData {
  farmers: number;
  industries: number;
  biomass: number;
  co2: number;
}

const Landing = () => {
  const [raw, setRaw] = useState<StatData>({ farmers: 0, industries: 0, biomass: 0, co2: 0 });
  const { t, i18n } = useTranslation(['common', 'landing']);
  const activeLanguage = ((i18n.resolvedLanguage ?? fallbackLanguage).split('-')[0] as keyof typeof languageLocales);
  const locale = languageLocales[activeLanguage] ?? languageLocales.en;

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_public_stats');
    if (!error && data) {
      const stats = typeof data === 'string' ? JSON.parse(data) : data;
      setRaw({
        farmers: Number(stats.farmers) || 0,
        industries: Number(stats.industries) || 0,
        biomass: Number(stats.biomass) || 0,
        co2: Math.round((Number(stats.co2) || 0) / 1000),
      });
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('homepage-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residue_listings' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const farmersAnimated = useCountUp(raw.farmers);
  const industriesAnimated = useCountUp(raw.industries);
  const biomassAnimated = useCountUp(raw.biomass);
  const co2Animated = useCountUp(raw.co2);

  const features = [
    {
      icon: Wheat,
      title: t('features.farmer.title', { ns: 'landing' }),
      desc: t('features.farmer.description', { ns: 'landing' }),
    },
    {
      icon: Factory,
      title: t('features.industry.title', { ns: 'landing' }),
      desc: t('features.industry.description', { ns: 'landing' }),
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title', { ns: 'landing' }),
      desc: t('features.analytics.description', { ns: 'landing' }),
    },
  ];

  const stats = [
    { value: farmersAnimated > 0 ? `${farmersAnimated}+` : '0', label: t('stats.farmersRegistered', { ns: 'landing' }), icon: Sprout },
    { value: industriesAnimated > 0 ? `${industriesAnimated}+` : '0', label: t('stats.industriesConnected', { ns: 'landing' }), icon: Factory },
    { value: biomassAnimated > 0 ? biomassAnimated.toLocaleString(locale) : '0', label: t('stats.tonsBiomassTraded', { ns: 'landing' }), icon: Recycle },
    { value: co2Animated > 0 ? `${co2Animated}` : '0', label: t('stats.tonsCo2Saved', { ns: 'landing' }), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">{t('brand.name', { ns: 'common' })}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('navbar.login', { ns: 'landing' })}
          </Link>
          <Link to="/login?mode=register" className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            {t('navbar.getStarted', { ns: 'landing' })}
          </Link>
        </div>
      </nav>

      <section className="gradient-hero px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5">
            <Sprout className="h-3.5 w-3.5 text-primary-foreground/80" />
            <span className="text-xs font-medium text-primary-foreground/80">{t('hero.badge', { ns: 'landing' })}</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
            {t('hero.titleLineOne', { ns: 'landing' })}
            <span className="block text-accent">{t('hero.titleLineTwo', { ns: 'landing' })}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-foreground/70 md:text-xl">
            {t('hero.description', { ns: 'landing' })}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login?mode=register&role=farmer"
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-elevated transition-all hover:brightness-110"
            >
              {t('hero.farmerCta', { ns: 'landing' })} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?mode=register&role=industry"
              className="flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/20"
            >
              {t('hero.industryCta', { ns: 'landing' })} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-12 px-6 md:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="animate-fade-in rounded-xl bg-card p-5 text-center shadow-card" style={{ animationDelay: `${index * 100}ms` }}>
              <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="tabular-nums text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              <div className="mx-auto mt-2 h-1 w-1 animate-pulse rounded-full bg-success" title={t('stats.live', { ns: 'landing' })} />
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold">{t('features.title', { ns: 'landing' })}</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
            {t('features.description', { ns: 'landing' })}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="animate-fade-in rounded-xl bg-card p-6 shadow-card transition-shadow hover:shadow-elevated" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center md:px-12">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t('brand.name', { ns: 'common' })}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('brand.name', { ns: 'common' })}. {t('footer.caption', { ns: 'landing' })}
        </p>
      </footer>
    </div>
  );
};

export default Landing;
