import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { PrimaryButton } from '../components/PrimaryButton';
import { CheckCircle2, Sparkles, ArrowRight, Store, ShieldCheck } from 'lucide-react';

export const AuthSuccessScreen = () => {
  const { user, setCurrentScreen } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    // Auto redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      setCurrentScreen('DASHBOARD');
    }, 3000);
    return () => clearTimeout(timer);
  }, [setCurrentScreen]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-8 animate-pop-in bg-[#F6F3EE] text-center">
      <div className="w-full max-w-sm space-y-6">
        {/* Celebration Badge */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-floating mx-auto animate-pulse-glow">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <div className="absolute -top-2 -right-2 p-2 rounded-full bg-amber-400 text-slate-900 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            {t('success.setupComplete')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('success.welcomeArtisan', { name: user?.businessName || user?.fullName || t('dashboard.artisanUser') })}
          </h2>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            {t('success.profileActiveDesc')}
          </p>
        </div>

        {/* Feature Highlights Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-terracotta-100 text-terracotta-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">{t('success.aiReady')}</h4>
              <p className="text-xs text-slate-500">{user?.categoryName || user?.category || 'Craft'} Catalog Configured</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">{t('success.verifiedStatus')}</h4>
              <p className="text-xs text-slate-500">Language: {user?.language?.toUpperCase() || 'EN'}</p>
            </div>
          </div>
        </div>

        <PrimaryButton
          onClick={() => setCurrentScreen('DASHBOARD')}
          icon={ArrowRight}
          className="mt-4"
        >
          {t('success.goToDashboard')}
        </PrimaryButton>

        <p className="text-xs text-slate-400 animate-pulse">
          {t('success.redirecting')}
        </p>
      </div>
    </div>
  );
};
