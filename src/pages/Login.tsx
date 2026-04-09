import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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
  const { t } = useTranslation(['common', 'auth']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        const res = await register({ name, email, password, role, phone, village, companyName });
        if (res.error) {
          toast({ title: t('toasts.registrationFailed', { ns: 'auth' }), description: res.error, variant: 'destructive' });
          setSubmitting(false);
          return;
        }

        if (res.requiresEmailConfirmation) {
          toast({
            title: t('toasts.checkEmailTitle', { ns: 'auth' }),
            description: t('toasts.checkEmailDescription', { ns: 'auth' }),
          });
          setIsRegister(false);
          setSubmitting(false);
          return;
        }

        toast({
          title: t('toasts.accountCreatedTitle', { ns: 'auth' }),
          description: t('toasts.accountCreatedDescription', { ns: 'auth' }),
        });
      } else {
        const res = await login(email, password);
        if (res.error) {
          toast({ title: t('toasts.loginFailed', { ns: 'auth' }), description: res.error, variant: 'destructive' });
          setSubmitting(false);
          return;
        }
      }

      setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: roleData } = await supabase
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
    { value: 'farmer', label: t('roles.farmer', { ns: 'common' }) },
    { value: 'industry', label: t('roles.industry', { ns: 'common' }) },
    { value: 'admin', label: t('roles.admin', { ns: 'common' }) },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 -right-28 h-96 w-96 rounded-full bg-accent/12 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-8 p-6 md:p-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="max-w-lg rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-10 shadow-elevated backdrop-blur-xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{t('brand.name', { ns: 'common' })}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Crop Exchange</p>
              </div>
            </div>

            <h2 className="mb-4 text-4xl font-bold leading-tight text-foreground">
              {isRegister ? t('panel.joinNetwork', { ns: 'auth' }) : t('panel.welcomeBack', { ns: 'auth' })}
            </h2>
            <p className="text-muted-foreground">{t('panel.description', { ns: 'auth' })}</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-border/60 bg-card/85 p-6 shadow-elevated backdrop-blur-2xl md:p-8">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Leaf className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">{t('brand.name', { ns: 'common' })}</span>
              </div>
              <LanguageSwitcher />
            </div>

            <h1 className="mb-1 text-2xl font-bold">
              {isRegister ? t('page.createAccount', { ns: 'auth' }) : t('page.signIn', { ns: 'auth' })}
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {isRegister ? t('page.createAccountDescription', { ns: 'auth' }) : t('page.signInDescription', { ns: 'auth' })}
            </p>

            {isRegister && (
              <div className="mb-6 flex gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
                {roles
                  .filter((candidate) => candidate.value !== 'admin')
                  .map((candidate) => (
                    <button
                      key={candidate.value}
                      type="button"
                      onClick={() => setRole(candidate.value)}
                      className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                        role === candidate.value
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {candidate.label}
                    </button>
                  ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.fullName', { ns: 'auth' })}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('form.fullNamePlaceholder', { ns: 'auth' })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.phone', { ns: 'auth' })}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('form.phonePlaceholder', { ns: 'auth' })}
                  />
                </div>
                {role === 'farmer' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.village', { ns: 'auth' })}</label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder={t('form.villagePlaceholder', { ns: 'auth' })}
                    />
                  </div>
                )}
                {role === 'industry' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.companyName', { ns: 'auth' })}</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder={t('form.companyNamePlaceholder', { ns: 'auth' })}
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.email', { ns: 'auth' })}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('form.emailPlaceholder', { ns: 'auth' })}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">{t('form.password', { ns: 'auth' })}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('form.passwordPlaceholder', { ns: 'auth' })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-card transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? t('page.createAccount', { ns: 'auth' }) : t('page.signIn', { ns: 'auth' })}
            </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isRegister ? t('toggle.alreadyHaveAccount', { ns: 'auth' }) : t('toggle.dontHaveAccount', { ns: 'auth' })}{' '}
              <button type="button" onClick={() => setIsRegister(!isRegister)} className="font-medium text-primary hover:underline">
                {isRegister ? t('toggle.signIn', { ns: 'auth' }) : t('toggle.register', { ns: 'auth' })}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
