import QRCode from 'qrcode';
import { Paiement, Bail, Logement, Locataire, Proprietaire, AppDatabase } from '../types';
import { formatFCFA, formatDate, getMonthName } from '../utils/formatters';

export interface CertificateData {
  certificatId: string;
  signatureNumerique: string;
  dateCertification: string;
  qrPayload: string;
  qrDataUrl: string;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  certificatId?: string;
  numeroQuittance?: string;
  paiement?: Paiement;
  locataire?: Locataire;
  logement?: Logement;
  proprietaire?: Proprietaire;
  datePaiement?: string;
  montant?: number;
  mode?: string;
  signature?: string;
}

/**
 * Calcul d'une empreinte numérique hexadécimale (hash SHA-256 ou FNV-1a étendu)
 */
export async function computeReceiptHash(input: string): Promise<string> {
  // Use Web Crypto API if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return hashHex.toUpperCase();
    } catch {
      // Fallback below
    }
  }

  // Fast deterministic hash fallback
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  const part2 = (4294967296 * (2097151 & h1) + (h2 >>> 0)).toString(16).padStart(16, '0');
  return (part1 + part2).toUpperCase();
}

/**
 * Génère le certificat numérique unique et le QR code associé
 */
export async function createDigitalCertificate(
  paiement: Paiement,
  logement: Logement,
  locataire: Locataire,
  proprietaire: Proprietaire
): Promise<CertificateData> {
  const dateCertification = paiement.dateCertification || new Date().toISOString();

  // Empreinte unique basée sur les données immuables de la quittance
  const canonicalString = [
    'RÉPUBLIQUE DU NIGER',
    'DÉCRET LOYERS AVRIL 2026',
    paiement.numeroQuittance,
    paiement.montant.toString(),
    paiement.periodeMois.toString(),
    paiement.periodeAnnee.toString(),
    paiement.mode,
    locataire.nom,
    locataire.telephone,
    logement.libelle,
    proprietaire.nom,
    paiement.date,
  ].join('|');

  const fullHash = await computeReceiptHash(canonicalString);
  const shortId = fullHash.slice(0, 8);
  const certificatId = paiement.certificatId || `CERT-NIG-2026-${shortId.slice(0, 4)}-${shortId.slice(4, 8)}`;
  const signatureNumerique = fullHash;

  // URL ou payload scannable par tout smartphone
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://loyo.app';
  const qrPayload = `${origin}/?verify=${certificatId}&quittance=${encodeURIComponent(paiement.numeroQuittance)}&sig=${signatureNumerique.slice(0, 12)}`;

  // Génération du QR Code Data URL haute résolution
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 256,
    color: {
      dark: '#0D5C3A', // Vert officiel
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  return {
    certificatId,
    signatureNumerique,
    dateCertification,
    qrPayload,
    qrDataUrl,
  };
}

/**
 * Vérification d'un certificat par son identifiant ou numéro de quittance
 */
export function verifyReceiptCertificate(
  query: string,
  db: AppDatabase
): VerificationResult {
  const clean = query.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'Veuillez saisir un numéro de certificat ou de quittance.' };
  }

  // Chercher par certificatId, numeroQuittance ou signature
  const paiement = db.paiements.find(
    (p) =>
      p.numeroQuittance.toUpperCase() === clean ||
      (p.certificatId && p.certificatId.toUpperCase() === clean) ||
      (p.signatureNumerique && p.signatureNumerique.toUpperCase().startsWith(clean))
  );

  if (!paiement) {
    return {
      isValid: false,
      message: `Aucune quittance officielle trouvée pour la référence "${clean}". Le document n'a pas été émis ou a été falsifié.`,
    };
  }

  const locataire = db.locataires.find((l) => l.id === paiement.locataireId);
  const logement = db.logements.find((l) => l.id === paiement.logementId);
  const proprietaire = db.proprietaires[0];

  return {
    isValid: true,
    message: 'Certificat Numérique Authentique & Valide. Quittance enregistrée au registre sécurisé Loyo.',
    certificatId: paiement.certificatId || `CERT-NIG-2026-${paiement.numeroQuittance.slice(-4)}`,
    numeroQuittance: paiement.numeroQuittance,
    paiement,
    locataire,
    logement,
    proprietaire,
    datePaiement: paiement.date,
    montant: paiement.montant,
    mode: paiement.mode,
    signature: paiement.signatureNumerique,
  };
}
