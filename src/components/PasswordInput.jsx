import React, { useState } from 'react';
import { CustomInput } from './CustomInput';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/validation';

export const PasswordInput = ({
  label = 'Password',
  id = 'password',
  value,
  onChange,
  placeholder = 'Enter your password',
  error,
  showStrengthMeter = false,
  required = false,
  autoComplete = 'current-password',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = evaluatePasswordStrength(value);

  return (
    <div className="w-full space-y-1.5">
      <CustomInput
        id={id}
        label={label}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        error={error}
        icon={Lock}
        required={required}
        autoComplete={autoComplete}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 text-slate-500" />
            ) : (
              <Eye className="w-5 h-5 text-slate-400" />
            )}
          </button>
        }
        {...props}
      />

      {showStrengthMeter && value && (
        <div className="px-1 space-y-1 pt-1 animate-fade-in">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Password strength:</span>
            <span className={strength.textClass}>{strength.label}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${strength.colorClass}`}
              style={{ width: strength.widthPercent }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
