import React from 'react';
import { Loader2 } from 'lucide-react';

export const PrimaryButton = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = true,
  className = '',
  ...props
}) => {
  const baseStyles = 'touch-target rounded-2xl font-bold text-base transition-all duration-200 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 px-6';

  const variants = {
    primary: 'bg-gradient-to-r from-terracotta-600 to-terracotta-500 hover:from-terracotta-700 hover:to-terracotta-600 text-white shadow-craft focus:ring-4 focus:ring-terracotta-500/25',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-soft focus:ring-4 focus:ring-slate-500/25',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 focus:ring-4 focus:ring-slate-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-2 focus:ring-slate-200'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
