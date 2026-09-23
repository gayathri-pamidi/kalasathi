import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { CustomInput } from '../components/CustomInput';
import { CategorySelector } from '../components/CategorySelector';
import { LanguageSelector } from '../components/LanguageSelector';
import { ProfileImagePicker } from '../components/ProfileImagePicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { Sparkles, MapPin, Award, Mic, ArrowRight, Building } from 'lucide-react';
import { CRAFT_CATEGORIES } from '../services/mockData';

const LANGUAGE_LOCALE_MAP = {
  te: 'te-IN', // Telugu
  hi: 'hi-IN', // Hindi
  ta: 'ta-IN', // Tamil
  kn: 'kn-IN', // Kannada
  ml: 'ml-IN', // Malayalam
  mr: 'mr-IN', // Marathi
  bn: 'bn-IN', // Bengali
  gu: 'gu-IN', // Gujarati
  pa: 'pa-IN', // Punjabi
  or: 'or-IN', // Odia
  en: 'en-IN'  // English
};

export const ProfileSetupScreen = () => {
  const { user, handleCompleteProfileSetup, loading, showToast } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [businessName, setBusinessName] = useState(user?.businessName || user?.fullName || '');
  const [category, setCategory] = useState(user?.category || 'handloom');
  const [primaryCraft, setPrimaryCraft] = useState(user?.primaryCraft || '');
  const [location, setLocation] = useState(user?.location || '');
  const [experience, setExperience] = useState(user?.experience || '1-3 Years');
  const [bio, setBio] = useState(user?.bio || '');
  const [isDictating, setIsDictating] = useState(false);
  const [errors, setErrors] = useState({});

  const recognitionRef = useRef(null);
  const EXPERIENCE_OPTIONS = ['1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

  const handleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (showToast) {
        showToast('Voice dictation is not supported in this browser.', 'error');
      } else {
        alert('Voice dictation is not supported in this browser.');
      }
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const targetLocale = LANGUAGE_LOCALE_MAP[language] || 'en-IN';
      recognition.lang = targetLocale;
      recognition.continuous = false;
      recognition.interimResults = true;

      let initialBio = bio;

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const updatedBio = initialBio ? `${initialBio} ${transcript}` : transcript;
        setBio(updatedBio);
      };

      recognition.onerror = (event) => {
        console.error('[SpeechRecognition Error]', event.error);
        setIsDictating(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          if (showToast) {
            showToast('Microphone permission is required for voice dictation.', 'error');
          } else {
            alert('Microphone permission is required for voice dictation.');
          }
        } else if (event.error !== 'no-speech') {
          if (showToast) {
            showToast(`Voice dictation error: ${event.error}`, 'error');
          }
        }
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.start();
    } catch (err) {
      console.error('[Voice Dictation Exception]', err);
      setIsDictating(false);
      if (showToast) {
        showToast('Failed to start voice dictation.', 'error');
      }
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!businessName.trim()) {
      setErrors({ businessName: 'Please enter your business or artisan name' });
      return;
    }

    if (!category) {
      setErrors({ category: 'Please select a craft category' });
      return;
    }

    const selectedCategoryObj = CRAFT_CATEGORIES.find((c) => c.id === category);

    const profileData = {
      profilePic,
      businessName,
      category,
      categoryName: selectedCategoryObj?.title || 'Handcrafted Goods',
      primaryCraft: primaryCraft || 'Traditional Handmade Crafts',
      location: location || 'India',
      language,
      experience,
      bio
    };

    handleCompleteProfileSetup(profileData);
  };

  return (
    <div className="min-h-full flex flex-col justify-between p-6 sm:p-8 animate-fade-in bg-[#F6F3EE]">
      <div className="w-full space-y-6 pt-2">
        {/* Title Header */}
        <div className="text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta-100 text-terracotta-700 font-bold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('profile.onboardingStep')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('profile.title')}
          </h2>
          <p className="text-sm font-medium text-slate-500">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* Profile Image Picker */}
        <ProfileImagePicker
          selectedImage={profilePic}
          onImageChange={setProfilePic}
        />

        {/* Form Body */}
        <form onSubmit={onSubmit} className="space-y-6 pt-2">
          <CustomInput
            id="profile-business-name"
            label={t('profile.artisanName')}
            placeholder={t('profile.artisanNamePlaceholder')}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.businessName}
            icon={Building}
            required
          />

          {/* Visual Craft Category Selector */}
          <CategorySelector
            selectedCategory={category}
            onSelectCategory={setCategory}
            error={errors.category}
          />

          {/* Primary Craft Details */}
          <CustomInput
            id="profile-primary-craft"
            label={t('profile.primaryCraft')}
            placeholder={t('profile.primaryCraftPlaceholder')}
            value={primaryCraft}
            onChange={(e) => setPrimaryCraft(e.target.value)}
            icon={Sparkles}
            optional
          />

          {/* Location Field */}
          <CustomInput
            id="profile-location"
            label={t('profile.location')}
            placeholder={t('profile.locationPlaceholder')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            icon={MapPin}
            optional
          />

          {/* Language Selector */}
          <LanguageSelector
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
          />

          {/* Experience Level Selector */}
          <div className="w-full text-left space-y-2">
            <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-terracotta-600" />
              <span>{t('profile.experience')}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setExperience(opt)}
                  className={`touch-target py-2 px-3 rounded-2xl border text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer ${
                    experience === opt
                      ? 'border-terracotta-500 bg-terracotta-600 text-white shadow-craft'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Bio / Short Intro with Voice Dictation */}
          <div className="w-full text-left space-y-2">
            <div className="flex justify-between items-center px-0.5">
              <label htmlFor="profile-bio" className="block text-sm font-semibold text-slate-800">
                {t('profile.bio')}
              </label>
              <button
                type="button"
                onClick={handleVoiceDictation}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  isDictating
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100'
                }`}
              >
                {isDictating ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    <span>🔴 {t('profile.listening') || 'Listening...'}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>🎤 {t('profile.voiceDictate') || 'Voice Dictate'}</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              id="profile-bio"
              rows={3}
              placeholder={t('profile.bioPlaceholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-2xl p-4 text-slate-900 font-medium placeholder-slate-400 text-sm bg-white border border-slate-200 hover:border-slate-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 shadow-sm resize-none"
            />
          </div>

          <PrimaryButton
            type="submit"
            loading={loading}
            icon={ArrowRight}
            className="mt-4"
          >
            {t('profile.completeProfile')}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
};
