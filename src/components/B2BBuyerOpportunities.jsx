import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { 
  Building2, 
  MapPin, 
  Tag, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  MessageSquare,
  Clock,
  X
} from 'lucide-react';

export const B2BBuyerOpportunities = ({ showToast }) => {
  const [buyers, setBuyers] = useState([]);
  const [craftCategory, setCraftCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [connectedMap, setConnectedMap] = useState({});

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const [recRes, connRes] = await Promise.all([
        authService.getB2BRecommendations(),
        authService.getB2BConnections().catch(() => ({ connections: [] }))
      ]);

      if (recRes && recRes.success) {
        setBuyers(recRes.buyers || []);
        setCraftCategory(recRes.craft_category || null);
      } else {
        setError(recRes?.message || 'Buyer recommendations are temporarily unavailable.');
      }

      if (connRes && connRes.connections && Array.isArray(connRes.connections)) {
        const cmap = {};
        connRes.connections.forEach(c => {
          if (c.buyer_id) {
            cmap[c.buyer_id] = c.status || 'pending';
          }
        });
        setConnectedMap(cmap);
      }
    } catch (err) {
      console.warn('[B2B Recommendations Error]', err.message);
      setError('Buyer recommendations are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleConnect = async (buyer) => {
    setConnectingId(buyer.buyer_id);
    try {
      const res = await authService.connectB2BBuyer(buyer.buyer_id);
      if (res && res.success) {
        const status = res.connection?.status || 'pending';
        setConnectedMap(prev => ({ ...prev, [buyer.buyer_id]: status }));
        showToast?.(res.message || 'Connection request sent.', 'success');
      } else {
        showToast?.(res?.message || 'Failed to send connection request.', 'error');
      }
    } catch (err) {
      console.error('[B2B Connect Error]', err);
      showToast?.(err.message || 'Failed to connect to buyer.', 'error');
    } finally {
      setActionLoadingId(null);
      setConnectingId(null);
    }
  };

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="space-y-3 pt-2 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-terracotta-600" />
              <span>B2B Buyer Opportunities</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Buyers looking for your craft
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-terracotta-600" />
          <p className="text-xs font-semibold text-slate-600">Loading B2B buyer opportunities...</p>
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    return (
      <div className="space-y-3 pt-2 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-terracotta-600" />
              <span>B2B Buyer Opportunities</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Buyers looking for your craft
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between gap-3 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRecommendations}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. EMPTY STATE
  if (!buyers || buyers.length === 0) {
    return (
      <div className="space-y-3 pt-2 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-terracotta-600" />
              <span>B2B Buyer Opportunities</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Buyers looking for your craft
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-800">No B2B buyers are currently looking for your craft.</h4>
          {craftCategory && (
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Category: <span className="font-semibold text-terracotta-700">{craftCategory}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // 4. SUCCESS STATE WITH RECOMMENDED BUYER CARDS
  return (
    <div className="space-y-3 pt-2 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-terracotta-600" />
            <span>B2B Buyer Opportunities</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Buyers looking for your craft
          </p>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {buyers.length} {buyers.length === 1 ? 'Opportunity' : 'Opportunities'}
        </span>
      </div>

      {/* Grid of Recommended Buyers (Up to 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {buyers.map((buyer) => {
          const connStatus = connectedMap[buyer.buyer_id];
          const isAccepted = connStatus === 'accepted';
          const isPending = connStatus === 'pending';
          const isConnecting = connectingId === buyer.buyer_id;

          return (
            <div
              key={buyer.buyer_id}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {buyer.company}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <MapPin className="w-3 h-3 text-terracotta-600 flex-shrink-0" />
                      <span>{buyer.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0 border border-emerald-200/60">
                    Verified Buyer
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs">
                  <Tag className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="text-slate-600 font-medium truncate">
                    Looking for: <span className="font-bold text-slate-900">{buyer.craft_category}</span>
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => setSelectedBuyer(buyer)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleConnect(buyer)}
                  disabled={isAccepted || isPending || isConnecting}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    isAccepted
                      ? 'bg-emerald-600 text-white cursor-default'
                      : isPending
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/80 cursor-default'
                      : 'bg-terracotta-600 hover:bg-terracotta-700 text-white'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isAccepted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </>
                  ) : isPending ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Pending
                    </>
                  ) : (
                    <>
                      <span>Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buyer Details Modal Overlay */}
      {selectedBuyer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-floating animate-pop-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-terracotta-100 text-terracotta-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">{selectedBuyer.company}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">B2B Wholesale Buyer Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuyer(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Location:</span>
                  <span className="font-bold text-slate-900">{selectedBuyer.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Craft Demand:</span>
                  <span className="font-bold text-terracotta-700">{selectedBuyer.craft_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Buyer ID:</span>
                  <span className="font-mono text-slate-700">{selectedBuyer.buyer_id}</span>
                </div>
              </div>

              <p className="text-slate-600 font-medium leading-relaxed bg-amber-50/60 p-3 rounded-2xl border border-amber-200/60">
                This B2B buyer is looking for bulk wholesale supply of <span className="font-bold text-slate-900">{selectedBuyer.craft_category}</span>. Connecting allows them to review your digitized craft catalog and request quotes.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBuyer(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleConnect(selectedBuyer);
                  setSelectedBuyer(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Connect Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
