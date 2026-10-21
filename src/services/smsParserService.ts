import { PaymentMethod, Echeance, AppDatabase, Locataire, Logement } from '../types';

export interface ParsedSmsResult {
  success: boolean;
  montant?: number;
  expediteur?: string;
  transactionId?: string;
  operateur?: PaymentMethod;
  dateDetection?: string;
  rawText: string;
  matchingEcheanceId?: string;
  matchingLocataireId?: string;
  confidenceScore: number; // 0 à 100
  notes: string[];
}

/**
 * Analyse intelligente d'un SMS de confirmation d'opérateur mobile money
 */
export function parseOperatorSms(
  smsText: string,
  db: AppDatabase,
  preferredLandlordId?: string
): ParsedSmsResult {
  const text = smsText.trim();
  const notes: string[] = [];

  if (!text) {
    return {
      success: false,
      rawText: text,
      confidenceScore: 0,
      notes: ['Texte SMS vide'],
    };
  }

  // 1. Détection de l'Opérateur
  let detectedOperator: PaymentMethod = 'autre';
  const lower = text.toLowerCase();

  if (lower.includes('wave')) {
    detectedOperator = 'wave';
  } else if (lower.includes('airtel') || lower.includes('airtelmoney')) {
    detectedOperator = 'airtel_money';
  } else if (lower.includes('flooz') || lower.includes('moov flooz')) {
    detectedOperator = 'moov_flooz';
  } else if (lower.includes('moov') || lower.includes('moov money')) {
    detectedOperator = 'moov_money';
  } else if (lower.includes('zamani')) {
    detectedOperator = 'zamani_cash';
  } else if (lower.includes('orange') || lower.includes('orangemoney')) {
    detectedOperator = 'orange_money';
  } else if (lower.includes('mtn') || lower.includes('momo')) {
    detectedOperator = 'mtn_momo';
  } else if (lower.includes('free money')) {
    detectedOperator = 'free_money';
  } else if (lower.includes('tmoney')) {
    detectedOperator = 'tmoney';
  } else if (lower.includes('mpesa') || lower.includes('m-pesa')) {
    detectedOperator = 'mpesa';
  } else if (lower.includes('celtiis')) {
    detectedOperator = 'celtiis_cash';
  }

  // 2. Détection du Montant
  // Cherche des patterns comme :
  // "recu 35 000 FCFA", "recu 35000 FCFA", "reçu 35000F", "transfert de 50 000", "paiement de 25000"
  let detectedMontant: number | undefined;

  const montantRegexes = [
    /(?:re[çc]u|recue|montant(?:\s*de)?|transfert(?:\s*de)?|paiement(?:\s*de)?|versement(?:\s*de)?|cr[eé]dit[eé](?:\s*de)?)\s*[:=]?\s*([0-9\s]{2,10})\s*(?:fcfa|xof|xaf|gnf|usd|cdf|f|eur|\$)/i,
    /([0-9\s]{2,10})\s*(?:fcfa|xof|xaf|gnf)\s*(?:de|par|depuis)/i,
    /(?:solde|balance)?[^0-9]*([0-9]{1,3}(?:[\s.,][0-9]{3})+|[0-9]{4,8})\s*(?:fcfa|xof|xaf|f\b)/i,
    /([0-9]{4,8})\s*(?:fcfa|xof|xaf|f\b)/i,
  ];

  for (const reg of montantRegexes) {
    const match = text.match(reg);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/[\s.,]/g, '');
      const parsed = parseInt(cleanNum, 10);
      if (!isNaN(parsed) && parsed > 500 && parsed < 10000000) {
        detectedMontant = parsed;
        notes.push(`Montant extrait : ${parsed.toLocaleString()}`);
        break;
      }
    }
  }

  // 3. Détection de l'ID de Transaction / Référence
  let detectedTransactionId: string | undefined;

  const refRegexes = [
    /(?:ref|r[eé]f|id|txid|trans(?:action)?(?:\s*id)?|n[°o])\s*[:=.]?\s*([a-zA-Z0-9.\-_]{5,30})/i,
    /(?:reference|transaction)\s*[:=]\s*([a-zA-Z0-9.\-_]{5,30})/i,
    /\b([A-Z0-9]{2,6}[0-9]{6,12}\.[0-9a-zA-Z.]+)\b/,
    /\b(FLZ[0-9A-Z]+|ATM-[0-9A-Z]+|WV-[0-9A-Z-]+|OM[0-9A-Z.]+)\b/i,
  ];

  for (const reg of refRegexes) {
    const match = text.match(reg);
    if (match && match[1]) {
      detectedTransactionId = match[1].trim();
      notes.push(`ID Transaction extrait : ${detectedTransactionId}`);
      break;
    }
  }

  // 4. Détection de l'Expéditeur / Nom
  let detectedExpediteur: string | undefined;

  const senderRegexes = [
    /(?:de|from|par)\s+([A-ZÀ-ÖØ-ßa-zà-öø-ÿ\s]{3,35})(?:\s*\(|\s*le\b|\s*ref|\s*r[eé]f|\.|$)/i,
    /(?:exp[eé]diteur|tiers)\s*[:=]\s*([A-ZÀ-ÖØ-ßa-zà-öø-ÿ\s]{3,30})/i,
  ];

  for (const reg of senderRegexes) {
    const match = text.match(reg);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filtrer les faux positifs courants
      if (!['un', 'votre', 'compte', 'succes', 'reussi'].includes(candidate.toLowerCase())) {
        detectedExpediteur = candidate;
        notes.push(`Expéditeur extrait : ${detectedExpediteur}`);
        break;
      }
    }
  }

  // 5. Recherche de l'échéance correspondante dans la base de données
  let bestEcheance: Echeance | undefined;
  let bestLocataire: Locataire | undefined;
  let highestScore = 0;

  // Filtrer les échéances non encore soldées
  const activeEcheances = db.echeances.filter(
    (e) => e.statut !== 'paye' && (!preferredLandlordId || e.proprietaireId === preferredLandlordId)
  );

  for (const ech of activeEcheances) {
    let score = 0;
    const locataire = db.locataires.find((l) => l.id === ech.locataireId);
    const resteDu = Math.max(0, ech.montantDu - ech.montantPaye);

    // Score sur le montant (forte correspondance)
    if (detectedMontant) {
      if (detectedMontant === resteDu) {
        score += 45;
      } else if (detectedMontant === ech.montantDu) {
        score += 35;
      } else if (detectedMontant <= ech.montantDu) {
        // Paiement partiel possible
        score += 20;
      }
    }

    // Score sur le nom du locataire dans le SMS
    if (locataire && locataire.nom) {
      const locParts = locataire.nom.toLowerCase().split(/\s+/);
      const matchedParts = locParts.filter((part) => part.length >= 3 && lower.includes(part));
      if (matchedParts.length > 0) {
        score += 40 * (matchedParts.length / locParts.length);
      }

      // Score si le numéro de téléphone du locataire figure dans le texte
      const cleanPhone = locataire.telephone.replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 8 && lower.includes(cleanPhone.slice(-8))) {
        score += 40;
      }
    }

    // Score si la référence courte de l'échéance (ex: LY-4827) figure dans le texte
    if (ech.referenceCourte && lower.includes(ech.referenceCourte.toLowerCase())) {
      score += 60;
    }

    // Score si l'échéance est déjà marquée "signale_par_locataire"
    if (ech.statut === 'signale_par_locataire') {
      score += 15;
    }

    if (score > highestScore) {
      highestScore = score;
      bestEcheance = ech;
      bestLocataire = locataire;
    }
  }

  const confidenceScore = Math.min(100, Math.round(
    (detectedMontant ? 35 : 0) +
    (detectedTransactionId ? 30 : 0) +
    (detectedOperator !== 'autre' ? 15 : 0) +
    (highestScore > 40 ? 20 : 0)
  ));

  return {
    success: Boolean(detectedMontant || detectedTransactionId),
    montant: detectedMontant,
    expediteur: detectedExpediteur,
    transactionId: detectedTransactionId,
    operateur: detectedOperator,
    dateDetection: new Date().toISOString(),
    rawText: text,
    matchingEcheanceId: bestEcheance?.id,
    matchingLocataireId: bestLocataire?.id,
    confidenceScore,
    notes,
  };
}
