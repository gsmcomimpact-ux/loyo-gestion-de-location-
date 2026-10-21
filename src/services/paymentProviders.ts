import { PaymentMethod } from '../types';

/**
 * ==============================================================================
 * PRINCIPE FONDAMENTAL : PAIEMENT DIRECT AU PROPRIÉTAIRE (DIRECT-TO-LANDLORD)
 * ==============================================================================
 * Loyo ne touche JAMAIS l'argent des loyers.
 * Le locataire paie directement le propriétaire :
 * - soit en espèces remises en main propre (au bailleur ou à son collecteur désigné)
 * - soit par Mobile Money (Airtel Money, Moov Flooz, Zamani Cash, Wave, Orange Money, MTN MoMo, etc.)
 *   directement sur le numéro personnel de réception du propriétaire.
 *
 * L'application n'encaisse rien, ne détient aucun fonds et n'effectue aucun virement.
 * Elle indique au locataire quoi payer et où, enregistre et fait confirmer le paiement
 * par le propriétaire, puis émet la quittance officielle et certifiée.
 *
 * Loyo n'intègre volontairement aucune API d'intermédiation financière pour les loyers.
 * L'interface PaymentProvider ci-dessous est conservée vide et documentée pour
 * une future intégration facultative avec un agrégateur officiellement agréé
 * par la Banque Centrale (UEMOA / CEMAC / BEAC).
 * ==============================================================================
 */

export interface PaymentProvider {
  /** Nom de l'agrégateur ou de l'opérateur */
  readonly id: string;
  readonly nom: string;
  /** Indique si le fournisseur est strictement direct */
  readonly isDirectPaymentOnly: boolean;
  /** Méthode réservée pour une intégration future */
  processPayment?(request: unknown): Promise<never>;
}

/**
 * Interface vide et documentée pour une future intégration avec un agrégateur agréé.
 * Actuellement, aucun transfert financier ne transite par l'application.
 */
export class DirectToLandlordPaymentProvider implements PaymentProvider {
  readonly id = 'direct_to_landlord';
  readonly nom = 'Paiement Direct au Propriétaire (Espèces & Mobile Money)';
  readonly isDirectPaymentOnly = true;

  async processPayment(_request: unknown): Promise<never> {
    throw new Error(
      "Loyo applique le modèle de paiement direct : aucun encaissement ne transite par l'application. Le locataire règle directement sur le compte du bailleur."
    );
  }
}

export const activePaymentProvider = new DirectToLandlordPaymentProvider();
