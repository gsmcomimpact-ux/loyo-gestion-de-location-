import React from 'react';
import { AppDatabase, SubscriptionPlanCode } from '../../types';
import { useCountry } from '../../contexts/CountryContext';
import { X, Check, Shield } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onSelectPlan: (planCode: SubscriptionPlanCode) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  db,
  onSelectPlan,
}) => {
  const { country, formatMoney } = useCountry();

  if (!isOpen) return null;

  const currentPlanCode = db.proprietaires[0].formule;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">Formules d'Abonnement Loyo</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                {country.flag} {country.name}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Choisissez la formule adaptée à votre parc immobilier ({country.currencySymbol})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {db.formules.map((f) => {
            const isCurrent = f.code === currentPlanCode;

            return (
              <div
                key={f.code}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  isCurrent
                    ? 'border-emerald-700 bg-emerald-50/50 shadow-sm'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900">{f.nom}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="text-xl font-black text-stone-900 font-mono">
                      {f.prixParLogement === 0 ? 'Gratuit' : formatMoney(f.prixParLogement)}
                    </div>
                    {f.prixParLogement > 0 && (
                      <div className="text-[10px] text-stone-500">
                        /logement/mois {f.minPrix > 0 ? `(min. ${formatMoney(f.minPrix)})` : ''}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 mt-2">{f.description}</p>

                  <ul className="mt-4 space-y-1.5 text-[11px] text-stone-600">
                    {f.caracteristiques.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    onSelectPlan(f.code);
                    onClose();
                  }}
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-emerald-800 text-white hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  {isCurrent ? 'Formule actuelle' : 'Choisir cette formule'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
