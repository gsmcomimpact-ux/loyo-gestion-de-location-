import React, { useState } from 'react';
import {
  Echeance,
  Paiement,
  Logement,
  Locataire,
  Bien,
  Proprietaire,
  NumeroReception,
  PaymentMethod,
  AppDatabase,
} from '../types';
import { useCountry } from '../contexts/CountryContext';
import {
  checkDuplicateTransactionId,
  recalculateEcheanceStatus,
} from '../services/echeanceService';
import {
  X,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  Calendar,
  Send,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface TenantPublicPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  echeance: Echeance;
  db: AppDatabase;
  onPaymentReported: (newPayment: Paiement, updatedEcheance: Echeance) => void;
}

export const TenantPublicPayModal: React.FC<TenantPublicPayModalProps> = ({
  isOpen,
  onClose,
  echeance,
  db,
  onPaymentReported,
}) => {
  const { country, formatMoney } = useCountry();

  const bail = db.baux.find((b) => b.id === echeance.bailId);
  const logement = db.logements.find((l) => l.id === echeance.logementId);
  const bien = db.biens.find((b) => b.id === logement?.bienId);
  const locataire = db.locataires.find((l) => l.id === echeance.locataireId);
  const proprietaire = db.proprietaires.find((p) => p.id === echeance.proprietaireId) || db.proprietaires[0];

  const receptionNumbers = db.numerosReception.filter(
    (nr) => nr.proprietaireId === proprietaire.id && nr.actif
  );

  const preferredNr = receptionNumbers.find((nr) => nr.id === logement?.numeroReceptionPrefereId) ||
    receptionNumbers.find((nr) => nr.parDefaut) ||
    receptionNumbers[0];

  const resteDu = Math.max(0, echeance.montantDu - echeance.montantPaye);

  // Form State
  const [selectedOperateur, setSelectedOperateur] = useState<PaymentMethod>(
    preferredNr?.operateur || 'airtel_money'
  );
  const [selectedNrId, setSelectedNrId] = useState<string>(preferredNr?.id || '');
  const [montantPaye, setMontantPaye] = useState<number>(resteDu);
  const [transactionId, setTransactionId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !locataire || !logement) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (montantPaye <= 0) {
      setErrorMsg('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    // Contrôle anti-doublon d'ID de transaction
    if (transactionId.trim()) {
      const dupCheck = checkDuplicateTransactionId(db, proprietaire.id, transactionId);
      if (dupCheck.isDuplicate) {
        setErrorMsg(
          `Cet identifiant de transaction (${transactionId.trim()}) a déjà été enregistré sur ce compte bailleur. Veuillez vérifier votre SMS de confirmation.`
        );
        return;
      }
    }

    // Création du paiement avec statut "en_attente_confirmation" (signalé par locataire)
    const newPayment: Paiement = {
      id: `pay_rep_${Date.now()}`,
      bailId: echeance.bailId,
      logementId: echeance.logementId,
      locataireId: echeance.locataireId,
      proprietaireId: proprietaire.id,
      echeanceId: echeance.id,
      numeroReceptionId: selectedNrId || preferredNr?.id,
      periodeMois: echeance.periodeMois,
      periodeAnnee: echeance.periodeAnnee,
      montant: montantPaye,
      mode: selectedOperateur,
      date: new Date().toISOString(),
      enregistreParRole: 'locataire',
      enregistreParNom: `${locataire.nom} (Locataire)`,
      source: 'locataire',
      statut: 'en_attente_confirmation',
      transactionIdOperateur: transactionId.trim() || undefined,
      referenceTransaction: transactionId.trim() || `DECL-${Date.now().toString().slice(-4)}`,
      numeroQuittance: '', // Aucune quittance émise avant confirmation !
      synchronise: true,
      smsEnvoye: false,
    };

    // Mise à jour de l'échéance : statut "signale_par_locataire" (stoppe immédiatement les relances)
    const updatedEcheance: Echeance = {
      ...echeance,
      statut: 'signale_par_locataire',
    };

    onPaymentReported(newPayment, updatedEcheance);
    setIsSuccess(true);
  };

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xs text-white">
              LO
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Portail Locataire</span>
                <span className="text-[10px] bg-stone-800 text-emerald-400 font-mono px-2 py-0.5 rounded border border-stone-700">
                  Réf. {echeance.referenceCourte}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Paiement direct de votre loyer sans intermédiaire
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AVERTISSEMENT CAPITAL : LOYO NE REÇOIT PAS VOTRE ARGENT */}
        <div className="bg-amber-500/10 border-b border-amber-300/60 p-3 sm:px-5 flex items-start gap-3 text-xs text-amber-950">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">
              Loyo ne reçoit pas votre argent : vous payez directement votre propriétaire.
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              L'application n'encaisse aucun fonds. Vous effectuez votre règlement directement sur le compte Mobile Money personnel du bailleur indiqué ci-dessous.
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-stone-900">
                Paiement signalé avec succès !
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Votre déclaration de paiement de <strong>{formatMoney(montantPaye)}</strong> a été transmise à votre bailleur <strong>{proprietaire.nom}</strong>.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left text-xs text-emerald-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Que se passe-t-il maintenant ?</span>
              </div>
              <ul className="text-[11px] text-stone-700 list-disc list-inside space-y-1">
                <li>Les relances automatiques de loyer ont été <strong>mises en pause</strong>.</li>
                <li>Votre propriétaire va vérifier son compte Mobile Money.</li>
                <li>Dès confirmation de sa part, votre <strong>Fiche de Quittance officielle certifiée (avec QR code)</strong> sera émise et vous sera transmise par SMS / WhatsApp.</li>
              </ul>
            </div>

            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
            >
              Fermer la page
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Détails du loyer */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-500">Locataire & Logement</span>
                <div className="font-black text-stone-900 text-sm mt-0.5">{locataire.nom}</div>
                <div className="text-stone-600 mt-0.5">
                  {logement.libelle} ({bien?.nom}, {bien?.commune})
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500">
                  Loyer {moisNoms[echeance.periodeMois - 1]} {echeance.periodeAnnee}
                </span>
                <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
                  {formatMoney(resteDu)}
                </div>
                {echeance.montantPaye > 0 && (
                  <div className="text-[10px] text-stone-500 font-mono">
                    (Total : {formatMoney(echeance.montantDu)} · Déjà payé : {formatMoney(echeance.montantPaye)})
                  </div>
                )}
              </div>
            </div>

            {/* Numéros de réception du propriétaire */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Numéros de réception du propriétaire</span>
                </label>
                <span className="text-[10px] text-stone-500">Choisissez où payer</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {receptionNumbers.map((nr) => {
                  const isPref = nr.id === preferredNr?.id;
                  const isSelected = selectedNrId === nr.id;

                  return (
                    <div
                      key={nr.id}
                      onClick={() => {
                        setSelectedNrId(nr.id);
                        setSelectedOperateur(nr.operateur);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600/30'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase text-emerald-950">
                            {nr.operateur.replace('_', ' ')}
                          </span>
                          {isPref && (
                            <span className="bg-emerald-200 text-emerald-900 text-[9px] font-bold px-1.5 py-0.2 rounded">
                              Recommandé
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono font-bold text-stone-900 flex items-center gap-2">
                          <span>{nr.numero}</span>
                          <span className="text-stone-400 font-normal">({nr.nomAffiche})</span>
                        </div>
                        {nr.instructions && (
                          <div className="text-[10px] text-stone-500 italic">{nr.instructions}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(nr.id, nr.numero);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition shrink-0 self-start sm:self-center"
                        title="Copier le numéro"
                      >
                        {copiedId === nr.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 text-[11px]">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-500" />
                            <span className="text-[11px]">Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORMULAIRE : "J'ai payé" */}
            <form onSubmit={handleSubmit} className="border-t border-stone-200 pt-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Confirmer que vous avez payé</span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Montant envoyé ({country.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={montantPaye}
                    onChange={(e) => setMontantPaye(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-emerald-600"
                    required
                  />
                  {montantPaye < resteDu && (
                    <span className="text-[10px] text-amber-700 mt-1 block">
                      Paiement partiel : Reste à régler plus tard : {formatMoney(resteDu - montantPaye)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    ID de transaction reçu par SMS
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CI261021.1402 ou FLZ-88231"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-600 uppercase"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Facultatif mais accélère grandement la validation par le bailleur
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>J'ai payé — Informer mon propriétaire</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
