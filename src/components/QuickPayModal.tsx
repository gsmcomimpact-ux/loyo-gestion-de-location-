import React, { useState } from 'react';
import {
  Logement,
  Locataire,
  Bail,
  Bien,
  Paiement,
  PaymentMethod,
  UserRole,
  Language,
  Echeance,
} from '../types';
import { formatMoney, MOIS_FR } from '../utils/formatters';
import { activeSmsProvider } from '../services/smsProvider';
import { LocalStorageManager, AppDatabase } from '../services/storage';
import { createDigitalCertificate } from '../services/certificateService';
import { sendQuittanceWithPdfViaWhatsApp } from '../services/whatsappService';
import {
  checkDuplicateTransactionId,
  checkSecondPaymentWarning,
  recalculateEcheanceStatus,
} from '../services/echeanceService';
import { useCountry } from '../contexts/CountryContext';
import {
  X,
  CheckCircle2,
  Banknote,
  Smartphone,
  AlertTriangle,
  FileText,
  Download,
  QrCode,
  ShieldCheck,
  MessageCircle,
  CreditCard,
  Building,
} from 'lucide-react';
import { ReceiptCertificateModal } from './ReceiptCertificateModal';

interface QuickPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onPaymentSaved: (paiement: Paiement) => void;
  activeRole: UserRole;
  preselectedLogementId?: string;
}

