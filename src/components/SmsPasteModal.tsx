import React, { useState, useEffect } from 'react';
import {
  AppDatabase,
  Echeance,
  Paiement,
  PaymentMethod,
  UserRole,
} from '../types';
import { useCountry } from '../contexts/CountryContext';
import { parseOperatorSms, ParsedSmsResult } from '../services/smsParserService';
import {
  checkDuplicateTransactionId,
  checkSecondPaymentWarning,
  recalculateEcheanceStatus,
} from '../services/echeanceService';
import { LocalStorageManager } from '../services/storage';
import { createDigitalCertificate } from '../services/certificateService';
import {
  X,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SmsPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onPaymentConfirmed: (newPayment: Paiement, updatedEcheance: Echeance) => void;
}

export const SmsPasteModal: React.FC<SmsPasteModalProps> = ({
  isOpen,
  onClose,
  db,
  onPaymentConfirmed,
}) => {
  const { country, formatMoney } = useCountry();
  const proprietaire = db.proprietaires[0];

  const [smsInput, setSmsInput] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedSmsResult | null>(null);

  // Form overrides
  const [selectedEcheanceId, setSelectedEcheanceId] = useState<string>('');
  const [manualMontant, setManualMontant] = useState<number>(0);
  const [manualTransactionId, setManualTransactionId] = useState<string>('');
  const [manualOperateur, setManualOperateur] = useState<PaymentMethod>('airtel_money');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Instant analysis on text change
  useEffect(() => {
    if (!smsInput.trim()) {
      setParsed(null);
      return;
    }
    const result = parseOperatorSms(smsInput, db, proprietaire.id);
    setParsed(result);

    if (result.montant) {
      setManualMontant(result.montant);
    }
    if (result.transactionId) {
      setManualTransactionId(result.transactionId);
    }
    if (result.operateur && result.operateur !== 'autre') {
      setManualOperateur(result.operateur);
    }
    if (result.matchingEcheanceId) {
      setSelectedEcheanceId(result.matchingEcheanceId);
    }
  }, [smsInput, db, proprietaire.id]);

  if (!isOpen) return null;

  // Échantillons de test rapides
  const quickSamples = [
    {
      label: 'Airtel Money (35k)',
      text: 'Vous avez recu 35000 FCFA de OUMAROU GARBA (94778899) le 21/10/2026. Ref: CI261021.1402.B991. Solde: 185000 FCFA.',
    },
    {
      label: 'Moov Flooz (25k)',
      text: 'Flooz: Vous avez recu 25000 FCFA de MAHAMADOU SALEY. Id transaction: FLZ241021980. Nouveau solde: 145000 FCFA.',
    },
    {
      label: 'Wave (80k)',
      text: 'Vous avez recu 80 000F de Ibrahim Abdoulaye. Frais 0F. ID: WV-20261021-9921. Nouveau solde: 340 000F.',
    },
  ];

  const selectedEcheance = db.echeances.find((e) => e.id === selectedEcheanceId);
  const selectedLocataire = selectedEcheance
    ? db.locataires.find((l) => l.id === selectedEcheance.locataireId)
    : undefined;
  const selectedLogement = selectedEcheance
    ? db.logements.find((l) => l.id === selectedEcheance.logementId)
    : undefined;

  const handleConfirmAndIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setWarningMsg(null);

    if (!selectedEcheance || !selectedLocataire || !selectedLogement) {
      setErrorMsg('Veuillez sélectionner l\'échéance et le locataire correspondant.');
      return;
    }

    if (manualMontant <= 0) {
      setErrorMsg('Le montant doit être supérieur à 0.');
      return;
    }

    // 1. Anti-doublon d'ID de transaction
    if (manualTransactionId.trim()) {
      const dup = checkDuplicateTransactionId(db, proprietaire.id, manualTransactionId);
      if (dup.isDuplicate) {
        setErrorMsg(
          `Cet ID de transaction (${manualTransactionId}) a déjà été enregistré le ${dup.conflictingPayment?.date.slice(0, 10)}. Doublon refusé.`
        );
        return;
      }
    }

    // 2. Avertissement second paiement même période
    const warn = checkSecondPaymentWarning(
      db,
      selectedEcheance.bailId,
      selectedEcheance.periodeMois,
      selectedEcheance.periodeAnnee
    );
    if (warn.hasExistingPayment && !warningMsg) {
      setWarningMsg(
        'Attention : Un autre paiement existe déjà pour cette même période. Cliquez à nouveau sur Confirmer si vous souhaitez enregistrer un versement complémentaire (paiement partiel).'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 3. Attribution d'un numéro de quittance continu
      const numeroQuittance = LocalStorageManager.getNextQuittanceNumber(db);

      // Création temporaire pour générer certificat numérique avec QR code
      const tempPay: Paiement = {
        id: `pay_sms_${Date.now()}`,
        bailId: selectedEcheance.bailId,
        logementId: selectedEcheance.logementId,
        locataireId: selectedEcheance.locataireId,
        proprietaireId: proprietaire.id,
        echeanceId: selectedEcheance.id,
        periodeMois: selectedEcheance.periodeMois,
        periodeAnnee: selectedEcheance.periodeAnnee,
        montant: manualMontant,
        mode: manualOperateur,
        date: new Date().toISOString(),
        enregistreParRole: 'proprietaire',
        enregistreParNom: proprietaire.nom,
        source: 'proprietaire',
        statut: 'confirme',
        confirmeParNom: proprietaire.nom,
        confirmeParRole: 'proprietaire',
        dateConfirmation: new Date().toISOString(),
        transactionIdOperateur: manualTransactionId.trim() || undefined,
        referenceTransaction: manualTransactionId.trim() || undefined,
        numeroQuittance,
        rawSmsColle: smsInput,
        synchronise: true,
        smsEnvoye: true,
      };

      const cert = await createDigitalCertificate(tempPay, selectedLogement, selectedLocataire, proprietaire);
      tempPay.certificatId = cert.certificatId;
      tempPay.signatureNumerique = cert.signatureNumerique;
      tempPay.dateCertification = cert.dateCertification;

      // 4. Recalcul de l'échéance (paiements partiels pris en compte)
      const existingForEch = db.paiements.filter((p) => p.echeanceId === selectedEcheance.id && p.statut === 'confirme');
      const allConfirmed = [...existingForEch, tempPay];
      const recalculated = recalculateEcheanceStatus(selectedEcheance, allConfirmed);

      const updatedEch: Echeance = {
        ...selectedEcheance,
        montantPaye: recalculated.montantPaye,
        statut: recalculated.statut,
      };

      // 5. Journalisation d'audit
      db.journalPaiements.unshift({
        id: `jrn_${Date.now()}`,
        paiementId: tempPay.id,
        action: 'confirmation',
        auteurNom: proprietaire.nom,
        auteurRole: 'proprietaire',
        date: new Date().toISOString(),
        details: {
          montant: manualMontant,
          mode: manualOperateur,
          transactionId: manualTransactionId,
          echeanceRef: selectedEcheance.referenceCourte,
        },
      });

      onPaymentConfirmed(tempPay, updatedEch);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de la confirmation : ' + (err?.message || 'Inconnue'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Analyseur de SMS Opérateur</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-800">
                  Validation en 1 clic
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Collez le SMS de confirmation reçu (Airtel, Moov, Wave, Zamani...)
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

        {/* Message d'anti-détournement */}
        <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 px-5 text-xs text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Loyo ne touche pas à votre argent : l'analyseur certifie uniquement le SMS reçu directement sur votre téléphone.
          </span>
        </div>

        <form onSubmit={handleConfirmAndIssue} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {warningMsg && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Avertissement second versement</span>
                <p className="text-[11px]">{warningMsg}</p>
              </div>
            </div>
          )}

          {/* Zone de collage du SMS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-700" />
                <span>Collez ici le SMS reçu de l'opérateur</span>
              </label>
              <span className="text-[10px] text-stone-400">Détection automatique</span>
            </div>

            <textarea
              rows={3}
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
              placeholder="Ex : Vous avez recu 35 000 FCFA de Oumarou Garba. Ref: ATM-261021-98421. Nouveau solde..."
              className="w-full p-3 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600 shadow-2xs"
              autoFocus
            />

            {/* Boutons d'échantillons de démo */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-stone-500 font-semibold">Tester un exemple réel :</span>
              {quickSamples.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSmsInput(sample.text)}
                  className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 rounded border border-stone-200 transition font-medium"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Résultat de l'analyse automatique */}
          {parsed && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Données extraites par l'analyseur</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    parsed.confidenceScore >= 70
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Confiance : {parsed.confidenceScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Montant</span>
                  <strong className="text-emerald-800 font-mono text-sm">
                    {parsed.montant ? formatMoney(parsed.montant) : 'Non détecté'}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">ID Transaction</span>
                  <strong className="text-stone-800 font-mono text-[11px] truncate block">
                    {parsed.transactionId || 'Non détecté'}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Opérateur</span>
                  <strong className="text-stone-800 text-[11px] uppercase truncate block">
                    {parsed.operateur || 'Autre'}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Expéditeur</span>
                  <strong className="text-stone-800 text-[11px] truncate block">
                    {parsed.expediteur || 'Non spécifié'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Correspondance Échéance / Locataire proposée */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center justify-between">
              <span>Échéance & Locataire correspondant *</span>
              <span className="text-[10px] text-stone-500 font-normal">Sélectionner ou corriger</span>
            </label>

            <select
              value={selectedEcheanceId}
              onChange={(e) => setSelectedEcheanceId(e.target.value)}
              className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
              required
            >
              <option value="">-- Choisir le locataire et le mois dû --</option>
              {db.echeances.map((ech) => {
                const loc = db.locataires.find((l) => l.id === ech.locataireId);
                const log = db.logements.find((l) => l.id === ech.logementId);
                const reste = Math.max(0, ech.montantDu - ech.montantPaye);

                return (
                  <option key={ech.id} value={ech.id}>
                    {loc?.nom} — {log?.libelle} ({ech.referenceCourte}) · Dû : {formatMoney(reste)} [{ech.statut}]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Ajustement manuel des données (si l'analyse a besoin d'être rectifiée) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Montant réel encaissé</label>
              <input
                type="number"
                value={manualMontant}
                onChange={(e) => setManualMontant(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">ID Transaction Opérateur</label>
              <input
                type="text"
                value={manualTransactionId}
                onChange={(e) => setManualTransactionId(e.target.value)}
                placeholder="Ex: ATM-982147"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-xs uppercase focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">Opérateur de réception</label>
              <select
                value={manualOperateur}
                onChange={(e) => setManualOperateur(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
              >
                {country.paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action principale */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs transition"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isProcessing || !selectedEcheanceId}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing ? 'Validation...' : 'Valider d\'un clic & Émettre la Quittance'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
