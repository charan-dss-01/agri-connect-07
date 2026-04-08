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
    <div className="min-h-screen flex">
      <div className="hidden w-1/2 items-center justify-center p-12 lg:flex gradient-hero">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">{t('brand.name', { ns: 'common' })}</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
            {isRegister ? t('panel.joinNetwork', { ns: 'auth' }) : t('panel.welcomeBack', { ns: 'auth' })}
          </h2>
          <p className="text-primary-foreground/70">{t('panel.description', { ns: 'auth' })}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
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
            <div className="mb-6 flex gap-2">
              {roles
                .filter((candidate) => candidate.value !== 'admin')
                .map((candidate) => (
                  <button
                    key={candidate.value}
                    type="button"
                    onClick={() => setRole(candidate.value)}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
                      role === candidate.value
                        ? 'bg-primary text-primary-foreground shadow-card'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
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
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90 disabled:opacity-50"
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
  );
};

export default Login;
