import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Building2, 
  Package, 
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  CheckCheck
} from 'lucide-react';

/**
 * Format INR currency string
 */
const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const B2BOrders = ({ showToast, onOrderCompleted }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getB2BOrders();
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('[B2B Orders] Fetch error:', err.message);
      setError('Unable to load B2B orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoadingId(orderId);
    try {
      const res = await authService.updateB2BOrderStatus(orderId, newStatus);
      if (res && res.success) {
        showToast?.(`Order updated to ${newStatus}!`, 'success');
        setOrders(prev => prev.map(ord => ord.order_id === orderId ? { ...ord, status: newStatus } : ord));
        
        if (newStatus === 'completed') {
          // Trigger refresh of Virtual Business Manager analytics
          onOrderCompleted?.();
        }
      } else {
        showToast?.(res.message || 'Failed to update order status', 'error');
      }
    } catch (err) {
      console.error('[B2B Orders] Update error:', err);
      showToast?.(err.message || 'Failed to update order', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
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
          <div className="w-9 h-9 rounded-2xl bg-terracotta-50 border border-terracotta-200/60 flex items-center justify-center text-terracotta-700">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">B2B Bulk Orders</h3>
            <p className="text-xs text-slate-500 font-medium">Wholesale purchase orders placed by verified business buyers</p>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
          title="Refresh orders"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-terracotta-600" />
          <p className="text-xs text-slate-500 font-medium">Loading B2B bulk orders...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
          <AlertCircle className="w-5 h-5 text-terracotta-600 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No B2B orders yet.</p>
          <p className="text-xs text-slate-400">Bulk purchase orders placed by B2B buyers will appear here for processing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((ord) => {
            const status = (ord.status || 'pending').toLowerCase();
            const isPending = status === 'pending';
            const isAccepted = status === 'accepted';
            const isBusy = actionLoadingId === ord.order_id;

            return (
              <div 
                key={ord.order_id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{ord.order_id}
                      </span>
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-sm text-slate-900">{ord.company || ord.buyer_name || 'Bulk Buyer'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                      <Package className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
                      <span>{ord.product_title || 'Craft Product'}</span>
                      <span className="text-slate-300">•</span>
                      <span>Qty: {ord.quantity || 1} units</span>
                      <span className="text-slate-300">•</span>
                      <span>Unit: {formatINR(ord.unit_price)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        Total: {formatINR(ord.total_amount || (ord.quantity * ord.unit_price))}
                      </span>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(ord.status)}
                  </div>
                </div>

                {/* Delivery Location & Buyer Message */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ord.delivery_location && (
                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Delivery: {ord.delivery_location}</span>
                    </div>
                  )}
                  {ord.buyer_message && (
                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 italic">
                      <span className="truncate">"{ord.buyer_message}"</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-400">
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Order Date: {formatDate(ord.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(ord.order_id, 'rejected')}
                          disabled={isBusy}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-transparent transition-all cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ord.order_id, 'accepted')}
                          disabled={isBusy}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Accept Order
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleUpdateStatus(ord.order_id, 'completed')}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
