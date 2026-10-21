import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onSync: () => void;
  syncSuccessMessage?: string | null;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  pendingCount,
  onSync,
  syncSuccessMessage,
}) => {
  if (syncSuccessMessage) {
    return (
      <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{syncSuccessMessage}</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse text-amber-200" />
          <span>
            Mode Hors Ligne actif. Les encaissements sont stockés sur votre téléphone et se synchroniseront au retour du réseau.
            {pendingCount > 0 && ` (${pendingCount} en attente)`}
          </span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-sky-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-sky-200" />
          <span>{pendingCount} encaissement(s) hors-ligne prêt(s) à être synchronisés.</span>
        </div>
        <button
          onClick={onSync}
          className="bg-white text-sky-900 font-semibold px-2.5 py-1 rounded text-xs hover:bg-sky-50 active:scale-95 transition"
        >
          Synchroniser maintenant
        </button>
      </div>
    );
  }

  return null;
};
