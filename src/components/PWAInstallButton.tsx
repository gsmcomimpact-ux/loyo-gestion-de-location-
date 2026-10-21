import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95"
        title="Installer l'application sur votre écran d'accueil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Installer (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h3 className="text-base font-bold">Installer sur iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-600">
                1. Appuyez sur le bouton de <strong>Partage</strong> (icône carré avec flèche vers le haut dans Safari).<br />
                2. Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.<br />
                3. Touchez <strong>Ajouter</strong> en haut à droite.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-emerald-800 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
