import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { CustomInput } from '../components/CustomInput';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthHeader } from '../components/AuthHeader';
import { KeyRound, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { validateEmail } from '../utils/validation';

export const ForgotPasswordScreen = () => {
  const { currentScreen, handleStartForgotPassword, handleResetPassword, setCurrentScreen, loading } = useAuth();
  const { t } = useTranslation();

  const isResetStage = currentScreen === 'RESET_PASSWORD_NEW';

  // State for Step 1: Email input
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // State for Step 3: New password setup
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [confirmPassError, setConfirmPassError] = useState('');

  const onSendOTP = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Please enter your registered Email Address');
      return;
    }
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setEmailError('');
    handleStartForgotPassword(email);
  };

  const onResetPassword = (e) => {
    e.preventDefault();
    let hasErr = false;

    if (!newPassword || newPassword.length < 6) {
      setPassError('Password must be at least 6 characters');
      hasErr = true;
    } else {
      setPassError('');
    }

    if (newPassword !== confirmPassword) {
      setConfirmPassError('Passwords do not match');
      hasErr = true;
    } else {
      setConfirmPassError('');
    }

    if (hasErr) return;

    handleResetPassword(newPassword);
  };

  return (
    <div className="min-h-full flex flex-col justify-between p-6 sm:p-8 animate-fade-in bg-[#F6F3EE]">
      <div className="w-full space-y-6 pt-2">
        <AuthHeader />

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-3xl bg-terracotta-100 text-terracotta-600 flex items-center justify-center shadow-soft">
          <KeyRound className="w-8 h-8" />
        </div>

        {!isResetStage ? (
          /* STEP 1: Enter Email */
          <div className="space-y-6">
            <div className="text-left space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.forgotPasswordTitle')}
              </h2>
              <p className="text-sm font-medium text-slate-500">
                {t('auth.forgotPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={onSendOTP} className="space-y-4">
              <CustomInput
                id="forgot-email"
                label={t('auth.emailLabel')}
                type="email"
                placeholder="e.g. ramu@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                icon={Mail}
                required
              />

              <PrimaryButton
                type="submit"
                loading={loading}
                icon={ArrowRight}
                className="mt-4"
              >
                {t('auth.sendResetCode')}
              </PrimaryButton>
            </form>
          </div>
        ) : (
          /* STEP 3: Create New Password */
          <div className="space-y-6">
            <div className="text-left space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.newPasswordTitle')}
              </h2>
              <p className="text-sm font-medium text-slate-500">
                {t('auth.newPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={onResetPassword} className="space-y-4">
              <PasswordInput
                id="new-password"
                label={t('auth.password')}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={passError}
                showStrengthMeter
                required
              />

              <PasswordInput
                id="confirm-new-password"
                label={t('auth.confirmPassword')}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={confirmPassError}
                required
              />

              <PrimaryButton
                type="submit"
                loading={loading}
                icon={CheckCircle2}
                className="mt-4"
              >
                {t('auth.resetPassword')}
              </PrimaryButton>
            </form>
          </div>
        )}
      </div>

      {/* Footer Back */}
      <div className="pt-6 pb-2 text-center">
        <button
          type="button"
          onClick={() => setCurrentScreen('LOGIN')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {t('common.cancel')} &amp; {t('common.back')} {t('common.signIn')}
        </button>
      </div>
    </div>
  );
};
