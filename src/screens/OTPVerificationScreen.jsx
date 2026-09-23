import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { OTPInput } from '../components/OTPInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthHeader } from '../components/AuthHeader';
import { Mail, Edit2, RotateCw } from 'lucide-react';
import { authService } from '../services/authService';

export const OTPVerificationScreen = () => {
  const { pendingAuth, handleVerifyOTP, setCurrentScreen, loading, showToast } = useAuth();
  const { t } = useTranslation();

  const [otpCode, setOtpCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');

  // 60 seconds countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (!canResend) return;
    try {
      const targetEmail = pendingAuth.email || pendingAuth.userId;
      const purpose = pendingAuth.flow === 'FORGOT_PASSWORD' ? 'password_reset' : 'email_verification';
      const res = await authService.resendOTP(targetEmail, purpose);
      showToast(res.message, 'success');
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      showToast(err.message || 'Failed to resend OTP', 'error');
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter all 6 digits of the code.');
      return;
    }
    setError('');
    handleVerifyOTP(otpCode);
  };

  return (
    <div className="min-h-full flex flex-col justify-between p-6 sm:p-8 animate-fade-in bg-[#F6F3EE]">
      <div className="w-full space-y-6 pt-2">
        <AuthHeader />

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-3xl bg-terracotta-100 text-terracotta-600 flex items-center justify-center shadow-soft">
          <Mail className="w-8 h-8" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-left space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('auth.otpTitle')}
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {t('auth.otpSubtitle')}{' '}
            <span className="font-bold text-slate-900">{pendingAuth.email || pendingAuth.userId}</span>
          </p>

          {/* Change Email Address Link */}
          <button
            type="button"
            onClick={() => setCurrentScreen(pendingAuth.flow === 'SIGNUP' ? 'SIGNUP' : 'FORGOT_PASSWORD')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta-600 hover:underline pt-1 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t('common.edit')} {t('auth.emailLabel')}</span>
          </button>
        </div>

        {/* OTP Input Component */}
        <form onSubmit={onSubmit} className="space-y-6 pt-2">
          <OTPInput
            value={otpCode}
            onChange={(val) => {
              setOtpCode(val);
              if (error) setError('');
            }}
            length={6}
            error={!!error}
          />

          {error && (
            <p className="text-xs font-semibold text-red-600 text-center animate-fade-in">{error}</p>
          )}

          <PrimaryButton
            type="submit"
            loading={loading}
            disabled={otpCode.length !== 6}
          >
            {t('auth.verifyOtp')}
          </PrimaryButton>
        </form>

        {/* Resend Timer Controls */}
        <div className="text-center pt-4 space-y-2">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="inline-flex items-center gap-2 text-sm font-bold text-terracotta-600 hover:text-terracotta-700 hover:underline cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>{t('auth.resendCode')}</span>
            </button>
          ) : (
            <p className="text-xs font-medium text-slate-500">
              {t('auth.resendIn', { seconds: timer })}
            </p>
          )}
        </div>
      </div>

      {/* Footer Back */}
      <div className="pt-6 pb-2 text-center">
        <button
          type="button"
          onClick={() => setCurrentScreen('LOGIN')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {t('common.back')} {t('common.signIn')}
        </button>
      </div>
    </div>
  );
};
