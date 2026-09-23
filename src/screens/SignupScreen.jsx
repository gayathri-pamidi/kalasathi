import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { CustomInput } from '../components/CustomInput';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialLoginButton } from '../components/SocialLoginButton';
import { AuthHeader } from '../components/AuthHeader';
import { User, Mail, UserCheck, ArrowRight } from 'lucide-react';
import {
  validateUserId,
  validateEmail,
  validatePassword
} from '../utils/validation';

export const SignupScreen = () => {
  const { handleStartSignup, handleSocialLogin, setCurrentScreen, loading } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    userId: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required to receive verification OTP';
    } else {
      const emailErr = validateEmail(formData.email);
      if (emailErr) newErrors.email = emailErr;
    }

    const userErr = validateUserId(formData.userId);
    if (userErr) newErrors.userId = userErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptedTerms) {
      newErrors.terms = 'You must accept the terms to continue';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    handleStartSignup(formData);
  };

  return (
    <div className="min-h-full flex flex-col justify-between p-6 sm:p-8 animate-fade-in bg-[#F6F3EE]">
      <div className="w-full space-y-6 pt-2">
        <AuthHeader />

        {/* Title Header */}
        <div className="text-left space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('auth.signupTitle')}
          </h2>
          <p className="text-sm font-medium text-slate-500">
            {t('auth.signupSubtitle')}
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <CustomInput
            id="signup-fullname"
            label={t('auth.fullName')}
            placeholder={t('auth.fullNamePlaceholder')}
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            error={errors.fullName}
            icon={User}
            required
          />

          <CustomInput
            id="signup-email"
            label={t('auth.emailLabel')}
            type="email"
            placeholder="e.g. ramu@gmail.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            icon={Mail}
            required
          />

          <CustomInput
            id="signup-userid"
            label={t('auth.createUserId')}
            placeholder="e.g. ramu_weaver"
            value={formData.userId}
            onChange={(e) => handleChange('userId', e.target.value)}
            error={errors.userId}
            icon={UserCheck}
            required
          />

          <PasswordInput
            id="signup-password"
            label={t('auth.password')}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            showStrengthMeter
            required
          />

          <PasswordInput
            id="signup-confirmpassword"
            label={t('auth.confirmPassword')}
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            required
          />

          {/* Terms & Conditions Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-3 cursor-pointer text-left">
              <input
                type="checkbox"
                checked={formData.acceptedTerms}
                onChange={(e) => handleChange('acceptedTerms', e.target.checked)}
                className="mt-1 w-5 h-5 rounded-md text-terracotta-600 focus:ring-terracotta-500 border-slate-300 transition cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600 leading-snug">
                {t('auth.agreeTerms')}
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs font-semibold text-red-600 px-1 pt-1">{errors.terms}</p>
            )}
          </div>

          <PrimaryButton
            type="submit"
            loading={loading}
            icon={ArrowRight}
            className="mt-4"
          >
            {t('common.createAccount')}
          </PrimaryButton>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
            <span className="bg-[#F6F3EE] px-3 text-slate-400">{t('common.or')}</span>
          </div>
        </div>

        {/* Google Alternative */}
        <SocialLoginButton provider="google" onClick={() => handleSocialLogin('google')} disabled={loading} />
      </div>

      {/* Footer Switch to Sign In */}
      <div className="pt-6 pb-2 text-center">
        <p className="text-sm text-slate-600 font-medium">
          {t('auth.alreadyHaveAccount')}{' '}
          <button
            type="button"
            onClick={() => setCurrentScreen('LOGIN')}
            className="font-extrabold text-terracotta-600 hover:text-terracotta-700 hover:underline cursor-pointer ml-1"
          >
            {t('common.signIn')}
          </button>
        </p>
      </div>
    </div>
  );
};