export const QuickPayModal: React.FC<QuickPayModalProps> = ({
  isOpen,
  onClose,
  db,
  onPaymentSaved,
  activeRole,
  preselectedLogementId,
}) => {
  const { country, formatMoney: formatCurr } = useCountry();

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  const [selectedLogementId, setSelectedLogementId] = useState<string>(
    preselectedLogementId || db.logements.find((l) => l.statut === 'occupe')?.id || ''
  );
  const [periodeMois, setPeriodeMois] = useState<number>(currentMonth);
  const [periodeAnnee, setPeriodeAnnee] = useState<number>(currentYear);
  const [mode, setMode] = useState<PaymentMethod>('especes');
  const [transactionIdOperateur, setTransactionIdOperateur] = useState<string>('');
  const [montant, setMontant] = useState<number>(0);
  const [selectedNrId, setSelectedNrId] = useState<string>('');
  const [sendSms, setSendSms] = useState<boolean>(true);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<Paiement | null>(null);
  const [showFicheModal, setShowFicheModal] = useState<boolean>(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState<boolean>(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  // Sync montant when selectedLogementId changes
  React.useEffect(() => {
    if (selectedLogementId) {
      const log = db.logements.find((l) => l.id === selectedLogementId);
      if (log) {
        setMontant(log.loyerMensuel);
        if (log.numeroReceptionPrefereId) {
          setSelectedNrId(log.numeroReceptionPrefereId);
        }
      }
    }
  }, [selectedLogementId, db.logements]);

  if (!isOpen) return null;

  const selectedLogement = db.logements.find((l) => l.id === selectedLogementId);
  const selectedBien = db.biens.find((b) => b.id === selectedLogement?.bienId);
  const activeBail = db.baux.find((b) => b.logementId === selectedLogementId);
  const locataire = db.locataires.find((loc) => loc.id === activeBail?.locataireId);
  const proprietaire = db.proprietaires[0];

  const receptionNumbers = db.numerosReception.filter(
    (nr) => nr.proprietaireId === proprietaire.id && nr.actif
  );

  // Contrôles anti-doublon et avertissement second paiement
  const warnCheck = activeBail
    ? checkSecondPaymentWarning(db, activeBail.id, periodeMois, periodeAnnee)
    : { hasExistingPayment: false, existingPayments: [] };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedLogement || !activeBail || !locataire || !proprietaire) return;

    if (warnCheck.hasExistingPayment && !duplicateConfirmed) {
      setErrorMsg(
        'Un paiement a déjà été enregistré pour cette période. Cochez la confirmation ci-dessous s\'il s\'agit d\'un complément ou versement partiel.'
      );
      return;
    }

    // Anti-doublon ID transaction opérateur
    if (transactionIdOperateur.trim()) {
      const dup = checkDuplicateTransactionId(db, proprietaire.id, transactionIdOperateur);
      if (dup.isDuplicate) {
        setErrorMsg(
          `Cet identifiant de transaction (${transactionIdOperateur.trim()}) a déjà été utilisé pour un autre paiement. Veuillez vérifier votre relevé.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Numéro de quittance officiel continu
      const numeroQuittance = LocalStorageManager.getNextQuittanceNumber(db);

      // Trouver ou créer l'échéance correspondante
      let echeance = db.echeances.find(
        (ech) =>
          ech.bailId === activeBail.id &&
          ech.periodeMois === periodeMois &&
          ech.periodeAnnee === periodeAnnee
      );

      if (!echeance) {
        echeance = {
          id: `ech_${Date.now()}`,
          bailId: activeBail.id,
          logementId: selectedLogement.id,
          locataireId: locataire.id,
          proprietaireId: proprietaire.id,
          periodeMois,
          periodeAnnee,
          montantDu: selectedLogement.loyerMensuel,
          montantPaye: 0,
          referenceCourte: `LY-${Math.floor(1000 + Math.random() * 9000)}`,
          statut: 'a_payer',
          dateEcheance: `${periodeAnnee}-${String(periodeMois).padStart(2, '0')}-05`,
          tokenLienPublic: `tk_${Date.now()}`,
          tokenExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        db.echeances.push(echeance);
      }

      // 2. Création du paiement confirmé
      const tempPaymentForCert: Paiement = {
        id: `pay_${Date.now()}`,
        bailId: activeBail.id,
        logementId: selectedLogement.id,
        locataireId: locataire.id,
        proprietaireId: proprietaire.id,
        echeanceId: echeance.id,
        numeroReceptionId: mode !== 'especes' ? selectedNrId || receptionNumbers[0]?.id : undefined,
        periodeMois,
        periodeAnnee,
        montant,
        mode,
        date: new Date().toISOString(),
        enregistreParRole: activeRole,
        enregistreParNom:
          activeRole === 'collecteur'
            ? 'Collecteur de terrain'
            : proprietaire.nom,
        source: activeRole,
        statut: 'confirme',
        confirmeParNom: activeRole === 'collecteur' ? 'Collecteur' : proprietaire.nom,
        confirmeParRole: activeRole,
        dateConfirmation: new Date().toISOString(),
        transactionIdOperateur: transactionIdOperateur.trim() || undefined,
        referenceTransaction: transactionIdOperateur.trim() || (mode === 'especes' ? `ESP-${Date.now().toString().slice(-6)}` : undefined),
        numeroQuittance,
        synchronise: true,
        smsEnvoye: sendSms,
      };

      // 3. Certificat numérique d'intégrité & QR Code
      const certData = await createDigitalCertificate(
        tempPaymentForCert,
        selectedLogement,
        locataire,
        proprietaire
      );

      const newPayment: Paiement = {
        ...tempPaymentForCert,
        certificatId: certData.certificatId,
        signatureNumerique: certData.signatureNumerique,
        dateCertification: certData.dateCertification,
      };

      // 4. Recalcul de l'échéance (gestion du solde restant et paiements partiels)
      const existingPayments = db.paiements.filter(
        (p) => p.echeanceId === echeance?.id && p.statut === 'confirme'
      );
      const allConfirmed = [...existingPayments, newPayment];
      const recalculated = recalculateEcheanceStatus(echeance, allConfirmed);

      echeance.montantPaye = recalculated.montantPaye;
      echeance.statut = recalculated.statut;

      // 5. Journal d'audit
      db.journalPaiements.unshift({
        id: `jrn_${Date.now()}`,
        paiementId: newPayment.id,
        action: 'confirmation',
        auteurNom: activeRole === 'collecteur' ? 'Collecteur' : proprietaire.nom,
        auteurRole: activeRole,
        date: new Date().toISOString(),
        details: {
          montant,
          mode,
          transactionId: transactionIdOperateur,
          echeanceRef: echeance.referenceCourte,
        },
      });

      // 6. Envoi SMS au locataire si coché
      if (sendSms) {
        const lang: Language = locataire.langue || 'fr';
        await activeSmsProvider.sendSms({
          destinataire: locataire.telephone,
          destinataireNom: locataire.nom,
          type: 'quittance',
          langue: lang,
          contenu: `Loyo : Reçu de loyer ${numeroQuittance} de ${formatCurr(montant)} pour ${selectedLogement.libelle} bien reçu. Certificat : ${certData.certificatId}. Merci.`,
          referencePaiementId: newPayment.id,
        });
      }

      onPaymentSaved(newPayment);
      setSuccessPayment(newPayment);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de l\'encaissement : ' + (err?.message || 'Inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!successPayment || !activeBail || !selectedLogement || !selectedBien || !locataire || !proprietaire) return;

    setSharingWhatsApp(true);
    setWhatsAppNotice(null);

    try {
      const res = await sendQuittanceWithPdfViaWhatsApp({
        paiement: successPayment,
        bail: activeBail,
        logement: selectedLogement,
        bien: selectedBien,
        locataire,
        proprietaire,
        currency: country.currencySymbol,
      });

      if (res.mode === 'native_share') {
        setWhatsAppNotice('Quittance PDF partagée avec succès vers WhatsApp !');
      } else {
        setWhatsAppNotice('Fiche de quittance PDF téléchargée. Vous pouvez la joindre dans WhatsApp.');
      }
    } catch (err: any) {
      setWhatsAppNotice('Erreur lors du partage : ' + (err?.message || 'Inconnue'));
    } finally {
      setSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto animate-in fade-in duration-150">
        {/* Top Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Banknote className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Encaissement Direct</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-800">
                  {country.flag} {country.name}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Paiement direct en espèces ou Mobile Money reçu du locataire
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rappel Loyo ne touche pas l'argent */}
        <div className="bg-amber-500/10 border-b border-amber-300/60 p-2.5 px-5 text-xs text-amber-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Loyo ne reçoit pas l'argent : vous confirmez avoir encaissé directement ce loyer.
          </span>
        </div>

        {/* Success View */}
        {successPayment ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">
                Loyer Encaissé & Confirmé !
              </h3>
              <p className="text-xs text-stone-500 font-mono">
                Quittance N° <strong className="text-emerald-800">{successPayment.numeroQuittance}</strong>
              </p>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 text-left text-xs space-y-2 border border-stone-200">
              <div className="flex justify-between">
                <span className="text-stone-500">Locataire :</span>
                <strong className="text-stone-800">{locataire?.nom}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Logement :</span>
                <span className="font-medium text-stone-800">{selectedLogement?.libelle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Montant :</span>
                <strong className="text-emerald-800 font-mono text-sm">
                  {formatCurr(successPayment.montant)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Mode :</span>
                <span className="font-semibold uppercase text-stone-700">{successPayment.mode}</span>
              </div>
              {successPayment.certificatId && (
                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-stone-500 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Certificat Numérique :</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {successPayment.certificatId}
                  </span>
                </div>
              )}
            </div>

            {whatsAppNotice && (
              <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900 text-left">
                {whatsAppNotice}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setShowFicheModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Afficher la Fiche de Quittance officielle</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                disabled={sharingWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {sharingWhatsApp ? 'Préparation WhatsApp...' : 'Envoyer par WhatsApp (avec Quittance PDF)'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
              >
                Fermer
              </button>
            </div>

            {showFicheModal && (
              <ReceiptCertificateModal
                isOpen={showFicheModal}
                onClose={() => setShowFicheModal(false)}
                paiement={successPayment}
                bail={activeBail}
                logement={selectedLogement}
                bien={selectedBien}
                locataire={locataire}
                proprietaire={proprietaire}
                currency={country.currencySymbol}
              />
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {warnCheck.hasExistingPayment && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Paiement déjà existant pour cette période</span>
                </div>
                <p className="text-[11px]">
                  Un versement de {formatCurr(warnCheck.existingPayments[0].montant)} a déjà été enregistré. S'agit-il d'un paiement partiel complémentaire ?
                </p>
                <label className="flex items-center gap-2 cursor-pointer font-bold pt-1">
                  <input
                    type="checkbox"
                    checked={duplicateConfirmed}
                    onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                    className="rounded border-amber-400 text-emerald-600"
                  />
                  <span>Confirmer l'ajout de ce versement complémentaire</span>
                </label>
              </div>
            )}

            {/* Sélection du Logement */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Logement occupé *
              </label>
              <select
                value={selectedLogementId}
                onChange={(e) => setSelectedLogementId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium focus:outline-none focus:border-emerald-600 text-xs"
                required
              >
                {db.logements
                  .filter((l) => l.statut === 'occupe')
                  .map((log) => {
                    const bail = db.baux.find((b) => b.logementId === log.id);
                    const loc = db.locataires.find((lc) => lc.id === bail?.locataireId);
                    return (
                      <option key={log.id} value={log.id}>
                        {log.libelle} — {loc ? loc.nom : 'Sans locataire'} ({formatCurr(log.loyerMensuel)})
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Période & Montant */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Mois réglé</label>
                <select
                  value={periodeMois}
                  onChange={(e) => setPeriodeMois(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium focus:outline-none focus:border-emerald-600 text-xs"
                >
                  {MOIS_FR.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m} {periodeAnnee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Montant encaissé ({country.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={montant}
                  onChange={(e) => setMontant(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            {/* Mode d'encaissement direct */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1.5">
                Mode de règlement direct *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('especes')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    mode === 'especes'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>Espèces direct</span>
                </button>

                {country.paymentMethods
                  .filter((pm) => pm.type === 'mobile_money')
                  .slice(0, 5)
                  .map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setMode(pm.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        mode === pm.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-stone-600" />
                      <span className="truncate">{pm.label.split(' ')[0]}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Numéro de réception et ID de transaction opérateur */}
            {mode !== 'especes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Compte de réception utilisé
                  </label>
                  <select
                    value={selectedNrId}
                    onChange={(e) => setSelectedNrId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-xs focus:outline-none focus:border-emerald-600"
                  >
                    {receptionNumbers.map((nr) => (
                      <option key={nr.id} value={nr.id}>
                        {nr.operateur.toUpperCase()} - {nr.numero} ({nr.nomAffiche})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    ID Transaction Opérateur (Anti-doublon)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ATM-261021-98421"
                    value={transactionIdOperateur}
                    onChange={(e) => setTransactionIdOperateur(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-xs uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            {/* SMS Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sendSmsDirect"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="sendSmsDirect" className="text-stone-700 cursor-pointer text-xs">
                Générer la quittance certifiée et envoyer un reçu SMS au locataire
              </label>
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Validation...' : 'Confirmer l\'encaissement direct'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
