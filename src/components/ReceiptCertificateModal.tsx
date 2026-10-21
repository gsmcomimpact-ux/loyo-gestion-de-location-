import React, { useState, useEffect } from 'react';
import { Paiement, Bail, Logement, Bien, Locataire, Proprietaire } from '../types';
import { formatMoney, formatDate, getMonthName, montantEnLettres, formatPhoneNumber } from '../utils/formatters';
import { generateQuittancePDF } from '../services/pdfService';
import { createDigitalCertificate, CertificateData } from '../services/certificateService';
import { sendQuittanceWithPdfViaWhatsApp, ShareWhatsAppResult } from '../services/whatsappService';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  User,
  Building2,
  MessageCircle,
  Paperclip,
} from 'lucide-react';

interface ReceiptCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  paiement: Paiement | null;
  bail?: Bail | null;
  logement?: Logement | null;
  bien?: Bien | null;
  locataire?: Locataire | null;
  proprietaire?: Proprietaire | null;
  currency?: string;
}

export const ReceiptCertificateModal: React.FC<ReceiptCertificateModalProps> = ({
  isOpen,
  onClose,
  paiement,
  bail,
  logement,
  bien,
  locataire,
  proprietaire,
  currency = 'FCFA',
}) => {
  const [copied, setCopied] = useState(false);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<ShareWhatsAppResult | null>(null);

  // Fallback defaults if props are not fully passed
  const currentBail: Bail = bail || {
    id: paiement?.bailId || 'bail_default',
    logementId: paiement?.logementId || 'log_default',
    locataireId: paiement?.locataireId || 'loc_default',
    proprietaireId: paiement?.proprietaireId || 'prop_default',
    dateDebut: '2026-01-01',
    loyer: paiement?.montant || 35000,
    cautionVersee: 70000,
    avanceVersee: 35000,
    dateLimiteDeclaration: '2026-04-01',
    statutDeclaration: 'validee',
  };

  const currentLogement: Logement = logement || {
    id: currentBail.logementId,
    bienId: 'bien_default',
    libelle: 'Logement principal',
    type: 'chambre-salon',
    loyerMensuel: paiement?.montant || 35000,
    caution: 70000,
    statut: 'occupe',
  };

  const currentBien: Bien = bien || {
    id: currentLogement.bienId,
    proprietaireId: currentBail.proprietaireId,
    nom: 'Résidence',
    adresse: 'Centre-ville',
    ville: 'Dakar',
    commune: 'Plateau',
    zoneId: 'zone_1',
    dateCreation: '2026-01-01',
  };

  const currentLocataire: Locataire = locataire || {
    id: currentBail.locataireId,
    nom: 'Locataire',
    telephone: '+221 77 123 45 67',
    langue: 'fr',
    logementId: currentLogement.id,
    dateEntree: '2026-01-01',
    jourEcheance: 5,
    cautionVersee: 70000,
    statut: 'actif',
  };

  const currentProprio: Proprietaire = proprietaire || {
    id: currentBail.proprietaireId,
    nom: 'Propriétaire',
    telephone: '+221 77 000 00 00',
    ville: currentBien.ville || 'Dakar',
    langue: 'fr',
    formule: 'bailleur',
    dateInscription: '2026-01-01',
  };

  // Nom du locataire mis en valeur
  const tenantName = currentLocataire?.nom || 'LOCATAIRE';
  const tenantPhone = currentLocataire?.telephone || '';

  // Generate certificate data on mount or payment change
  useEffect(() => {
    if (!paiement) return;
    let isMounted = true;
    createDigitalCertificate(paiement, currentLogement, currentLocataire, currentProprio).then(
      (data) => {
        if (isMounted) {
          setCertData(data);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [paiement?.id, currentLogement.id, currentLocataire.id, currentProprio.id]);

  if (!isOpen || !paiement) return null;

  const handleCopyId = () => {
    const idToCopy = certData?.certificatId || paiement.certificatId || '';
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const doc = await generateQuittancePDF(
        paiement,
        currentBail,
        currentLogement,
        currentBien,
        currentLocataire,
        currentProprio,
        certData || undefined,
        currency
      );
      const sanitizedTenant = currentLocataire.nom.replace(/[^a-zA-Z0-9à-öø-ÿÀ-ÖØ-ß]/g, '_');
      doc.save(`Quittance_${paiement.numeroQuittance}_${sanitizedTenant}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsAppWithPDF = async () => {
    if (!currentBail || !currentLogement || !currentBien || !currentLocataire || !currentProprio) return;
    setSharingWhatsApp(true);
    try {
      const result = await sendQuittanceWithPdfViaWhatsApp({
        paiement,
        bail: currentBail,
        logement: currentLogement,
        bien: currentBien,
        locataire: currentLocataire,
        proprietaire: currentProprio,
        certData: certData || undefined,
        currency,
      });
      setWhatsAppFeedback(result);
    } catch (err: any) {
      console.error('Erreur partage WhatsApp:', err);
      setWhatsAppFeedback({
        success: false,
        mode: 'cancelled',
        fileName: `Quittance_${paiement.numeroQuittance}.pdf`,
        tenantName,
        error: err?.message || 'Erreur lors de la préparation de la quittance',
      });
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const montantLettresTexte = montantEnLettres(paiement.montant, currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Barre supérieure d'action (Non imprimée) */}
        <div className="no-print bg-stone-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>Fiche de Quittance</span>
                <span className="font-mono bg-emerald-900/90 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] border border-emerald-700/60">
                  {paiement.numeroQuittance}
                </span>
                <span className="bg-emerald-800/90 text-white font-black px-2 py-0.5 rounded-full text-[11px] border border-emerald-600 truncate max-w-[200px]">
                  👤 {tenantName}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                Reçu officiel · Certificat Numérique Unique & QR Code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition border border-stone-700"
              title="Imprimer directement la quittance"
            >
              <Printer className="w-3.5 h-3.5 text-stone-300" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification feedback après envoi WhatsApp */}
        {whatsAppFeedback && whatsAppFeedback.success && (
          <div className="no-print bg-green-50 border-b border-green-200 p-3 text-xs text-green-900 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {whatsAppFeedback.mode === 'native_share'
                    ? 'Partage direct WhatsApp lancé avec succès !'
                    : 'Quittance PDF téléchargée & WhatsApp ouvert !'}
                </p>
                <p className="text-green-800 text-[11px] mt-0.5">
                  {whatsAppFeedback.mode === 'native_share' ? (
                    <>
                      Le fichier PDF <strong>{whatsAppFeedback.fileName}</strong> a été transmis dans le partage pour le locataire <strong>{whatsAppFeedback.tenantName}</strong>.
                    </>
                  ) : (
                    <>
                      Le fichier <strong>{whatsAppFeedback.fileName}</strong> a été téléchargé sur votre appareil. Dans WhatsApp, cliquez sur l'icône <strong>Trombone 📎</strong> ou <strong>+</strong> pour joindre ce PDF à <strong>{whatsAppFeedback.tenantName}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setWhatsAppFeedback(null)}
              className="text-green-700 hover:text-green-900 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Corps de la Fiche de Quittance (Imprimable et épuré) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-stone-50/50 text-stone-900 print:p-0 print:bg-white print:overflow-visible">
          {/* Liseré supérieur sobre */}
          <div className="h-1 w-full rounded-full bg-emerald-700" />

          {/* En-tête épuré avec juste le titre (conformément à la demande du client) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reçu Officiel · Décharge Libératoire de Paiement</span>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-emerald-950 tracking-tight uppercase">
              FICHE DE QUITTANCE DE LOYER
            </h1>

            <p className="text-xs text-stone-500 font-medium max-w-md mx-auto mt-1">
              Délivrée pour valoir quittance et décharge du montant acquitté au titre du bail
            </p>

            {/* Numéro et date officielle */}
            <div className="mt-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-600 font-semibold">Quittance N° :</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {paiement.numeroQuittance}
                </span>
              </div>
              <div className="text-[11px] text-stone-600">
                Délivrée le <strong>{formatDate(paiement.date)}</strong> à{' '}
                <strong>{currentBien?.ville || 'Dakar'}</strong>
              </div>
            </div>
          </div>

          {/* BANDEAU TRÈS VISIBLE DU LOCATAIRE (Nom du locataire mis en évidence) */}
          <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-emerald-50 border-2 border-emerald-600/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span>Locataire Bénéficiaire en Titre</span>
                  <span className="bg-emerald-200 text-emerald-900 text-[9px] px-1.5 py-0.2 rounded font-black">
                    PRENEUR
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-tight">
                  {tenantName}
                </div>
                <div className="text-xs text-stone-600 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                  <span>Tél : <strong>{formatPhoneNumber(tenantPhone)}</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>Logement : <strong className="text-stone-800">{currentLogement?.libelle}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paiement Soldé</span>
              </span>
            </div>
          </div>

          {/* Cartouches : Bailleur & Locataire face-à-face */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cartouche Bailleur */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Bailleur / Propriétaire</span>
              </div>
              <div className="font-bold text-stone-900 text-xs sm:text-sm">
                {currentProprio?.nom}
              </div>
              <div className="text-[11px] text-stone-600 font-mono">
                Tél : {formatPhoneNumber(currentProprio?.telephone)}
              </div>
              <div className="text-[10px] text-stone-500">
                Ville : {currentProprio?.ville || currentBien?.ville || 'Dakar'}
              </div>
            </div>

            {/* Cartouche Locataire */}
            <div className="bg-emerald-50/40 p-3.5 rounded-xl border-2 border-emerald-400/80 shadow-xs space-y-1">
              <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Locataire / Preneur</span>
                </div>
                <span className="text-[9px] font-bold bg-emerald-200/90 text-emerald-900 px-1.5 py-0.5 rounded">
                  Titulaire
                </span>
              </div>
              <div className="font-black text-emerald-950 text-sm sm:text-base">
                {tenantName}
              </div>
              <div className="text-[11px] text-stone-700 font-mono">
                Tél : {formatPhoneNumber(tenantPhone)}
              </div>
              <div className="text-[10px] text-stone-600 flex justify-between pt-0.5">
                <span>Échéance : le {currentLocataire?.jourEcheance || 5} du mois</span>
                <span className="capitalize font-semibold text-stone-700">
                  Langue : {currentLocataire?.langue || 'Français'}
                </span>
              </div>
            </div>
          </div>

          {/* Désignation du Logement */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs text-xs space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
              Désignation du Logement Loué
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="font-bold text-stone-900">
                {currentLogement?.libelle} ·{' '}
                <span className="font-semibold text-emerald-800">
                  Typologie : {currentLogement?.type}
                </span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                Bail d'habitation régulier
              </div>
            </div>
            <div className="text-[11px] text-stone-600">
              Immeuble / Concession : <strong>{currentBien?.nom || 'Immeuble'}</strong> —{' '}
              {currentBien?.adresse}, Commune de {currentBien?.commune || 'Centre'}, Ville de {currentBien?.ville || 'Dakar'}
            </div>
          </div>

          {/* Tableau du Décompte Financier de la Quittance */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden text-xs">
            <div className="bg-stone-100/80 px-4 py-2 border-b border-stone-200 font-bold text-stone-700 flex justify-between text-[11px] uppercase tracking-wide">
              <span>Désignation des Sommes</span>
              <span>Période / Modalité</span>
              <span>Montant</span>
            </div>

            <div className="divide-y divide-stone-100 p-0">
              <div className="px-4 py-2.5 flex justify-between items-center">
                <div>
                  <div className="font-bold text-stone-900">
                    Loyer mensuel principal nu ({currentLogement?.type})
                  </div>
                  <div className="text-[10px] text-stone-500">
                    Droit d'usage exclusif des lieux loués par <strong>{tenantName}</strong>
                  </div>
                </div>
                <div className="text-[11px] text-stone-600 font-medium">
                  {getMonthName(paiement.periodeMois)} {paiement.periodeAnnee}
                </div>
                <div className="font-mono font-bold text-stone-900">
                  {formatMoney(paiement.montant, currency)}
                </div>
              </div>

              <div className="px-4 py-2 flex justify-between items-center text-stone-500 text-[11px]">
                <span>Charges locatives récupérables & entretien commun</span>
                <span>Incluses / Sans supplément</span>
                <span className="font-mono font-semibold">0 {currency}</span>
              </div>

              <div className="px-4 py-3 bg-emerald-50/60 flex justify-between items-center border-t border-emerald-200 text-stone-900">
                <div>
                  <div className="text-xs font-black uppercase text-emerald-900">
                    Montant Total Encaissé
                  </div>
                  <div className="text-[10px] text-stone-500">
                    Règlement par {paiement.mode.toUpperCase()}{' '}
                    {paiement.referenceTransaction ? `(Réf : ${paiement.referenceTransaction})` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                    {formatMoney(paiement.montant, currency)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700">
                    Solde dû : 0 {currency} (Soldé)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cadre obligatoire de Déclaration Légale avec NOM DU LOCATAIRE en toutes lettres */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 text-xs space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
              <span>Déclaration de Règlement et Quitus Libératoire</span>
              <span className="font-mono text-amber-800">Décharge Certifiée</span>
            </div>

            <div className="text-xs text-stone-800 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-amber-100">
              Je soussigné(e) <strong>{currentProprio?.nom}</strong>, bailleur / mandataire du logement{' '}
              <strong>{currentLogement?.libelle}</strong> ({currentBien?.nom}), certifie avoir reçu de{' '}
              <strong className="text-emerald-900 bg-emerald-100/80 px-1.5 py-0.5 rounded font-black border border-emerald-200">
                M./Mme {tenantName}
              </strong>
              , locataire en titre, la somme de{' '}
              <strong className="font-bold text-stone-900 font-mono">{formatMoney(paiement.montant, currency)}</strong>{' '}
              (soit en toutes lettres : <em>« {montantLettresTexte} »</em>) au titre du loyer pour la période de{' '}
              <strong>{getMonthName(paiement.periodeMois)} {paiement.periodeAnnee}</strong>.
            </div>

            <div className="text-[10px] text-stone-500 flex justify-between items-center flex-wrap gap-1 pt-1 border-t border-amber-200/60">
              <span>Encaissé par : <strong>{paiement.enregistreParNom}</strong> ({paiement.enregistreParRole})</span>
              <span>Dépôt de garantie détenu : <strong>{formatMoney(currentLocataire?.cautionVersee, currency)}</strong></span>
            </div>
          </div>

          {/* Mentions Légales et Clause d'Usage */}
          <div className="text-[10px] text-stone-500 text-center italic leading-tight px-2">
            « Le paiement de la présente quittance n'emporte pas renonciation aux loyers antérieurs qui demeureraient impayés. Quittance délivrée sous réserve de tous droits et actions. Annule tout reçu d'acompte antérieur pour cette même période. »
          </div>

          {/* Bloc Bas : Certificat Numérique Unique (QR) & Cachet Électronique Officiel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Certificat Numérique Unique avec QR Code */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Certificat Numérique Unique</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Immuable
                </span>
              </div>

              <div className="flex items-center gap-3">
                {certData?.qrDataUrl ? (
                  <div className="p-1 bg-white rounded-lg border border-emerald-200 shadow-xs shrink-0">
                    <img
                      src={certData.qrDataUrl}
                      alt="QR Code Quittance Officielle"
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-stone-100 rounded-lg flex items-center justify-center text-[10px] text-stone-400">
                    Génération QR...
                  </div>
                )}

                <div className="text-[10px] space-y-1 min-w-0 flex-1">
                  <div className="text-stone-500 font-semibold">Identifiant du Certificat :</div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-stone-900 text-[11px] truncate">
                      {certData?.certificatId || paiement.certificatId || 'CERT-VALIDE'}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded transition shrink-0"
                      title="Copier le code certificat"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-[9px] text-stone-500 truncate">
                    Hash SHA-256 : <span className="font-mono">{certData?.signatureNumerique.slice(0, 14)}...</span>
                  </div>
                  <p className="text-[9px] text-emerald-800 leading-tight">
                    Scannable par toute caméra pour vérification officielle instantanée.
                  </p>
                </div>
              </div>
            </div>

            {/* Cachet & Signature du Bailleur */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-2">
              <div className="text-[10px] font-bold uppercase text-stone-600 flex justify-between">
                <span>Cachet & Visa du Bailleur</span>
                <span className="text-[9px] font-semibold text-emerald-800">Délivré à {tenantName}</span>
              </div>

              {/* Tampon certifié */}
              <div className="bg-emerald-50/70 border-2 border-dashed border-emerald-600/60 rounded-xl p-2.5 text-center space-y-0.5">
                <div className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  Loyo
                </div>
                <div className="text-[9px] font-semibold text-stone-600">
                  RÉGIE LOCATIVE NUMÉRIQUE CERTIFIÉE
                </div>
                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest py-0.5">
                  ★ CERTIFIÉ PAYÉ ★
                </div>
                <div className="text-[9px] text-stone-500 font-mono">
                  Signé le {formatDate(paiement.date)}
                </div>
              </div>

              <div className="text-right text-[10px] text-stone-500 italic pr-2">
                Fait à {currentBien?.ville || 'Dakar'}
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'Actions Inférieure (Non imprimée) */}
        <div className="no-print bg-white p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Bouton Téléchargement PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{downloading ? 'Génération...' : 'Télécharger PDF avec QR'}</span>
            </button>

            {/* Bouton ENVOI PAR WHATSAPP AVEC PDF JOINT */}
            {currentLocataire && currentLogement && currentProprio && (
              <button
                onClick={handleSendWhatsAppWithPDF}
                disabled={sharingWhatsApp}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                title="Joindre le document PDF et envoyer par WhatsApp au locataire"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <Paperclip className="w-3.5 h-3.5 text-green-200" />
                <span>
                  {sharingWhatsApp ? 'Préparation PDF...' : 'Envoyer par WhatsApp (avec PDF joint)'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
