export type Language = 'fr' | 'ha' | 'dje';

export type UserRole = 'proprietaire' | 'collecteur' | 'admin';

export type HousingType = 'chambre-salon' | 'F2' | 'F3' | 'F4' | 'F5' | 'autre';

export type HousingStatus = 'libre' | 'occupe';

export type PaymentMethod =
  | 'especes'
  | 'wave'
  | 'orange_money'
  | 'mtn_momo'
  | 'moov_money'
  | 'moov_flooz'
  | 'free_money'
  | 'tmoney'
  | 'airtel_money'
  | 'mpesa'
  | 'zamani_cash'
  | 'celtiis_cash'
  | 'express_union'
  | 'coris_money'
  | 'afrimoney'
  | 'al_izza'
  | 'virement'
  | 'carte_bancaire'
  | 'autre';

export type DeclarationStatus = 'a_faire' | 'deposee' | 'validee';

export type SubscriptionPlanCode = 'gratuit' | 'bailleur' | 'diaspora' | 'agence';

export interface Proprietaire {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  langue: Language;
  formule: SubscriptionPlanCode;
  dateInscription: string;
  dateExpirationAbonnement?: string;
  statutAbonnement?: 'actif' | 'expire' | 'suspendu';
}

/**
 * Numéro de réception direct du propriétaire pour les loyers
 * Loyo ne touche JAMAIS aux fonds : le locataire paie directement sur ce numéro.
 */
export interface NumeroReception {
  id: string;
  proprietaireId: string;
  operateur: PaymentMethod;
  numero: string;
  nomAffiche: string; // Nom officiel du titulaire du compte
  actif: boolean;
  parDefaut: boolean;
  instructions?: string; // ex. "Tapez #144*... ou envoyer à ce numéro"
}

export interface Bien {
  id: string;
  proprietaireId: string;
  nom: string;
  adresse: string;
  ville: string;
  commune: string;
  zoneId: string;
  dateCreation: string;
}

export interface Logement {
  id: string;
  bienId: string;
  libelle: string; // e.g. "Chambre 3", "Appartement A1"
  type: HousingType;
  loyerMensuel: number;
  caution: number;
  statut: HousingStatus;
  dateDerniereHausse?: string;
  loyerPrecedent?: number;
  motifAmelioration?: string;
  collecteurId?: string; // id du collecteur assigné
  numeroReceptionPrefereId?: string; // Numéro de réception préféré pour ce logement
}

export interface Locataire {
  id: string;
  nom: string;
  telephone: string;
  langue: Language;
  logementId: string;
  dateEntree: string; // ISO string
  jourEcheance: number; // 1 à 31, typically 5 ou 10
  cautionVersee: number;
  cautionRestituee?: number;
  motifRestitution?: string;
  dateRestitution?: string;
  statut: 'actif' | 'parti';
}

export interface Bail {
  id: string;
  logementId: string;
  locataireId: string;
  proprietaireId: string;
  dateDebut: string;
  loyer: number;
  cautionVersee: number;
  avanceVersee: number;
  dateLimiteDeclaration: string; // dateDebut + 3 mois
  statutDeclaration: DeclarationStatus;
  dateDepot?: string;
  numeroDepotCommune?: string;
  communeDepot?: string;
}

export type EcheanceStatut =
  | 'a_payer'
  | 'signale_par_locataire'
  | 'paye_partiellement'
  | 'paye'
  | 'en_retard';

/**
 * Échéance mensuelle de loyer
 */
export interface Echeance {
  id: string;
  bailId: string;
  logementId: string;
  locataireId: string;
  proprietaireId: string;
  periodeMois: number; // 1 à 12
  periodeAnnee: number; // 2026
  montantDu: number; // Montant initial attendu
  montantPaye: number; // Cumul des versements confirmés
  referenceCourte: string; // Référence unique courte ex: "LY-4827"
  statut: EcheanceStatut;
  dateEcheance: string; // Date limite ex: "2026-10-05"
  tokenLienPublic: string; // Jeton unique non devinable
  tokenExpiresAt: string; // Date expiration du jeton (ISO)
}

export type PaiementSource = 'proprietaire' | 'collecteur' | 'locataire';
export type PaiementStatut = 'en_attente_confirmation' | 'confirme' | 'rejete';

