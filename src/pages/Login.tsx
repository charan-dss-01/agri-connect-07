import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Leaf, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const [role, setRole] = useState<UserRole>((searchParams.get('role') as UserRole) || 'farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        const res = await register({ name, email, password, role, phone, village, companyName });
        if (res.error) {
          toast({ title: 'Registration failed', description: res.error, variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        toast({ title: 'Account created!', description: 'You are now logged in.' });
      } else {
        const res = await login(email, password);
        if (res.error) {
          toast({ title: 'Login failed', description: res.error, variant: 'destructive' });
          setSubmitting(false);
          return;
        }
      }
      // Small delay to let auth state propagate, then redirect based on actual user role
      setTimeout(async () => {
        const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await (await import('@/integrations/supabase/client')).supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          const actualRole = roleData?.role || role;
          navigate(actualRole === 'farmer' ? '/farmer' : actualRole === 'industry' ? '/industry' : '/admin');
        } else {
          navigate(role === 'farmer' ? '/farmer' : role === 'industry' ? '/industry' : '/admin');
        }
        setSubmitting(false);
      }, 500);
    } catch {
      setSubmitting(false);
    }
  };

  const roles: { value: UserRole; label: string }[] = [
    { value: 'farmer', label: '🌾 Farmer' },
    { value: 'industry', label: '🏭 Industry' },
    { value: 'admin', label: '🔧 Admin' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-primary-foreground">AgriConnect</span>
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {isRegister ? 'Join the network' : 'Welcome back'}
          </h2>
          <p className="text-primary-foreground/70">
            Connect with the largest crop residue exchange network. Reduce pollution, increase revenue.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">AgriConnect</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">{isRegister ? 'Create Account' : 'Sign In'}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isRegister ? 'Get started with your account' : 'Enter your credentials to continue'}
          </p>

          {/* Role selector */}
          {isRegister && (
            <div className="flex gap-2 mb-6">
              {roles.filter(r => r.value !== 'admin').map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    role === r.value
                      ? 'bg-primary text-primary-foreground shadow-card'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+91 98765 43210"
                  />
                </div>
                {role === 'farmer' && (
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Village</label>
                    <input
                      type="text"
                      value={village}
                      onChange={e => setVillage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Karnal, Haryana"
                    />
                  </div>
                )}
                {role === 'industry' && (
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. GreenPower Biomass Ltd"
                      required
                    />
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-card disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsRegister(!isRegister)} className="text-primary font-medium hover:underline">
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
