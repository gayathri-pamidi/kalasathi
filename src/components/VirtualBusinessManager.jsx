import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useTranslation } from '../i18n';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Boxes, 
  BarChart2, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Award, 
  CheckCircle2, 
  Clock, 
  XCircle,
  IndianRupee
} from 'lucide-react';

export const VirtualBusinessManager = () => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getAnalytics();
      if (res.success && res.analytics) {
        setAnalytics(res.analytics);
      } else {
        setError('Failed to parse analytics data.');
      }
    } catch (err) {
      console.warn('[VirtualBusinessManager] Error fetching analytics:', err.message);
      setError('Unable to load business statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded-md" />
            <div className="h-3 w-64 bg-slate-200 rounded-md mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }


  const {
    totalProducts = 0,
    totalOrders = 0,
    completedOrders = 0,
    pendingOrders = 0,
    cancelledOrders = 0,
    totalRevenue = 0,
    monthlyRevenue = [],
    inventory = { totalUnits: 0, inStockProducts: 0, lowStockProducts: 0, outOfStockProducts: 0, available: false },
    bestSeller = null
  } = analytics || {};

  const hasSalesTrend = monthlyRevenue.some((m) => m.revenue > 0);
  const formattedRevenue = `₹${totalRevenue.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5 text-left">
      {/* Section Header */}
      <div>
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta-600" />
          <span>{t('dashboard.virtualManagerTitle') || 'Virtual Business Manager'}</span>
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {t('dashboard.virtualManagerSubtitle') || 'Understand your craft business at a glance'}
        </p>
      </div>

      {/* Inline API Failure Alert Banner */}
      {error && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Primary KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1 — TOTAL REVENUE */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </span>
              <span>{t('dashboard.totalRevenue') || 'Total Revenue'}</span>
            </span>
          </div>

          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formattedRevenue}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {totalRevenue > 0
                ? (t('dashboard.fromCompletedOrders') || 'From completed orders')
                : (t('dashboard.startSellingRevenue') || 'Start selling to see your revenue')}
            </p>
          </div>

          {totalRevenue > 0 ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-700">
                <span>Completed orders</span>
                <span>{completedOrders}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-full animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="bg-slate-300 h-full rounded-full w-0" />
            </div>
          )}
        </div>

        {/* CARD 2 — ORDERS / SALES */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <span>{t('dashboard.ordersTitle') || 'Orders'}</span>
            </span>
          </div>

          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalOrders}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {totalOrders > 0 ? (t('dashboard.totalOrders') || 'Total orders') : (t('dashboard.noOrdersYet') || 'No orders yet')}
            </p>
          </div>

          {totalOrders > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {completedOrders} Completed
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {pendingOrders} Pending
              </span>
              {cancelledOrders > 0 && (
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {cancelledOrders} Cancelled
                </span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100">
              0 Completed • 0 Pending
            </div>
          )}
        </div>

        {/* CARD 3 — PRODUCT PERFORMANCE */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Award className="w-4 h-4" />
              </span>
              <span>{t('dashboard.productPerformance') || 'Product Performance'}</span>
            </span>
          </div>

          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalProducts} <span className="text-xs font-semibold text-slate-500">Products</span>
            </div>

            {bestSeller ? (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] font-bold text-slate-700 truncate">
                  Best Seller: <span className="text-terracotta-700">{bestSeller.title}</span>
                </p>
                <div className="flex items-center gap-2 text-[10px] font-semibold text-purple-700">
                  <div className="flex-1 bg-purple-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full w-4/5" />
                  </div>
                  <span>{bestSeller.unitsSold} sold</span>
                </div>
              </div>
            ) : totalProducts > 0 ? (
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {t('dashboard.noSalesDataYet') || 'No sales data yet'}
              </p>
            ) : (
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {t('dashboard.addFirstProduct') || 'Add your first craft product'}
              </p>
            )}
          </div>

          <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
            {totalProducts > 0 ? `${totalProducts} catalog item${totalProducts > 1 ? 's' : ''}` : 'Catalog empty'}
          </div>
        </div>

        {/* CARD 4 — INVENTORY STATUS */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Boxes className="w-4 h-4" />
              </span>
              <span>{t('dashboard.inventoryStatus') || 'Inventory'}</span>
            </span>
          </div>

          {inventory.available ? (
            <div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {inventory.totalUnits} <span className="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold mt-1">
                <span className="text-emerald-700">🟢 {inventory.inStockProducts} In Stock</span>
                {inventory.lowStockProducts > 0 && (
                  <span className="text-amber-700">🟡 {inventory.lowStockProducts} Low</span>
                )}
                {inventory.outOfStockProducts > 0 && (
                  <span className="text-rose-700">🔴 {inventory.outOfStockProducts} Out</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-base font-bold text-slate-700">
                Data Unavailable
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Inventory data unavailable
              </p>
            </div>
          )}

          <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
            {inventory.available ? 'Stock tracking active' : 'Inventory tracking pending'}
          </div>
        </div>
      </div>

      {/* SALES TREND VISUALIZATION SECTION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-terracotta-600" />
              <span>{t('dashboard.salesOverview') || 'Sales Overview'}</span>
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              {t('dashboard.revenueOverTime') || 'Revenue trend over the last 6 months'}
            </p>
          </div>
        </div>

        {hasSalesTrend ? (
          <div className="pt-2 space-y-2">
            <div className="h-40 w-full flex items-end justify-between gap-2 px-2 pb-2 border-b border-slate-200">
              {monthlyRevenue.map((item, idx) => {
                const maxRev = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
                const heightPercent = Math.max((item.revenue / maxRev) * 100, 8);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{item.revenue}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] bg-gradient-to-t from-terracotta-600 to-amber-500 rounded-t-md transition-all duration-300 group-hover:brightness-110"
                    />
                    <span className="text-[10px] font-bold text-slate-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1.5">
            <TrendingUp className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
            <h5 className="font-bold text-xs text-slate-800">
              {t('dashboard.noSalesTrend') || 'Your sales trend will appear here once you receive orders.'}
            </h5>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Real transaction data from completed buyer orders will automatically render your monthly revenue chart here.
            </p>
          </div>
        )}
      </div>

      {/* AI BUSINESS INSIGHTS SECTION */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-terracotta-500/10 to-purple-500/10 border border-amber-500/20 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="font-extrabold text-sm text-slate-900">
            {t('dashboard.aiInsightsTitle') || 'AI Business Insights'}
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium pl-0.5">
          {t('dashboard.aiInsightsPlaceholder') ||
            'Once you have enough sales data, KalaSaathi will identify trends, best-selling products and business opportunities for you.'}
        </p>
      </div>
    </div>
  );
};
