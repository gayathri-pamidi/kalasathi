import React from 'react';
import { Phone, ChevronDown, AlertCircle } from 'lucide-react';
import { COUNTRY_CODES } from '../services/mockData';

export const PhoneInput = ({
  label = 'Mobile Number',
  id = 'phone',
  phoneValue,
  onPhoneChange,
  countryCodeValue = '+91',
  onCountryCodeChange,
  error,
  required = false,
  placeholder = 'Enter 10-digit mobile number'
}) => {
  return (
    <div className="w-full text-left space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-800 px-0.5">
          {label}
          {required && <span className="text-terracotta-600 ml-1 font-bold">*</span>}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Country Code Dropdown Selector */}
        <div className="relative flex-shrink-0">
          <select
            value={countryCodeValue}
            onChange={(e) => onCountryCodeChange && onCountryCodeChange(e.target.value)}
            className="touch-target appearance-none rounded-2xl bg-white border border-slate-200 pl-3 pr-8 text-slate-900 font-semibold text-sm hover:border-slate-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15 shadow-sm cursor-pointer"
            aria-label="Country Code"
          >
            {COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.flag} {item.code}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Mobile Input Field */}
        <div className="relative flex-1">
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center top-1/2 -translate-y-1/2">
            <Phone className="w-5 h-5 text-slate-400" />
          </div>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            value={phoneValue}
            onChange={onPhoneChange}
            placeholder={placeholder}
            className={`
              w-full touch-target rounded-2xl pl-11 pr-4 text-slate-900 font-medium placeholder-slate-400 text-base
              bg-white border transition-all duration-200 shadow-sm
              ${error
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15'
              }
            `}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 px-1 pt-0.5 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
