import React, { useState } from 'react';
import {
  AppDatabase,
  Paiement,
  Echeance,
  NumeroReception,
  PaymentMethod,
} from '../../types';
import { formatDate, getMonthName } from '../../utils/formatters';
import { generateQuittancePDF } from '../../services/pdfService';
import { activeSmsProvider } from '../../services/smsProvider';
import { ReceiptCertificateModal } from '../ReceiptCertificateModal';
import { VerifyCertificateModal } from '../VerifyCertificateModal';
import { sendQuittanceWithPdfViaWhatsApp } from '../../services/whatsappService';
import { useCountry } from '../../contexts/CountryContext';
import { LocalStorageManager } from '../../services/storage';
import { createDigitalCertificate } from '../../services/certificateService';
import {
  buildEcheanceSmsContent,
  getPreferredReceptionNumber,
  getTenantPaymentUrl,
  recalculateEcheanceStatus,
} from '../../services/echeanceService';
import { SmsPasteModal } from '../SmsPasteModal';
import { RejectPaymentModal } from '../RejectPaymentModal';
import { ReceptionNumbersModal } from '../ReceptionNumbersModal';
import { TenantPublicPayModal } from '../TenantPublicPayModal';
import {
  Banknote,
  Search,
  Download,
  FileText,
  Send,
  Plus,
  Smartphone,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  MessageCircle,
  User,
  Paperclip,
  CreditCard,
  X,
  Sparkles,
  ClipboardPaste,
  AlertTriangle,
  History,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface PaymentsViewProps {
  db: AppDatabase;
  onOpenQuickPay: (logementId?: string) => void;
  onSmsSent: () => void;
  onDbUpdated: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  db,
  onOpenQuickPay,
  onSmsSent,
  onDbUpdated,
}) => {
  const { country, formatMoney } = useCountry();
  const proprietaire = db.proprietaires[0];

  const [activeSubTab, setActiveSubTab] = useState<'confirmes' | 'a_confirmer' | 'echeances' | 'journal'>('confirmes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [selectedCertPaiement, setSelectedCertPaiement] = useState<Paiement | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [sharingWhatsAppId, setSharingWhatsAppId] = useState<string | null>(null);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  // Modals state
  const [isSmsPasteOpen, setIsSmsPasteOpen] = useState(false);
  const [isReceptionNumbersOpen, setIsReceptionNumbersOpen] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState<Paiement | null>(null);
  const [publicPayEcheance, setPublicPayEcheance] = useState<Echeance | null>(null);
  const [copiedEchId, setCopiedEchId] = useState<string | null>(null);

  // Paiements en attente de confirmation
  const pendingPayments = db.paiements.filter((p) => p.statut === 'en_attente_confirmation');
  const confirmedPayments = db.paiements.filter((p) => p.statut === 'confirme');

  const filteredPayments = (activeSubTab === 'a_confirmer' ? pendingPayments : confirmedPayments).filter((p) => {
    const locataire = db.locataires.find((l) => l.id === p.locataireId);
    const logement = db.logements.find((l) => l.id === p.logementId);
    const matchesSearch =
      (locataire?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (logement?.libelle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.numeroQuittance || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.transactionIdOperateur || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.certificatId && p.certificatId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMode = filterMode === 'all' || p.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  // Action rapide de confirmation d'un paiement en attente
  const handleFastConfirm = async (paiement: Paiement) => {
    const locataire = db.locataires.find((l) => l.id === paiement.locataireId);
    const logement = db.logements.find((l) => l.id === paiement.logementId);
    const bien = db.biens.find((b) => b.id === logement?.bienId);
    const bail = db.baux.find((b) => b.id === paiement.bailId);

    if (!locataire || !logement || !bien || !bail) return;

    try {
      // 1. Numéro de quittance officiel continu
      const numeroQuittance = LocalStorageManager.getNextQuittanceNumber(db);
      const now = new Date().toISOString();

      paiement.numeroQuittance = numeroQuittance;
      paiement.statut = 'confirme';
      paiement.confirmeParNom = proprietaire.nom;
      paiement.confirmeParRole = 'proprietaire';
      paiement.dateConfirmation = now;

      // 2. Certificat numérique d'intégrité
      const cert = await createDigitalCertificate(paiement, logement, locataire, proprietaire);
      paiement.certificatId = cert.certificatId;
      paiement.signatureNumerique = cert.signatureNumerique;
      paiement.dateCertification = cert.dateCertification;

      // 3. Mise à jour de l'échéance
      let echeance = db.echeances.find((e) => e.id === paiement.echeanceId);
      if (echeance) {
        const confirmedForEch = db.paiements.filter((p) => p.echeanceId === echeance?.id && p.statut === 'confirme');
        const recalculated = recalculateEcheanceStatus(echeance, confirmedForEch);
        echeance.montantPaye = recalculated.montantPaye;
        echeance.statut = recalculated.statut;
      }

      // 4. Audit
      db.journalPaiements.unshift({
        id: `jrn_${Date.now()}`,
        paiementId: paiement.id,
        action: 'confirmation',
        auteurNom: proprietaire.nom,
        auteurRole: 'proprietaire',
        date: now,
        details: {
          montant: paiement.montant,
          mode: paiement.mode,
          transactionId: paiement.transactionIdOperateur,
          echeanceRef: echeance?.referenceCourte,
        },
      });

      // 5. Envoi SMS quittance au locataire
      const smsText = `Loyo : Votre paiement de ${formatMoney(paiement.montant)} a été confirmé par votre bailleur. Quittance officielle N° ${numeroQuittance}. Certificat : ${cert.certificatId}. Merci !`;
      await activeSmsProvider.sendSms({
        destinataire: locataire.telephone,
        destinataireNom: locataire.nom,
        type: 'quittance',
        langue: locataire.langue || 'fr',
        contenu: smsText,
        referencePaiementId: paiement.id,
      });

      LocalStorageManager.saveDB(db);
      onDbUpdated();
      onSmsSent();
      setWhatsAppNotice(`Paiement de ${locataire.nom} confirmé ! Quittance N° ${numeroQuittance} émise.`);
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors de la confirmation : ' + (err?.message || 'Inconnue'));
    }
  };

  const handleDownloadQuittance = async (paiement: Paiement) => {
    const bail = db.baux.find((b) => b.id === paiement.bailId);
    const logement = db.logements.find((l) => l.id === paiement.logementId);
    const bien = db.biens.find((b) => b.id === logement?.bienId);
    const locataire = db.locataires.find((l) => l.id === paiement.locataireId);

    if (!bail || !logement || !bien || !locataire || !proprietaire) return;

    const doc = await generateQuittancePDF(
      paiement,
      bail,
      logement,
      bien,
      locataire,
      proprietaire,
      undefined,
      country.currencySymbol
    );
    const sanitizedTenant = locataire.nom.replace(/[^a-zA-Z0-9à-öø-ÿÀ-ÖØ-ß]/g, '_');
    doc.save(`Quittance_${paiement.numeroQuittance}_${sanitizedTenant}.pdf`);
  };

  const handleSendWhatsAppWithPdf = async (paiement: Paiement) => {
    const bail = db.baux.find((b) => b.id === paiement.bailId);
    const logement = db.logements.find((l) => l.id === paiement.logementId);
    const bien = db.biens.find((b) => b.id === logement?.bienId);
    const locataire = db.locataires.find((l) => l.id === paiement.locataireId);

    if (!bail || !logement || !bien || !locataire || !proprietaire) return;

    setSharingWhatsAppId(paiement.id);
    setWhatsAppNotice(null);

    try {
      const res = await sendQuittanceWithPdfViaWhatsApp({
        paiement,
        bail,
        logement,
        bien,
        locataire,
        proprietaire,
        currency: country.currencySymbol,
      });

      if (res.mode === 'native_share') {
        setWhatsAppNotice(`Quittance PDF partagée vers WhatsApp pour ${locataire.nom} !`);
      } else {
        setWhatsAppNotice(`PDF téléchargé. Joignez ce fichier dans WhatsApp à ${locataire.nom}.`);
      }
    } catch (err: any) {
      setWhatsAppNotice('Erreur lors du partage : ' + (err?.message || 'Inconnue'));
    } finally {
      setSharingWhatsAppId(null);
    }
  };

  // Envoi SMS de rappel officiel selon la spécification
  const handleSendEcheanceReminderSms = async (ech: Echeance) => {
    const loc = db.locataires.find((l) => l.id === ech.locataireId);
    const log = db.logements.find((l) => l.id === ech.logementId);
    if (!loc || !log) return;

    const nr = getPreferredReceptionNumber(db, log, proprietaire.id);
    const smsContent = buildEcheanceSmsContent({
      locataire: loc,
      logement: log,
      echeance: ech,
      numeroReception: nr,
      currency: country.currencySymbol,
    });

    await activeSmsProvider.sendSms({
      destinataire: loc.telephone,
      destinataireNom: loc.nom,
      type: 'rappel',
      langue: loc.langue || 'fr',
      contenu: smsContent,
    });

    db.messagesSMS.unshift({
      id: `sms_ech_${Date.now()}`,
      destinataire: loc.telephone,
      destinataireNom: loc.nom,
      type: 'rappel',
      langue: loc.langue || 'fr',
      contenu: smsContent,
      statutEnvoi: 'envoye',
      date: new Date().toISOString(),
    });

    LocalStorageManager.saveDB(db);
    onSmsSent();
    setWhatsAppNotice(`SMS de paiement direct et lien court envoyés à ${loc.nom} !`);
  };

  const handleCopyLink = (ech: Echeance) => {
    const url = getTenantPaymentUrl(ech);
    navigator.clipboard.writeText(url);
    setCopiedEchId(ech.id);
    setTimeout(() => setCopiedEchId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header avec actions principales */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-stone-900">Encaissement & Quittances</h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Paiement Direct Propriétaire
            </span>
            <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
              {country.flag} {country.currencySymbol}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Validation des versements directs, analyse des SMS opérateurs et délivrance des quittances certifiées
          </p>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Coller SMS opérateur */}
          <button
            onClick={() => setIsSmsPasteOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            title="Coller un SMS de confirmation reçu de votre opérateur"
          >
            <ClipboardPaste className="w-4 h-4 text-emerald-400" />
            <span>Coller un SMS opérateur</span>
          </button>

          {/* Encaisser en direct */}
          <button
            onClick={() => onOpenQuickPay()}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Encaisser en direct</span>
          </button>

          {/* Mes Numéros de Réception */}
          <button
            onClick={() => setIsReceptionNumbersOpen(true)}
            className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-1.5 border border-stone-200 transition"
            title="Gérer vos comptes Mobile Money de réception"
          >
            <Smartphone className="w-3.5 h-3.5 text-stone-600" />
            <span>Numéros de réception</span>
          </button>
        </div>
      </div>

      {/* AVERTISSEMENT CAPITAL : LOYO NE REÇOIT PAS VOTRE ARGENT */}
      <div className="bg-amber-500/10 border border-amber-300/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-sm text-amber-900 block">
              Loyo ne reçoit pas votre argent : vous payez directement votre propriétaire.
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed max-w-3xl">
              L'application n'encaisse rien, ne détient aucun fonds et n'effectue aucun virement. Elle indique au locataire quoi payer et où, enregistre et fait confirmer le paiement, puis émet la quittance officielle.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const demoPendingEch = db.echeances.find((e) => e.statut === 'signale_par_locataire') || db.echeances[0];
            setPublicPayEcheance(demoPendingEch);
          }}
          className="py-2 px-3 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-100 font-semibold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Aperçu portail locataire</span>
        </button>
      </div>

      {/* Notification feedback */}
      {whatsAppNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{whatsAppNotice}</span>
          </div>
          <button onClick={() => setWhatsAppNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Onglets Spécifiques */}
      <div className="flex items-center gap-1 border-b border-stone-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('confirmes')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'confirmes'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Paiements Confirmés ({confirmedPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('a_confirmer')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'a_confirmer'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Paiements à Confirmer</span>
          {pendingPayments.length > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {pendingPayments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('echeances')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'echeances'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Échéances de Loyer ({db.echeances.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('journal')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'journal'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Journal d'Audit ({db.journalPaiements.length})</span>
        </button>
      </div>

      {/* CONTENU ONGLET 1 & 2 : PAIEMENTS CONFIRMÉS OU À CONFIRMER */}
      {(activeSubTab === 'confirmes' || activeSubTab === 'a_confirmer') && (
        <div className="space-y-4">
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par locataire, ID transaction ou N° de quittance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0 overflow-x-auto w-full sm:w-auto scrollbar-none text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterMode('especes')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'especes' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-stone-600'
                }`}
              >
                Espèces
              </button>
              <button
                onClick={() => setFilterMode('airtel_money')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'airtel_money' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-stone-600'
                }`}
              >
                Airtel
              </button>
              <button
                onClick={() => setFilterMode('moov_flooz')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'moov_flooz' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-stone-600'
                }`}
              >
                Flooz / Moov
              </button>
              <button
                onClick={() => setFilterMode('wave')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'wave' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-stone-600'
                }`}
              >
                Wave
              </button>
            </div>
          </div>

          {/* Table des Paiements */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">N° Quittance / Statut</th>
                    <th className="py-3 px-4">Locataire & Logement</th>
                    <th className="py-3 px-4">Période</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4">Opérateur & Réf.</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        {activeSubTab === 'a_confirmer'
                          ? 'Aucun paiement en attente de confirmation.'
                          : 'Aucun paiement trouvé pour cette recherche.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const locataire = db.locataires.find((l) => l.id === p.locataireId);
                      const logement = db.logements.find((l) => l.id === p.logementId);

                      return (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4">
                            {p.statut === 'confirme' ? (
                              <div>
                                <button
                                  onClick={() => setSelectedCertPaiement(p)}
                                  className="font-mono font-bold text-emerald-800 text-xs hover:underline text-left block cursor-pointer"
                                  title="Cliquer pour afficher la Fiche de Quittance officielle"
                                >
                                  {p.numeroQuittance}
                                </button>
                                {p.certificatId && (
                                  <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5 inline-flex items-center gap-1">
                                    <QrCode className="w-2.5 h-2.5" />
                                    <span>{p.certificatId}</span>
                                  </div>
                                )}
                              </div>
                            ) : p.statut === 'en_attente_confirmation' ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>À Confirmer</span>
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-700" />
                                <span>Rejeté</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-black text-stone-900 text-xs sm:text-sm tracking-tight">
                                  {locataire?.nom || 'Locataire'}
                                </div>
                                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                                  <span>{logement?.libelle}</span>
                                  <span className="text-stone-300">•</span>
                                  <span className="font-mono text-stone-600">{locataire?.telephone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-medium text-stone-700">
                            {getMonthName(p.periodeMois)} {p.periodeAnnee}
                            <div className="text-[10px] text-stone-400">
                              {p.statut === 'confirme' ? `Reçu le ${formatDate(p.date)}` : `Signalé le ${formatDate(p.date)}`}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-black text-stone-900 tabular-nums text-xs sm:text-sm">
                            {formatMoney(p.montant)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold uppercase text-[11px] flex items-center gap-1.5">
                              {p.mode === 'especes' ? (
                                <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5 text-blue-700" />
                              )}
                              <span>{p.mode.replace('_', ' ')}</span>
                            </div>
                            {(p.transactionIdOperateur || p.referenceTransaction) && (
                              <div className="text-[10px] font-mono text-stone-500 font-bold truncate max-w-[150px]">
                                ID: {p.transactionIdOperateur || p.referenceTransaction}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="capitalize font-semibold text-stone-700 text-[11px] block">
                              {p.source}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {p.enregistreParNom}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {p.statut === 'en_attente_confirmation' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleFastConfirm(p)}
                                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-2xs"
                                  title="Confirmer l'encaissement et émettre la quittance"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Confirmer</span>
                                </button>
                                <button
                                  onClick={() => setRejectingPayment(p)}
                                  className="py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition border border-red-200"
                                  title="Rejeter avec motif obligatoire"
                                >
                                  Rejeter
                                </button>
                              </div>
                            ) : p.statut === 'confirme' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedCertPaiement(p)}
                                  className="py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 font-semibold text-xs flex items-center gap-1 transition border border-stone-200"
                                  title="Consulter la Fiche de Quittance officielle"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Quittance</span>
                                </button>

                                <button
                                  onClick={() => handleDownloadQuittance(p)}
                                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
                                  title="Télécharger la Quittance PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSendWhatsAppWithPdf(p)}
                                  disabled={sharingWhatsAppId === p.id}
                                  className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition"
                                  title="Envoyer la quittance par WhatsApp avec PDF joint"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-red-700 font-medium">
                                {p.motifRejet || 'Rejeté par le propriétaire'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3 : ÉCHÉANCES DE LOYER */}
      {activeSubTab === 'echeances' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Suivi des Échéances & Liens de Paiement</h2>
              <p className="text-stone-500">
                Chaque échéance dispose d'une référence unique (ex: LY-4827) et d'un lien sécurisé sans compte pour le locataire.
              </p>
            </div>
            <div className="text-[11px] text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              Les relances s'arrêtent dès qu'un paiement est signalé.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Réf. & Période</th>
                    <th className="py-3 px-4">Locataire & Logement</th>
                    <th className="py-3 px-4">Montant Dû</th>
                    <th className="py-3 px-4">Déjà Réglé</th>
                    <th className="py-3 px-4">Statut de l'Échéance</th>
                    <th className="py-3 px-4 text-right">Actions Locataire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {db.echeances.map((ech) => {
                    const loc = db.locataires.find((l) => l.id === ech.locataireId);
                    const log = db.logements.find((l) => l.id === ech.logementId);
                    const reste = Math.max(0, ech.montantDu - ech.montantPaye);

                    return (
                      <tr key={ech.id} className="hover:bg-stone-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-emerald-900 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {ech.referenceCourte}
                          </span>
                          <div className="text-[10px] text-stone-500 mt-1">
                            {getMonthName(ech.periodeMois)} {ech.periodeAnnee}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{loc?.nom}</div>
                          <div className="text-[11px] text-stone-500 font-mono">{loc?.telephone}</div>
                          <div className="text-[10px] text-stone-400">{log?.libelle}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-stone-900">
                          {formatMoney(ech.montantDu)}
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-emerald-800">
                          {formatMoney(ech.montantPaye)}
                          {ech.montantPaye > 0 && ech.montantPaye < ech.montantDu && (
                            <span className="text-[10px] text-amber-700 block font-normal">
                              Reste : {formatMoney(reste)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {ech.statut === 'paye' ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Soldé</span>
                            </span>
                          ) : ech.statut === 'paye_partiellement' ? (
                            <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Payé partiellement
                            </span>
                          ) : ech.statut === 'signale_par_locataire' ? (
                            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Signalé par locataire (En pause)</span>
                            </span>
                          ) : ech.statut === 'en_retard' ? (
                            <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              En retard
                            </span>
                          ) : (
                            <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              À payer
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Envoyer SMS avec lien et référence */}
                            <button
                              onClick={() => handleSendEcheanceReminderSms(ech)}
                              className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1 border border-emerald-200 transition"
                              title="Envoyer SMS officiel avec référence et lien"
                            >
                              <Send className="w-3 h-3" />
                              <span>Envoyer SMS</span>
                            </button>

                            {/* Copier le lien court */}
                            <button
                              onClick={() => handleCopyLink(ech)}
                              className="py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1"
                              title="Copier le lien public sans compte"
                            >
                              {copiedEchId === ech.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-stone-500" />
                              )}
                              <span>{copiedEchId === ech.id ? 'Copié' : 'Lien'}</span>
                            </button>

                            {/* Ouvrir le portail locataire */}
                            <button
                              onClick={() => setPublicPayEcheance(ech)}
                              className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                              title="Aperçu portail locataire"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4 : JOURNAL D'AUDIT */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between text-xs">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Journal d'Audit des Validations & Rejets</h2>
              <p className="text-stone-500">
                Traçabilité complète : qui a confirmé ou rejeté chaque versement, à quelle date, et pour quel motif.
              </p>
            </div>
            <span className="bg-stone-100 text-stone-700 font-mono px-2.5 py-1 rounded-lg">
              {db.journalPaiements.length} événements
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-stone-100 text-xs">
              {db.journalPaiements.map((log) => {
                const isConf = log.action === 'confirmation';
                const isRej = log.action === 'rejet';

                return (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isConf
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRej
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isConf ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isRej ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold uppercase text-[10px] px-2 py-0.2 rounded ${
                              isConf
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isRej
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="font-bold text-stone-900">{log.auteurNom}</span>
                          <span className="text-[10px] text-stone-400 capitalize font-mono">
                            ({log.auteurRole})
                          </span>
                        </div>

                        {log.details && (
                          <div className="text-[11px] text-stone-600 font-mono">
                            Montant : <strong>{formatMoney(log.details.montant)}</strong> · Mode : {log.details.mode}
                            {log.details.transactionId && ` · ID Trans : ${log.details.transactionId}`}
                            {log.details.echeanceRef && ` · Réf : ${log.details.echeanceRef}`}
                          </div>
                        )}

                        {log.motifRejet && (
                          <div className="text-xs text-red-800 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                            <strong>Motif du rejet :</strong> {log.motifRejet}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono shrink-0 self-start sm:self-center">
                      {formatDate(log.date)} {log.date.slice(11, 16)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedCertPaiement && (
        <ReceiptCertificateModal
          isOpen={Boolean(selectedCertPaiement)}
          onClose={() => setSelectedCertPaiement(null)}
          paiement={selectedCertPaiement}
          bail={db.baux.find((b) => b.id === selectedCertPaiement.bailId)}
          logement={db.logements.find((l) => l.id === selectedCertPaiement.logementId)}
          bien={db.biens.find((b) => b.id === db.logements.find((l) => l.id === selectedCertPaiement.logementId)?.bienId)}
          locataire={db.locataires.find((l) => l.id === selectedCertPaiement.locataireId)}
          proprietaire={proprietaire}
          currency={country.currencySymbol}
        />
      )}

      {isSmsPasteOpen && (
        <SmsPasteModal
          isOpen={isSmsPasteOpen}
          onClose={() => setIsSmsPasteOpen(false)}
          db={db}
          onPaymentConfirmed={(newPay, updatedEch) => {
            db.paiements.unshift(newPay);
            const idx = db.echeances.findIndex((e) => e.id === updatedEch.id);
            if (idx >= 0) db.echeances[idx] = updatedEch;
            LocalStorageManager.saveDB(db);
            onDbUpdated();
            setWhatsAppNotice(`Paiement de ${formatMoney(newPay.montant)} validé avec succès par SMS !`);
          }}
        />
      )}

      {isReceptionNumbersOpen && (
        <ReceptionNumbersModal
          isOpen={isReceptionNumbersOpen}
          onClose={() => setIsReceptionNumbersOpen(false)}
          db={db}
          onNumeroUpdated={(list) => {
            db.numerosReception = list;
            LocalStorageManager.saveDB(db);
            onDbUpdated();
          }}
        />
      )}

      {rejectingPayment && (
        <RejectPaymentModal
          isOpen={Boolean(rejectingPayment)}
          onClose={() => setRejectingPayment(null)}
          paiement={rejectingPayment}
          db={db}
          onPaymentRejected={(rejPay, updEch) => {
            const pIdx = db.paiements.findIndex((p) => p.id === rejPay.id);
            if (pIdx >= 0) db.paiements[pIdx] = rejPay;
            const eIdx = db.echeances.findIndex((e) => e.id === updEch.id);
            if (eIdx >= 0) db.echeances[eIdx] = updEch;
            LocalStorageManager.saveDB(db);
            onDbUpdated();
            onSmsSent();
            setWhatsAppNotice(`Paiement rejeté. Le locataire a été informé par SMS.`);
          }}
        />
      )}

      {publicPayEcheance && (
        <TenantPublicPayModal
          isOpen={Boolean(publicPayEcheance)}
          onClose={() => setPublicPayEcheance(null)}
          echeance={publicPayEcheance}
          db={db}
          onPaymentReported={(newPay, updEch) => {
            db.paiements.unshift(newPay);
            const eIdx = db.echeances.findIndex((e) => e.id === updEch.id);
            if (eIdx >= 0) db.echeances[eIdx] = updEch;
            LocalStorageManager.saveDB(db);
            onDbUpdated();
            setWhatsAppNotice(`Paiement de ${formatMoney(newPay.montant)} signalé par le locataire ! En attente de votre confirmation.`);
          }}
        />
      )}
    </div>
  );
};
