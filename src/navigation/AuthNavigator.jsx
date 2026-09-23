import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { OTPVerificationScreen } from '../screens/OTPVerificationScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { AuthSuccessScreen } from '../screens/AuthSuccessScreen';
import { ArtisanDashboardScreen } from '../screens/ArtisanDashboardScreen';

export const AuthNavigator = () => {
  const { currentScreen } = useAuth();

  switch (currentScreen) {
    case 'LOGIN':
      return <LoginScreen />;
    case 'SIGNUP':
      return <SignupScreen />;
    case 'OTP_VERIFICATION':
      return <OTPVerificationScreen />;
    case 'FORGOT_PASSWORD':
    case 'RESET_PASSWORD_NEW':
      return <ForgotPasswordScreen />;
    case 'PROFILE_SETUP':
      return <ProfileSetupScreen />;
    case 'AUTH_SUCCESS':
      return <AuthSuccessScreen />;
    case 'DASHBOARD':
      return <ArtisanDashboardScreen />;
    default:
      return <LoginScreen />;
  }
};
