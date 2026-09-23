import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const { message, type } = toast;

  const styles = {
    success: 'bg-emerald-800 text-white border-emerald-700 shadow-emerald-900/20',
    error: 'bg-red-800 text-white border-red-700 shadow-red-900/20',
    warning: 'bg-amber-800 text-white border-amber-700 shadow-amber-900/20',
    info: 'bg-slate-800 text-white border-slate-700 shadow-slate-900/20'
  };

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const Icon = icons[type] || Info;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm animate-pop-in">
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-xl text-sm font-semibold ${styles[type] || styles.info}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 leading-snug">{message}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
