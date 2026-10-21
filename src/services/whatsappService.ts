import { Paiement, Bail, Logement, Bien, Locataire, Proprietaire } from '../types';
import { formatMoney, formatDate, getMonthName, formatPhoneNumber, cleanPhoneForWhatsApp } from '../utils/formatters';
import { generateQuittancePDF } from './pdfService';
import { CertificateData } from './certificateService';

export interface WhatsAppMessageOptions {
  telephone: string;
  texte: string;
}

export interface ShareWhatsAppResult {
  success: boolean;
  mode: 'native_share' | 'download_and_web' | 'cancelled';
  fileName: string;
  tenantName: string;
  error?: string;
}

/**
 * Nettoie le numéro de téléphone pour WhatsApp
 */
export function cleanNigerPhoneForWhatsApp(phone: string): string {
  return cleanPhoneForWhatsApp(phone, '+221');
}

/**
 * Génère le lien direct WhatsApp (wa.me) universel
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

/**
 * Vérifie si le navigateur supporte le partage direct de fichiers PDF vers WhatsApp
 */
export function canShareFilesDirectly(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Génère le texte officiel d'une quittance de paiement pour WhatsApp avec nom du locataire et mention de la pièce jointe PDF
 */
export function formatQuittanceWhatsAppMessage(
  paiement: Paiement,
  logement: Logement,
  locataire: Locataire,
  proprietaire: Proprietaire,
  pdfAttached: boolean = true,
  currency: string = 'FCFA'
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://loyo.app';
  const certId = paiement.certificatId || 'CERT-VALIDE';
  const verifyLink = `${origin}/?verify=${encodeURIComponent(certId)}`;

  return `*QUITTANCE DE LOYER OFFICIELLE & CERTIFIÉE — LOYO* 🏛️
Bonjour *${locataire.nom}*,

Nous vous confirmons la bonne réception et l'encaissement intégral de votre loyer pour le logement loué.

👤 *LOCATAIRE BÉNÉFICIAIRE* : *${locataire.nom.toUpperCase()}*
📋 *DÉTAILS DU RÈGLEMENT* :
• N° Quittance : *${paiement.numeroQuittance}*
• Montant reçu : *${formatMoney(paiement.montant, currency)}* (Solde restant : 0 ${currency})
• Période réglée : *${getMonthName(paiement.periodeMois)} ${paiement.periodeAnnee}*
• Logement loué : *${logement.libelle}* (${logement.type})
• Date d'encaissement : *${formatDate(paiement.date)}*
• Mode de règlement : *${paiement.mode.toUpperCase()}*${paiement.referenceTransaction ? ` (Réf: ${paiement.referenceTransaction})` : ''}
• Bailleur en titre : *${proprietaire.nom}* (${formatPhoneNumber(proprietaire.telephone)})

${pdfAttached ? `📄 *DOCUMENT PDF JOINT :*
La Fiche de Quittance officielle imprimable (avec QR Code de certification et cachet numérique) est jointe à cet envoi pour valoir quittance définitive.\n` : ''}
🔐 *CERTIFICAT NUMÉRIQUE UNIQUE D'INTÉGRITÉ* :
• Identifiant unique : *${certId}*
• Vérification de validité en ligne : ${verifyLink}

Merci pour votre sérieux et ponctualité !`;
}

/**
 * Envoie la quittance par WhatsApp EN JOIGNANT DIRECTEMENT LE FICHIER PDF :
 * 1. Sur Smartphone Android / iPhone (PWA) : Déclenche le partage natif (Web Share API)
 *    qui joint le fichier PDF directement dans WhatsApp avec le message officiel !
 * 2. Sur PC ou navigateur sans support Web Share avec fichiers :
 *    Télécharge automatiquement la quittance PDF sur l'appareil ET ouvre WhatsApp avec le message pré-rempli.
 */
export async function sendQuittanceWithPdfViaWhatsApp({
  paiement,
  bail,
  logement,
  bien,
  locataire,
  proprietaire,
  certData,
  currency = 'FCFA',
}: {
  paiement: Paiement;
  bail: Bail;
  logement: Logement;
  bien: Bien;
  locataire: Locataire;
  proprietaire: Proprietaire;
  certData?: CertificateData;
  currency?: string;
}): Promise<ShareWhatsAppResult> {
  const sanitizedTenant = locataire.nom.replace(/[^a-zA-Z0-9à-öø-ÿÀ-ÖØ-ß]/g, '_');
  const fileName = `Quittance_${paiement.numeroQuittance}_${sanitizedTenant}.pdf`;
  const messageText = formatQuittanceWhatsAppMessage(paiement, logement, locataire, proprietaire, true, currency);

  // 1. Génération du document PDF certifié avec QR Code
  const doc = await generateQuittancePDF(
    paiement,
    bail,
    logement,
    bien,
    locataire,
    proprietaire,
    certData,
    currency
  );

  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  // 2. Vérification si le partage natif de fichiers est supporté (Smartphones Android / iOS / etc.)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `Quittance de Loyer ${paiement.numeroQuittance} - ${locataire.nom}`,
        text: messageText,
        files: [pdfFile],
      });
      return {
        success: true,
        mode: 'native_share',
        fileName,
        tenantName: locataire.nom,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // L'utilisateur a fermé la boîte de dialogue de partage sans choisir d'application
        return {
          success: false,
          mode: 'cancelled',
          fileName,
          tenantName: locataire.nom,
        };
      }
      console.warn('Fallback after Web Share error:', err);
    }
  }

  // 3. Repli Desktop / Navigateurs sans partage natif de fichier :
  // Télécharger le PDF automatiquement sur le disque de l'utilisateur
  doc.save(fileName);

  // Ouvrir WhatsApp avec le message préparé
  const waUrl = getWhatsAppUrl(locataire.telephone, messageText);
  window.open(waUrl, '_blank', 'noopener,noreferrer');

  return {
    success: true,
    mode: 'download_and_web',
    fileName,
    tenantName: locataire.nom,
  };
}

/**
 * Génère le texte de rappel ou de relance pour WhatsApp
 */
export function formatRelanceWhatsAppMessage(
  locataire: Locataire,
  logement: Logement,
  loyer: number,
  joursRetard: number,
  currency: string = 'FCFA'
): string {
  return `*RAPPEL DE LOYER — LOYO* ⚠️
Bonjour *${locataire.nom}*,

Votre loyer pour le logement *${logement.libelle}* d'un montant de *${formatMoney(loyer, currency)}* présente actuellement *${joursRetard} jours de retard* (échéance convenue le ${locataire.jourEcheance} du mois).

Merci de bien vouloir procéder à la régularisation dans les meilleurs délais (en espèces ou Mobile Money).

Merci pour votre diligence.`;
}

/**
 * Génère le texte de rappel préventif (J-3) pour WhatsApp
 */
export function formatRappelPreventifWhatsAppMessage(
  locataire: Locataire,
  logement: Logement,
  loyer: number,
  currency: string = 'FCFA'
): string {
  return `*AVIS D'ÉCHÉANCE PRÉVENTIF — LOYO* 📅
Bonjour *${locataire.nom}*,

Nous vous rappelons que votre loyer mensuel de *${formatMoney(loyer, currency)}* pour *${logement.libelle}* arrivera à échéance le *${locataire.jourEcheance} de ce mois*.

Règlements acceptés : Espèces auprès du bailleur ou de son collecteur de terrain, ou Mobile Money local.

Merci pour votre ponctualité !`;
}