export interface Paiement {
  id: string;
  bailId: string;
  logementId: string;
  locataireId: string;
  proprietaireId: string;
  echeanceId?: string;
  numeroReceptionId?: string;
  periodeMois: number; // 1-12
  periodeAnnee: number; // e.g. 2026
  montant: number;
  mode: PaymentMethod;
  date: string; // ISO date
  enregistreParRole: UserRole | 'locataire';
  enregistreParNom: string;
  source: PaiementSource; // Qui a initié la saisie
  statut: PaiementStatut; // 'en_attente_confirmation' | 'confirme' | 'rejete'
  transactionIdOperateur?: string; // ID de transaction opérateur (anti-doublon)
  referenceTransaction?: string; // Réf de secours / transaction
  numeroQuittance: string; // Généré UNIQUEMENT après confirmation
  confirmeParNom?: string;
  confirmeParRole?: UserRole;
  dateConfirmation?: string;
  motifRejet?: string; // Obligatoire si rejeté
  dateRejet?: string;
  rejeteParNom?: string;
  rawSmsColle?: string; // SMS collé ayant servi à l'analyse automatique
  synchronise: boolean;
  smsEnvoye?: boolean;
  certificatId?: string;
  signatureNumerique?: string;
  dateCertification?: string;
}

/**
 * Journal d'audit des confirmations et rejets de paiements
 */
export interface JournalPaiement {
  id: string;
  paiementId: string;
  action: 'declaration' | 'confirmation' | 'rejet';
  auteurNom: string;
  auteurRole: UserRole | 'locataire';
  date: string;
  motifRejet?: string;
  details?: {
    montant: number;
    mode: PaymentMethod;
    transactionId?: string;
    echeanceRef?: string;
  };
}

/**
 * Règle d'analyse automatique des SMS de paiement des opérateurs
 */
export interface SmsParserRule {
  id: string;
  operateur: PaymentMethod;
  nomOperateur: string;
  actif: boolean;
  keywords: string[]; // Mots clés déclencheurs
  exempleSms: string;
}

export interface Zone {
  id: string;
  ville: string;
  nomZone: string;
  description: string;
  commune: string;
}

export interface Plafond {
  id: string;
  zoneId: string;
  typeLogement: HousingType;
  montantMax: number;
  dateMiseAJour: string;
  noteVerification: string;
}

export interface MessageSMS {
  id: string;
  destinataire: string;
  destinataireNom: string;
  type: 'rappel' | 'quittance' | 'relance' | 'declaration' | 'rejet' | 'autre';
  langue: Language;
  contenu: string;
  statutEnvoi: 'envoye' | 'en_attente' | 'echec';
  date: string;
  referencePaiementId?: string;
}

export interface Collecteur {
  id: string;
  proprietaireId: string;
  nom: string;
  telephone: string;
  logementsAssignes: string[]; // liste d'IDs de logements
  dateAjout: string;
}

export interface FormuleAbonnement {
  code: SubscriptionPlanCode;
  nom: string;
  maxLogements: number;
  prixParLogement: number;
  minPrix: number;
  description: string;
  caracteristiques: string[];
}

export interface ModeleSMS {
  code: string;
  nom: string;
  variables: string[];
  contenu: {
    fr: string;
    ha: string;
    dje: string;
  };
}

/**
 * INTERFACE DE PAIEMENT FUTURE (Actuellement inactive)
 * Loyo applique strictement le principe de paiement direct au propriétaire :
 * L'application ne touche JAMAIS aux fonds des loyers, n'encaisse rien,
 * ne détient aucun compte séquestre et n'effectue aucun virement.
 * Cette interface PaymentProvider est maintenue documentée et vide pour une
 * future intégration technique optionnelle avec un agrégateur tiers agréé (UEMOA / CEMAC).
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isDirectPaymentOnly: true;
  processPayment?(request: unknown): Promise<never>;
}

export interface AppDatabase {
  proprietaires: Proprietaire[];
  numerosReception: NumeroReception[];
  biens: Bien[];
  logements: Logement[];
  locataires: Locataire[];
  baux: Bail[];
  echeances: Echeance[];
  paiements: Paiement[];
  journalPaiements: JournalPaiement[];
  smsParserRules: SmsParserRule[];
  plafonds: Plafond[];
  zones: Zone[];
  messagesSMS: MessageSMS[];
  collecteurs: Collecteur[];
  formules: FormuleAbonnement[];
  modelesSMS: ModeleSMS[];
  syncQueue: Array<{
    type: 'paiement' | 'locataire' | 'logement' | 'bail';
    action: 'create' | 'update';
    data: unknown;
    timestamp: string;
  }>;
  quittanceCounter: number;
}
