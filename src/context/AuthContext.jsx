import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Navigation Flow State: 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'OTP_VERIFICATION' | 'PROFILE_SETUP' | 'AUTH_SUCCESS' | 'DASHBOARD'
  const [currentScreen, setCurrentScreen] = useState('LOGIN');
  
  // App Language preference: 'en' | 'hi' | 'te' etc.
  const [language, setLanguage] = useState('en');

  // Active User session
  const [user, setUser] = useState(null);
  
  // Pending registration or forgot password state for Email OTP step
  const [pendingAuth, setPendingAuth] = useState({
    flow: 'SIGNUP', // 'SIGNUP' or 'FORGOT_PASSWORD'
    email: '',
    userId: '',
    tempData: null
  });

  // Global Toast / Alert message state
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const clearToast = () => setToast(null);

  // Auto-Session Recovery & Google OAuth Callback Token Handler on Mount
  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlError = urlParams.get('error');

      if (urlError) {
        showToast(decodeURIComponent(urlError), 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (urlToken) {
        authService.setToken(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const activeToken = authService.getToken();
      if (activeToken) {
        try {
          const res = await authService.getProfile();
          if (res.success && res.user) {
            setUser(res.user);
            setCurrentScreen(res.user.profileCompleted ? 'DASHBOARD' : 'PROFILE_SETUP');
            if (urlToken) {
              showToast('Logged in successfully via Google!', 'success');
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Session restoration expired or invalid:', err.message);
          authService.logout();
          setUser(null);
          setCurrentScreen('LOGIN');
        }
      } else if (urlError) {
        setCurrentScreen('LOGIN');
      }
      setInitializing(false);
    };

    initAuth();
  }, []);

  // Auth Handlers
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      setUser(res.user);
      showToast(res.message, 'success');
      
      if (!res.user.profileCompleted) {
        setCurrentScreen('PROFILE_SETUP');
      } else {
        setCurrentScreen('DASHBOARD');
      }
    } catch (err) {
      // If email verification is required before login
      if (err.requiresVerification) {
        setPendingAuth({
          flow: 'SIGNUP',
          email: err.email || email,
          userId: err.user_id || err.email || email,
          tempData: { email: err.email || email }
        });
        showToast(err.message || 'Please verify your email address.', 'warning');
        setCurrentScreen('OTP_VERIFICATION');
      } else {
        showToast(err.message || 'Login failed. Please check credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    try {
      authService.loginWithSocial(provider);
    } catch (err) {
      showToast(err.message || 'Social login failed.', 'error');
    }
  };

  const handleStartSignup = async (signupData) => {
    setLoading(true);
    try {
      const res = await authService.register(signupData);
      setPendingAuth({
        flow: 'SIGNUP',
        email: signupData.email,
        userId: signupData.userId,
        tempData: signupData
      });
      showToast(res.message, 'success');
      setCurrentScreen('OTP_VERIFICATION');
    } catch (err) {
      showToast(err.message || 'Signup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartForgotPassword = async (emailInput) => {
    setLoading(true);
    try {
      const res = await authService.forgotPassword(emailInput);
      setPendingAuth({
        flow: 'FORGOT_PASSWORD',
        email: emailInput,
        userId: emailInput,
        tempData: { email: emailInput }
      });
      showToast(res.message, 'success');
      setCurrentScreen('OTP_VERIFICATION');
    } catch (err) {
      showToast(err.message || 'Failed to send Email OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpCode) => {
    setLoading(true);
    try {
      const targetEmail = pendingAuth.email || pendingAuth.userId;
      const purpose = pendingAuth.flow === 'FORGOT_PASSWORD' ? 'password_reset' : 'email_verification';
      const res = await authService.verifyOTP(targetEmail, otpCode, purpose);
      showToast(res.message || 'Email verified successfully!', 'success');

      if (pendingAuth.flow === 'SIGNUP') {
        const newUser = {
          id: res.user?.user_id || pendingAuth.userId,
          userId: res.user?.user_id || pendingAuth.userId,
          fullName: pendingAuth.tempData?.fullName || 'Artisan User',
          email: res.user?.email || pendingAuth.email,
          language: language,
          profileCompleted: false
        };
        setUser(newUser);
        setCurrentScreen('PROFILE_SETUP');
      } else if (pendingAuth.flow === 'FORGOT_PASSWORD') {
        setCurrentScreen('RESET_PASSWORD_NEW');
      }
    } catch (err) {
      showToast(err.message || 'OTP verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (newPassword) => {
    setLoading(true);
    try {
      const targetEmail = pendingAuth.email || pendingAuth.userId;
      const res = await authService.resetPassword(targetEmail, newPassword);
      showToast(res.message, 'success');
      setCurrentScreen('LOGIN');
    } catch (err) {
      showToast(err.message || 'Password reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfileSetup = async (profileData) => {
    setLoading(true);
    try {
      const res = await authService.updateProfile(profileData);
      setUser(res.user);
      showToast(res.message, 'success');
      setCurrentScreen('AUTH_SUCCESS');
    } catch (err) {
      showToast(err.message || 'Failed to save profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentScreen('LOGIN');
    showToast('Logged out safely.', 'info');
  };

  if (initializing) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-[#F6F3EE]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-terracotta-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Connecting to KalaSaathi backend...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        user,
        setUser,
        pendingAuth,
        setPendingAuth,
        language,
        setLanguage,
        toast,
        showToast,
        clearToast,
        loading,
        handleLogin,
        handleSocialLogin,
        handleStartSignup,
        handleStartForgotPassword,
        handleVerifyOTP,
        handleResetPassword,
        handleCompleteProfileSetup,
        handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
