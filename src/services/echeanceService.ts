import {
  Echeance,
  Paiement,
  NumeroReception,
  AppDatabase,
  Bail,
  Locataire,
  Logement,
  Proprietaire,
} from '../types';

/**
 * Génère une référence d'échéance courte et unique (ex: KZ-4827 ou LY-4827)
 */
export function generateShortReference(existingRefs: string[] = []): string {
  const letters = 'LY';
  for (let i = 0; i < 50; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const ref = `${letters}-${num}`;
    if (!existingRefs.includes(ref)) {
      return ref;
    }
  }
  return `${letters}-${Date.now().toString().slice(-4)}`;
}

/**
 * Génère un jeton public unique non devinable avec expiration (30 jours par défaut)
 */
export function generatePublicToken(expiresInDays: number = 30): { token: string; expiresAt: string } {
  const randomPart1 = Math.random().toString(36).substring(2, 12);
  const randomPart2 = Math.random().toString(36).substring(2, 12);
  const timestamp = Date.now().toString(36);
  const token = `tk_${timestamp}_${randomPart1}${randomPart2}`;

  const expDate = new Date();
  expDate.setDate(expDate.getDate() + expiresInDays);

  return {
    token,
    expiresAt: expDate.toISOString(),
  };
}

/**
 * Vérifie si le jeton d'échéance est valide et non expiré
 */
export function isTokenValid(echeance: Echeance): boolean {
  if (!echeance.tokenLienPublic) return false;
  if (!echeance.tokenExpiresAt) return true;
  return new Date(echeance.tokenExpiresAt).getTime() > Date.now();
}

/**
 * Construit le lien public de paiement pour le locataire
 */
export function getTenantPaymentUrl(echeance: Echeance): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://loyo.app';
  return `${origin}/?pay=${encodeURIComponent(echeance.tokenLienPublic)}`;
}

/**
 * Contrôle anti-doublon d'ID de transaction opérateur :
 * Refuse un même ID de transaction deux fois pour un même propriétaire
 */
export function checkDuplicateTransactionId(
  db: AppDatabase,
  proprietaireId: string,
  transactionId: string,
  currentPaymentId?: string
): { isDuplicate: boolean; conflictingPayment?: Paiement } {
  if (!transactionId || !transactionId.trim()) {
    return { isDuplicate: false };
  }

  const clean = transactionId.trim().toUpperCase();

  const found = db.paiements.find((p) => {
    if (p.id === currentPaymentId) return false;
    if (p.proprietaireId !== proprietaireId) return false;
    if (p.statut === 'rejete') return false; // les paiements rejetés ne bloquent pas
    const opId = (p.transactionIdOperateur || p.referenceTransaction || '').trim().toUpperCase();
    return opId === clean;
  });

  return {
    isDuplicate: Boolean(found),
    conflictingPayment: found,
  };
}

/**
 * Alerte en cas de second paiement tenté pour la même période et le même bail
 */
export function checkSecondPaymentWarning(
  db: AppDatabase,
  bailId: string,
  mois: number,
  annee: number,
  currentPaymentId?: string
): { hasExistingPayment: boolean; existingPayments: Paiement[] } {
  const existing = db.paiements.filter((p) => {
    if (p.id === currentPaymentId) return false;
    if (p.bailId !== bailId) return false;
    if (p.periodeMois !== mois || p.periodeAnnee !== annee) return false;
    return p.statut === 'confirme' || p.statut === 'en_attente_confirmation';
  });

  return {
    hasExistingPayment: existing.length > 0,
    existingPayments: existing,
  };
}

/**
 * Calcule le statut et le solde restant d'une échéance en fonction des paiements confirmés et signalés
 */
export function recalculateEcheanceStatus(
  echeance: Echeance,
  paiementsDeEcheance: Paiement[]
): {
  statut: Echeance['statut'];
  montantPaye: number;
  resteDu: number;
} {
  // Paiements validés / confirmés
  const confirmedPayments = paiementsDeEcheance.filter((p) => p.statut === 'confirme');
  const montantPaye = confirmedPayments.reduce((sum, p) => sum + p.montant, 0);
  const resteDu = Math.max(0, echeance.montantDu - montantPaye);

  // Vérifier s'il y a un paiement en attente signalé par le locataire
  const hasPendingReported = paiementsDeEcheance.some(
    (p) => p.statut === 'en_attente_confirmation'
  );

  let statut: Echeance['statut'];

  if (resteDu <= 0) {
    statut = 'paye';
  } else if (hasPendingReported) {
    // Les relances s'arrêtent dès qu'un paiement est signalé par le locataire
    statut = 'signale_par_locataire';
  } else if (montantPaye > 0) {
    statut = 'paye_partiellement';
  } else {
    // Vérifier si la date d'échéance est dépassée
    const today = new Date().toISOString().split('T')[0];
    if (today > echeance.dateEcheance) {
      statut = 'en_retard';
    } else {
      statut = 'a_payer';
    }
  }

  return { statut, montantPaye, resteDu };
}

/**
 * Trouve le numéro de réception par défaut ou préféré pour un logement
 */
export function getPreferredReceptionNumber(
  db: AppDatabase,
  logement: Logement,
  proprietaireId: string
): NumeroReception | undefined {
  if (logement.numeroReceptionPrefereId) {
    const pref = db.numerosReception.find(
      (nr) => nr.id === logement.numeroReceptionPrefereId && nr.actif
    );
    if (pref) return pref;
  }

  // Fallback sur le numéro par défaut du propriétaire
  const defaultNr = db.numerosReception.find(
    (nr) => nr.proprietaireId === proprietaireId && nr.actif && nr.parDefaut
  );
  if (defaultNr) return defaultNr;

  // Fallback sur n'importe quel numéro actif
  return db.numerosReception.find(
    (nr) => nr.proprietaireId === proprietaireId && nr.actif
  );
}

/**
 * Génère le texte SMS officiel de notification d'échéance selon les spécifications :
 * « Loyer [mois] : [montant]. Payez à [Nom] au [numéro] ([opérateur]). Réf. : LY-4827. Après paiement, confirmez ici : [lien court] »
 */
export function buildEcheanceSmsContent({
  locataire,
  logement,
  echeance,
  numeroReception,
  currency = 'FCFA',
}: {
  locataire: Locataire;
  logement: Logement;
  echeance: Echeance;
  numeroReception?: NumeroReception;
  currency?: string;
}): string {
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const moisLibelle = moisNoms[echeance.periodeMois - 1];
  const payUrl = getTenantPaymentUrl(echeance);
  const reste = Math.max(0, echeance.montantDu - echeance.montantPaye);

  const recipientPart = numeroReception
    ? `Payez à ${numeroReception.nomAffiche} au ${numeroReception.numero} (${numeroReception.operateur.toUpperCase()}).`
    : `Payez directement à votre propriétaire.`;

  return `Loyer ${moisLibelle} (${logement.libelle}) : ${reste.toLocaleString()} ${currency}. ${recipientPart} Réf. : ${echeance.referenceCourte}. Après paiement, confirmez ici : ${payUrl}`;
}
