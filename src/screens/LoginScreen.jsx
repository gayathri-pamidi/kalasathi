import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { CustomInput } from '../components/CustomInput';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialLoginButton } from '../components/SocialLoginButton';
import { AuthHeader } from '../components/AuthHeader';
import { Mail, ArrowRight } from 'lucide-react';
import { validateEmail, validatePassword } from '../utils/validation';

export const LoginScreen = () => {
  const { handleLogin, handleSocialLogin, setCurrentScreen, loading } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const onSubmit = (e) => {
    e.preventDefault();

    const emailError = validateEmail(email, true);
    const passError = validatePassword(password);

    if (emailError || passError) {
      setErrors({
        email: emailError,
        password: passError
      });
      return;
    }

    setErrors({});
    handleLogin(email, password);
  };

  return (
    <div className="min-h-full flex flex-col justify-between p-6 sm:p-8 animate-fade-in bg-[#F6F3EE]">
      {/* Header Section */}
      <div className="w-full space-y-6 pt-2">
        <AuthHeader />

        {/* Welcome Headline */}
        <div className="text-left space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('auth.loginTitle')}
          </h2>
          <p className="text-sm font-medium text-slate-500">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <CustomInput
            id="login-email"
            label={t('auth.emailLabel')}
            type="email"
            placeholder="e.g. ramu@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={Mail}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <PasswordInput
              id="login-password"
              label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setCurrentScreen('FORGOT_PASSWORD')}
                className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 hover:underline transition-colors cursor-pointer"
              >
                {t('common.forgotPassword')}
              </button>
            </div>
          </div>

          <PrimaryButton
            type="submit"
            loading={loading}
            icon={ArrowRight}
            className="mt-2"
          >
            {t('common.signIn')}
          </PrimaryButton>
        </form>

        {/* Social Login Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
            <span className="bg-[#F6F3EE] px-3 text-slate-400">{t('common.or')}</span>
          </div>
        </div>

        {/* Alternative Social Logins */}
        <div className="space-y-3">
          <SocialLoginButton provider="google" onClick={() => handleSocialLogin('google')} disabled={loading} />
        </div>
      </div>

      {/* Footer Switch to Signup */}
      <div className="pt-6 pb-2 text-center">
        <p className="text-sm text-slate-600 font-medium">
          {t('auth.dontHaveAccount')}{' '}
          <button
            type="button"
            onClick={() => setCurrentScreen('SIGNUP')}
            className="font-extrabold text-terracotta-600 hover:text-terracotta-700 hover:underline cursor-pointer ml-1"
          >
            {t('common.signUp')}
          </button>
        </p>
      </div>
    </div>
  );
};
