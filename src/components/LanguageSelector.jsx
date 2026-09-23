import React from 'react';
import { useTranslation } from '../i18n';
import { Languages, Check } from 'lucide-react';

export const LanguageSelector = ({ selectedLanguage, onSelectLanguage }) => {
  const { language, setLanguage, languages, t } = useTranslation();

  const currentLang = selectedLanguage || language;
  const handleSelect = onSelectLanguage || setLanguage;

  return (
    <div className="w-full text-left space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-terracotta-600" />
          <span>{t('nav.preferredLanguage')}</span>
        </label>
        <span className="text-xs text-slate-400 font-medium">{t('nav.language')}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => {
          const isSelected = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                touch-target px-3.5 py-2 rounded-2xl border text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-xs active:scale-[0.98] cursor-pointer
                ${isSelected
                  ? 'border-terracotta-500 bg-terracotta-600 text-white shadow-craft ring-2 ring-terracotta-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <span>{lang.native}</span>
              <span className={`text-xs ${isSelected ? 'text-terracotta-100' : 'text-slate-400'}`}>
                ({lang.name})
              </span>
              {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

