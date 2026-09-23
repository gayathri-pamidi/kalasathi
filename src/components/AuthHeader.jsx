import React from 'react';
import { useTranslation } from '../i18n';
import { HeartHandshake, Languages } from 'lucide-react';

export const AuthHeader = () => {
  const { t, language, setLanguage, languages } = useTranslation();

  return (
    <div className="flex items-center justify-between w-full">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-terracotta-600 to-terracotta-500 text-white flex items-center justify-center shadow-craft">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h1 className="font-extrabold text-xl tracking-tight text-slate-900 font-sans leading-tight">
            Kala<span className="text-terracotta-600">Saathi</span>
          </h1>
          <p className="text-[11px] font-semibold text-terracotta-700">{t('common.tagline')}</p>
        </div>
      </div>

      {/* Language Selector Dropdown */}
      <div className="relative flex items-center bg-white/90 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs transition-colors">
        <Languages className="w-4 h-4 text-terracotta-600 mr-1.5 flex-shrink-0" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-1"
          aria-label="Select Language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native} ({lang.code.toUpperCase()})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
