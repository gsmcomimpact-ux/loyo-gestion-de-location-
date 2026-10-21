import React from 'react';
import { AppDatabase, Logement } from '../../types';
import { UserCheck, Banknote, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../../services/whatsappService';
import { useCountry } from '../../contexts/CountryContext';

interface CollectorDeskViewProps {
  db: AppDatabase;
  onOpenQuickPay: (logementId: string) => void;
}

export const CollectorDeskView: React.FC<CollectorDeskViewProps> = ({
  db,
  onOpenQuickPay,
}) => {
  const { country, formatMoney, formatPhone } = useCountry();
  const collector = db.collecteurs[0];
  const assignedUnits = db.logements.filter((l) =>
    collector?.logementsAssignes.includes(l.id)
  );

  const currentMonth = 10;
  const currentYear = 2026;

  return (
    <div className="space-y-6">
      {/* Profil Collecteur */}
      <div className="bg-amber-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-800 flex items-center justify-center text-amber-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{country.flag}</span>
              <span>Espace Collecteur Terrain ({country.name})</span>
            </div>
            <h1 className="text-xl font-bold">{collector?.nom || 'Moussa Dan Baba'}</h1>
            <div className="text-xs text-amber-200 font-mono mt-0.5">
              {formatPhone(collector?.telephone || '+221 77 123 45 67')} · {assignedUnits.length} logements attribués
            </div>
          </div>
        </div>
        <p className="text-xs text-amber-100/90 mt-3 max-w-xl">
          Encaissez les loyers en espèces ou mobile money ({country.paymentMethods.filter(p => p.type === 'mobile_money').map(p => p.label).join(', ')}) en 2 clics.
          L'application fonctionne même sans réseau et délivre instantanément le numéro de quittance.
        </p>
      </div>

      {/* Grille des logements attribués avec gros boutons tactiles */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900">
          Vos logements à encaisser ({assignedUnits.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedUnits.map((log) => {
            const bail = db.baux.find((b) => b.logementId === log.id);
            const locataire = db.locataires.find((lc) => lc.id === bail?.locataireId);
            const aPayeCeMois = db.paiements.some(
              (p) =>
                p.bailId === bail?.id &&
                p.periodeMois === currentMonth &&
                p.periodeAnnee === currentYear
            );

            return (
              <div
                key={log.id}
                className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">
                        {log.type}
                      </span>
                      <h3 className="text-base font-bold text-stone-900">{log.libelle}</h3>
                      <div className="text-xs text-stone-600 mt-1">
                        Locataire : <strong>{locataire?.nom || 'Locataire'}</strong>
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {locataire?.telephone}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        aPayeCeMois
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {aPayeCeMois ? 'Payé ce mois' : 'À encaisser'}
                    </span>
                  </div>

                  {/* Montant loyer */}
                  <div className="mt-4 bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-600">Loyer mensuel :</span>
                    <span className="text-base font-bold text-stone-900 font-mono">
                      {formatMoney(log.loyerMensuel)}
                    </span>
                  </div>
                </div>

                {/* Bouton grand format pour smartphone + WhatsApp direct */}
                <div className="space-y-2">
                  <button
                    onClick={() => onOpenQuickPay(log.id)}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Banknote className="w-5 h-5" />
                    <span>{aPayeCeMois ? 'Nouvel encaissement' : 'Encaisser le loyer'}</span>
                  </button>

                  {locataire && (
                    <a
                      href={getWhatsAppUrl(
                        locataire.telephone,
                        `Bonjour ${locataire.nom}, c'est ${collector?.nom || 'le collecteur'} pour votre logement ${log.libelle}. Je prévois de passer pour le règlement du loyer mensuel de ${formatMoney(log.loyerMensuel)}. Merci de me confirmer votre disponibilité.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-xs transition border border-green-200 flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span>Prévenir le locataire sur WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
