import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Building2, 
  Package, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';

export const B2BInquiries = ({ showToast }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getB2BInquiries();
      if (res && res.success && Array.isArray(res.inquiries)) {
        setInquiries(res.inquiries);
      } else {
        setInquiries([]);
      }
    } catch (err) {
      console.warn('[B2B Inquiries] Fetch error:', err.message);
      setError('Unable to load B2B inquiries.');
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (inquiryId, newStatus) => {
    setActionLoadingId(inquiryId);
    try {
      const res = await authService.updateB2BInquiryStatus(inquiryId, newStatus);
      if (res && res.success) {
        showToast?.(`Inquiry ${newStatus} successfully!`, 'success');
        setInquiries(prev => prev.map(inq => inq.inquiry_id === inquiryId ? { ...inq, status: newStatus } : inq));
      } else {
        showToast?.(res.message || 'Failed to update inquiry status', 'error');
      }
    } catch (err) {
      console.error('[B2B Inquiries] Update error:', err);
      showToast?.(err.message || 'Failed to update inquiry', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">B2B Inquiries</h3>
            <p className="text-xs text-slate-500 font-medium">Direct wholesale product inquiries from bulk buyers</p>
          </div>
        </div>

        <button
          onClick={fetchInquiries}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
          title="Refresh inquiries"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
          <p className="text-xs text-slate-500 font-medium">Fetching B2B buyer inquiries...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
          <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">{error}</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No B2B inquiries yet.</p>
          <p className="text-xs text-slate-400">Bulk inquiries placed by interested B2B buyers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const isPending = (inq.status || 'pending').toLowerCase() === 'pending';
            const isBusy = actionLoadingId === inq.inquiry_id;

            return (
              <div 
                key={inq.inquiry_id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-sm text-slate-900">{inq.company || inq.buyer_name || 'Wholesale Buyer'}</span>
                      {inq.buyer_location && (
                        <span className="text-xs text-slate-400 font-medium">• {inq.buyer_location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{inq.product_title || 'Craft Product'}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                        Qty: {inq.quantity || 1} units
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(inq.status)}
                  </div>
                </div>

                {inq.message && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                    "{inq.message}"
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-400">
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Inquiry Date: {formatDate(inq.created_at)}</span>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateStatus(inq.inquiry_id, 'rejected')}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent transition-all cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inq.inquiry_id, 'accepted')}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Accept Inquiry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
