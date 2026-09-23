import React from 'react';
import { AlertCircle } from 'lucide-react';

export const CustomInput = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  rightElement,
  required = false,
  optional = false,
  helperText,
  disabled = false,
  autoComplete,
  className = '',
  inputClassName = '',
  ...props
}) => {
  return (
    <div className={`w-full text-left space-y-1.5 ${className}`}>
      {label && (
        <div className="flex justify-between items-center px-0.5">
          <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
            {label}
            {required && <span className="text-terracotta-600 ml-1 font-bold">*</span>}
          </label>
          {optional && <span className="text-xs text-slate-400 font-medium">(Optional)</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full touch-target rounded-2xl px-4 text-slate-900 font-medium placeholder-slate-400 text-base
            bg-white border transition-all duration-200 shadow-sm
            ${Icon ? 'pl-11' : 'pl-4'}
            ${rightElement ? 'pr-12' : 'pr-4'}
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/15'
            }
            ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''}
            ${inputClassName}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 px-1 pt-0.5 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="text-xs text-slate-500 px-1 pt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
