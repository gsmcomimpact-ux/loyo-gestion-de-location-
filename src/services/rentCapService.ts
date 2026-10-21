import { HousingType, Plafond, Bail } from '../types';

export interface RentCapCheckResult {
  isApplicable: boolean; // applicable to F2 and F3
  exceedsCap: boolean;
  capAmount?: number;
  difference?: number;
  warningMessage?: string;
  noteVerification?: string;
}

export interface RentIncreaseCheckResult {
  isIncrease: boolean;
  percentage: number;
  exceeds10Percent: boolean;
  requiresImprovementJustification: boolean;
  warningMessage?: string;
}

export interface DeclarationCountdownResult {
  daysLeft: number;
  isOverdue: boolean;
  alertLevel: 'urgent' | 'warning' | 'notice' | 'normal' | 'done';
  badgeText: string;
  description: string;
}

/**
 * Vérification du plafond légal selon la zone et le type de logement (Décret Avril 2026)
 */
export function checkRentCap(
  type: HousingType,
  rentAmount: number,
  zoneId: string,
  ceilings: Plafond[]
): RentCapCheckResult {
  // Le décret cible spécifiquement F2 et F3 (ou autres si configuré par l'admin)
  const isApplicable = type === 'F2' || type === 'F3';
  if (!isApplicable) {
    return { isApplicable: false, exceedsCap: false };
  }

  const matchingCap = ceilings.find(
    (c) => c.zoneId === zoneId && c.typeLogement === type
  );

  if (!matchingCap) {
    return {
      isApplicable: true,
      exceedsCap: false,
      warningMessage: 'Aucun plafond défini pour cette zone et ce type. Table à compléter par l\'administrateur.',
    };
  }

  const exceedsCap = rentAmount > matchingCap.montantMax;
  const difference = rentAmount - matchingCap.montantMax;

  return {
    isApplicable: true,
    exceedsCap,
    capAmount: matchingCap.montantMax,
    difference: exceedsCap ? difference : 0,
    noteVerification: matchingCap.noteVerification,
    warningMessage: exceedsCap
      ? `Ce loyer (${rentAmount.toLocaleString()} FCFA) dépasse le plafond légal de ${matchingCap.montantMax.toLocaleString()} FCFA fixé par le décret d'avril 2026 pour un ${type} dans cette zone.`
      : undefined,
  };
}

/**
 * Contrôle de la hausse de loyer : max 10% et obligation de travaux d'amélioration
 */
export function checkRentIncrease(
  previousRent: number | undefined,
  newRent: number,
  improvementReason?: string
): RentIncreaseCheckResult {
  if (!previousRent || previousRent <= 0 || newRent <= previousRent) {
    return {
      isIncrease: false,
      percentage: 0,
      exceeds10Percent: false,
      requiresImprovementJustification: false,
    };
  }

  const percentage = ((newRent - previousRent) / previousRent) * 100;
  const exceeds10Percent = percentage > 10;
  const hasJustification = !!(improvementReason && improvementReason.trim().length > 5);

  let warningMessage: string | undefined;
  if (exceeds10Percent) {
    warningMessage = `Hausse de ${percentage.toFixed(1)}% (supérieure aux 10% autorisés par le décret d'avril 2026). Une amélioration substantielle du logement est obligatoire pour justifier ce nouveau loyer.`;
  } else if (!hasJustification) {
    warningMessage = `Hausse de ${percentage.toFixed(1)}%. Rappel décret 2026 : toute hausse doit résulter d'une amélioration avérée du logement.`;
  }

  return {
    isIncrease: true,
    percentage,
    exceeds10Percent,
    requiresImprovementJustification: exceeds10Percent || !hasJustification,
    warningMessage,
  };
}

/**
 * Calcul du compte à rebours pour la déclaration du bail à la commune (Obligation 3 mois)
 * Alertes à J-30, J-15 et J-7
 */
export function calculateDeclarationCountdown(bail: Bail): DeclarationCountdownResult {
  if (bail.statutDeclaration === 'validee') {
    return {
      daysLeft: 0,
      isOverdue: false,
      alertLevel: 'done',
      badgeText: 'Validée',
      description: `Déclaration validée par la commune le ${bail.dateDepot || ''}`,
    };
  }

  if (bail.statutDeclaration === 'deposee') {
    return {
      daysLeft: 0,
      isOverdue: false,
      alertLevel: 'done',
      badgeText: 'Déposée',
      description: `Dossier déposé à la commune le ${bail.dateDepot || ''} (N° ${bail.numeroDepotCommune || 'en attente'})`,
    };
  }

  const deadline = new Date(bail.dateLimiteDeclaration);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      daysLeft,
      isOverdue: true,
      alertLevel: 'urgent',
      badgeText: `Retard de ${Math.abs(daysLeft)} j`,
      description: `Délai légal de 3 mois dépassé depuis ${Math.abs(daysLeft)} jours. Déclaration urgente requise !`,
    };
  }

  if (daysLeft <= 7) {
    return {
      daysLeft,
      isOverdue: false,
      alertLevel: 'urgent',
      badgeText: `J-${daysLeft} URGENT`,
      description: `Alerte J-7 : Plus que ${daysLeft} jours pour déclarer le bail à la commune !`,
    };
  }

  if (daysLeft <= 15) {
    return {
      daysLeft,
      isOverdue: false,
      alertLevel: 'warning',
      badgeText: `J-${daysLeft}`,
      description: `Alerte J-15 : Déclaration requise dans les 15 jours.`,
    };
  }

  if (daysLeft <= 30) {
    return {
      daysLeft,
      isOverdue: false,
      alertLevel: 'notice',
      badgeText: `J-${daysLeft}`,
      description: `Rappel J-30 : Pensez à préparer la déclaration à la commune.`,
    };
  }

  return {
    daysLeft,
    isOverdue: false,
    alertLevel: 'normal',
    badgeText: `${daysLeft} jours`,
    description: `Délai légal : ${daysLeft} jours restants.`,
  };
}
