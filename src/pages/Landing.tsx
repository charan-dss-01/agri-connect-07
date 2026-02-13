import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Factory, Wheat, BarChart3, Sprout, Recycle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const features = [
  { icon: Wheat, title: 'Farmers', desc: 'List crop residue and connect with buyers instantly' },
  { icon: Factory, title: 'Industries', desc: 'Source sustainable biomass at competitive prices' },
  { icon: BarChart3, title: 'Analytics', desc: 'Track impact with real-time pollution reduction data' },
];

const Landing = () => {
  const [stats, setStats] = useState([
    { value: '0', label: 'Farmers Registered', icon: Sprout },
    { value: '0', label: 'Industries Connected', icon: Factory },
    { value: '0', label: 'Tons Biomass Traded', icon: Recycle },
    { value: '0', label: 'Tons CO₂ Saved', icon: TrendingUp },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      const [txRes, listingsRes] = await Promise.all([
        supabase.from('transactions').select('quantity, carbon_saved, status'),
        supabase.from('residue_listings').select('farmer_id'),
      ]);

      const allTx = txRes.data || [];
      const completedTx = allTx.filter(t => t.status === 'completed');
      const totalBiomass = completedTx.reduce((s, t) => s + Number(t.quantity), 0);
      const totalCO2 = completedTx.reduce((s, t) => s + Number(t.carbon_saved || 0), 0);
      const uniqueFarmers = new Set((listingsRes.data || []).map(l => l.farmer_id)).size;

      setStats([
        { value: uniqueFarmers > 0 ? `${uniqueFarmers}+` : '0', label: 'Farmers Registered', icon: Sprout },
        { value: '0+', label: 'Industries Connected', icon: Factory },
        { value: totalBiomass > 0 ? totalBiomass.toLocaleString() : '0', label: 'Tons Biomass Traded', icon: Recycle },
        { value: totalCO2 > 0 ? (totalCO2 / 1000).toFixed(1) : '0', label: 'Tons CO₂ Saved', icon: TrendingUp },
      ]);
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">AgriConnect</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Login
          </Link>
          <Link to="/login?mode=register" className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero px-6 md:px-12 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
            <Sprout className="w-3.5 h-3.5 text-primary-foreground/80" />
            <span className="text-xs font-medium text-primary-foreground/80">AI-Powered Crop Residue Exchange</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Turn Stubble Into
            <span className="block text-accent">Sustainable Revenue</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10">
            Connect farmers with industries that need biomass. Reduce pollution, increase income, and build a cleaner future — all on one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login?mode=register&role=farmer"
              className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold px-8 py-3.5 rounded-xl hover:brightness-110 transition-all shadow-elevated text-sm"
            >
              I'm a Farmer <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login?mode=register&role=industry"
              className="flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-foreground/20 transition-all text-sm"
            >
              I'm an Industry <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 md:px-12 -mt-12 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-5 shadow-card text-center animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            A simple three-step process to convert agricultural waste into valuable resources.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">AgriConnect</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 AgriConnect. Building a sustainable agricultural future.</p>
      </footer>
    </div>
  );
};

export default Landing;
