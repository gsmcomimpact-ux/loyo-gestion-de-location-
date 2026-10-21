import {
  Proprietaire,
  NumeroReception,
  Bien,
  Logement,
  Locataire,
  Bail,
  Echeance,
  Paiement,
  JournalPaiement,
  SmsParserRule,
  Plafond,
  Zone,
  MessageSMS,
  Collecteur,
  FormuleAbonnement,
  ModeleSMS,
  AppDatabase,
} from '../types';
import { defaultSmsTemplates } from '../i18n/translations';

export type { AppDatabase };

const STORAGE_KEY = 'loyerfacile_niger_db_v2'; // v2 with direct payments, reception numbers & echeances

// Formules d'abonnements requises
export const DEFAULT_FORMULES: FormuleAbonnement[] = [
  {
    code: 'gratuit',
    nom: 'Gratuit',
    maxLogements: 2,
    prixParLogement: 0,
    minPrix: 0,
    description: 'Pour débuter ou gérer 1 à 2 logements',
    caracteristiques: [
      'Jusqu\'à 2 logements',
      'Paiement direct sans commission',
      'Quittances PDF certifiées',
      'Mode hors-ligne complet',
    ],
  },
  {
    code: 'bailleur',
    nom: 'Bailleur',
    maxLogements: 20,
    prixParLogement: 500,
    minPrix: 2500,
    description: '500 FCFA/logement/mois (min. 2 500 FCFA)',
    caracteristiques: [
      'De 3 à 20 logements',
      'Multi-numéros de réception Mobile Money',
      'Analyseur intelligent de SMS de paiement',
      'Rappels et liens de paiement pour locataires',
      'Gestion des collecteurs et baux',
    ],
  },
  {
    code: 'diaspora',
    nom: 'Diaspora',
    maxLogements: 50,
    prixParLogement: 1000,
    minPrix: 5000,
    description: '1 000 FCFA/logement/mois pour propriétaires à l\'étranger',
    caracteristiques: [
      'Gestion à distance depuis l\'étranger',
      'Contrôle des versements directs',
      'Reporting certifié avec QR codes',
      'Validation en 1 clic des SMS collecteurs',
    ],
  },
  {
    code: 'agence',
    nom: 'Agence / Gestionnaire',
    maxLogements: 9999,
    prixParLogement: 350,
    minPrix: 15000,
    description: 'Tarif dégressif sur volume pour agences immobilières',
    caracteristiques: [
      'Logements illimités',
      'Comptes de réception par bailleur mandaté',
      'Export comptable et déclarations groupées',
      'Accès multi-gestionnaires',
    ],
  },
];

// Zones d'exemple
export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'zone_niamey_1',
    ville: 'Niamey',
    nomZone: 'Zone 1 (Plateau, Yantala, Centre)',
    commune: 'Commune I',
    description: 'Zone administrative et résidentielle',
  },
  {
    id: 'zone_niamey_2',
    ville: 'Niamey',
    nomZone: 'Zone 2 (Boukoki, Lazaret, Talladjé)',
    commune: 'Commune II',
    description: 'Zone urbaine dense',
  },
  {
    id: 'zone_dakar_1',
    ville: 'Dakar',
    nomZone: 'Zone Plateau / Almadies',
    commune: 'Dakar Plateau',
    description: 'Secteur résidentiel et d\'affaires',
  },
  {
    id: 'zone_abidjan_1',
    ville: 'Abidjan',
    nomZone: 'Zone Cocody / Marcory',
    commune: 'Cocody',
    description: 'Secteur urbain principal',
  },
];

// Plafonds d'exemple
export const DEFAULT_PLAFONDS: Plafond[] = [
  {
    id: 'plaf_1',
    zoneId: 'zone_niamey_1',
    typeLogement: 'F3',
    montantMax: 80000,
    dateMiseAJour: '2026-04-15',
    noteVerification: 'Barème indicatif secteur résidentiel',
  },
  {
    id: 'plaf_2',
    zoneId: 'zone_niamey_1',
    typeLogement: 'F2',
    montantMax: 60000,
    dateMiseAJour: '2026-04-15',
    noteVerification: 'Barème indicatif',
  },
  {
    id: 'plaf_3',
    zoneId: 'zone_niamey_2',
    typeLogement: 'chambre-salon',
    montantMax: 35000,
    dateMiseAJour: '2026-04-15',
    noteVerification: 'Barème indicatif',
  },
];

// Règles de parsing SMS configurables par l'admin
export const DEFAULT_SMS_PARSER_RULES: SmsParserRule[] = [
  {
    id: 'rule_airtel',
    operateur: 'airtel_money',
    nomOperateur: 'Airtel Money',
    actif: true,
    keywords: ['airtel', 'airtelmoney', 'recu', 'fcfa'],
    exempleSms: 'Vous avez recu 35000 FCFA de OUMAROU GARBA (96112233). Ref: CI261021.1030.B01234. Solde: 185000 FCFA.',
  },
  {
    id: 'rule_moov',
    operateur: 'moov_flooz',
    nomOperateur: 'Moov Flooz / Moov Money',
    actif: true,
    keywords: ['flooz', 'moov', 'transfert', 'id transaction'],
    exempleSms: 'Flooz: Vous avez recu 25000 FCFA de MAHAMADOU SALEY. Id transaction: FLZ241021004. Nouveau solde: 125000 FCFA.',
  },
  {
    id: 'rule_zamani',
    operateur: 'zamani_cash',
    nomOperateur: 'Zamani Cash',
    actif: true,
    keywords: ['zamani', 'zamanicash', 'reception'],
    exempleSms: 'Zamani Cash: Reception de 42000 FCFA de MARIAMA SEYDOU. Ref: ZAM-89104. Solde: 92000 FCFA.',
  },
  {
    id: 'rule_wave',
    operateur: 'wave',
    nomOperateur: 'Wave Mobile Money',
    actif: true,
    keywords: ['wave', 'frais 0f', 'recu'],
    exempleSms: 'Vous avez recu 80 000F de Ibrahim Abdoulaye. ID: WV-20261021-4891.',
  },
  {
    id: 'rule_orange',
    operateur: 'orange_money',
    nomOperateur: 'Orange Money',
    actif: true,
    keywords: ['orange', 'orangemoney', 'transfert'],
    exempleSms: 'Vous avez recu un transfert de 55 000 FCFA de FATOUMA SOUMANA. Transaction: OM261021.1402.0912.',
  },
];

export function createInitialDemoData(): AppDatabase {
  const proprietaire: Proprietaire = {
    id: 'prop_1',
    nom: 'Elhadj Hassan Issoufou',
    telephone: '+227 96 00 00 00',
    ville: 'Niamey',
    langue: 'fr',
    formule: 'bailleur',
    dateInscription: '2026-01-10',
    dateExpirationAbonnement: '2026-12-31',
    statutAbonnement: 'actif',
  };

  // DONNÉES DEMANDE : Deux numéros de réception pour le propriétaire de test
  const numerosReception: NumeroReception[] = [
    {
      id: 'nr_airtel',
      proprietaireId: proprietaire.id,
      operateur: 'airtel_money',
      numero: '+227 96 11 00 01',
      nomAffiche: 'Elhadj Hassan Issoufou',
      actif: true,
      parDefaut: true,
      instructions: 'Composer *444# ou envoyer directement par Airtel Money au +227 96 11 00 01',
    },
    {
      id: 'nr_moov',
      proprietaireId: proprietaire.id,
      operateur: 'moov_flooz',
      numero: '+227 94 22 00 02',
      nomAffiche: 'Elhadj Hassan Issoufou (Compte Flooz)',
      actif: true,
      parDefaut: false,
      instructions: 'Composer *156# puis Transfert vers +227 94 22 00 02',
    },
    {
      id: 'nr_wave',
      proprietaireId: proprietaire.id,
      operateur: 'wave',
      numero: '+221 77 100 20 30',
      nomAffiche: 'Hassan Issoufou Immobilier',
      actif: true,
      parDefaut: false,
      instructions: 'Scanner le QR Wave ou envoyer au +221 77 100 20 30',
    },
  ];

  const collecteur: Collecteur = {
    id: 'col_1',
    proprietaireId: proprietaire.id,
    nom: 'Moussa Dan Baba (Gardien & Collecteur)',
    telephone: '+227 90 99 88 77',
    logementsAssignes: ['log_1', 'log_5'],
    dateAjout: '2026-02-01',
  };

  const biens: Bien[] = [
    {
      id: 'bien_1',
      proprietaireId: proprietaire.id,
      nom: 'Résidence de la Paix',
      adresse: 'Rue des Ministères, Plateau',
      ville: 'Niamey',
      commune: 'Commune I',
      zoneId: 'zone_niamey_1',
      dateCreation: '2026-01-15',
    },
    {
      id: 'bien_2',
      proprietaireId: proprietaire.id,
      nom: 'Villa Harobanda (Rive Droite)',
      adresse: 'Avenue du Pont Kennedy',
      ville: 'Niamey',
      commune: 'Commune V',
      zoneId: 'zone_niamey_2',
      dateCreation: '2026-02-20',
    },
  ];

  const logements: Logement[] = [
    {
      id: 'log_1',
      bienId: 'bien_1',
      libelle: 'Appartement F3 - Étage 1',
      type: 'F3',
      loyerMensuel: 80000,
      caution: 160000,
      statut: 'occupe',
      collecteurId: collecteur.id,
      numeroReceptionPrefereId: 'nr_airtel',
    },
    {
      id: 'log_2',
      bienId: 'bien_1',
      libelle: 'Appartement F2 - Rez-de-Chaussée',
      type: 'F2',
      loyerMensuel: 55000,
      caution: 110000,
      statut: 'occupe',
      numeroReceptionPrefereId: 'nr_airtel',
    },
    {
      id: 'log_3',
      bienId: 'bien_1',
      libelle: 'Chambre-Salon Entrée Cour',
      type: 'chambre-salon',
      loyerMensuel: 35000,
      caution: 70000,
      statut: 'occupe',
      numeroReceptionPrefereId: 'nr_moov',
    },
    {
      id: 'log_4',
      bienId: 'bien_2',
      libelle: 'Chambre-Salon A',
      type: 'chambre-salon',
      loyerMensuel: 25000,
      caution: 50000,
      statut: 'occupe',
      numeroReceptionPrefereId: 'nr_moov',
    },
    {
      id: 'log_5',
      bienId: 'bien_2',
      libelle: 'Appartement F2 - Cour',
      type: 'F2',
      loyerMensuel: 42000,
      caution: 84000,
      statut: 'occupe',
      collecteurId: collecteur.id,
      numeroReceptionPrefereId: 'nr_airtel',
    },
    {
      id: 'log_6',
      bienId: 'bien_2',
      libelle: 'Studio B (Disponible)',
      type: 'chambre-salon',
      loyerMensuel: 25000,
      caution: 50000,
      statut: 'libre',
    },
  ];

  const locataires: Locataire[] = [
    {
      id: 'loc_1',
      nom: 'Ibrahim Abdoulaye',
      telephone: '+227 96 11 22 33',
      langue: 'ha',
      logementId: 'log_1',
      dateEntree: '2026-08-15',
      jourEcheance: 5,
      cautionVersee: 160000,
      statut: 'actif',
    },
    {
      id: 'loc_2',
      nom: 'Mme Fatouma Soumana',
      telephone: '+227 90 44 55 66',
      langue: 'dje',
      logementId: 'log_2',
      dateEntree: '2026-09-01',
      jourEcheance: 5,
      cautionVersee: 110000,
      statut: 'actif',
    },
    {
      // DEMANDE : Locataire avec paiement partiel
      id: 'loc_3',
      nom: 'Oumarou Garba (Paiement partiel)',
      telephone: '+227 94 77 88 99',
      langue: 'ha',
      logementId: 'log_3',
      dateEntree: '2026-03-01',
      jourEcheance: 5,
      cautionVersee: 70000,
      statut: 'actif',
    },
    {
      // DEMANDE : Locataire avec paiement rejeté (ID faux)
      id: 'loc_4',
      nom: 'Mahamadou Saley (Paiement rejeté)',
      telephone: '+227 92 12 34 56',
      langue: 'fr',
      logementId: 'log_4',
      dateEntree: '2026-08-25',
      jourEcheance: 5,
      cautionVersee: 50000,
      statut: 'actif',
    },
    {
      // DEMANDE : Locataire ayant signalé un paiement en attente de confirmation
      id: 'loc_5',
      nom: 'Mariama Seydou (En attente confirmation)',
      telephone: '+227 98 90 12 34',
      langue: 'fr',
      logementId: 'log_5',
      dateEntree: '2026-08-10',
      jourEcheance: 5,
      cautionVersee: 84000,
      statut: 'actif',
    },
  ];

  const baux: Bail[] = [
    {
      id: 'bail_1',
      logementId: 'log_1',
      locataireId: 'loc_1',
      proprietaireId: proprietaire.id,
      dateDebut: '2026-08-15',
      loyer: 80000,
      cautionVersee: 160000,
      avanceVersee: 80000,
      dateLimiteDeclaration: '2026-11-15',
      statutDeclaration: 'deposee',
      dateDepot: '2026-09-10',
      numeroDepotCommune: 'COMM-I-2026-0842',
      communeDepot: 'Commune I',
    },
    {
      id: 'bail_2',
      logementId: 'log_2',
      locataireId: 'loc_2',
      proprietaireId: proprietaire.id,
      dateDebut: '2026-09-01',
      loyer: 55000,
      cautionVersee: 110000,
      avanceVersee: 55000,
      dateLimiteDeclaration: '2026-12-01',
      statutDeclaration: 'validee',
      dateDepot: '2026-09-15',
      numeroDepotCommune: 'COMM-I-2026-0904',
      communeDepot: 'Commune I',
    },
    {
      id: 'bail_3',
      logementId: 'log_3',
      locataireId: 'loc_3',
      proprietaireId: proprietaire.id,
      dateDebut: '2026-03-01',
      loyer: 35000,
      cautionVersee: 70000,
      avanceVersee: 35000,
      dateLimiteDeclaration: '2026-06-01',
      statutDeclaration: 'validee',
      communeDepot: 'Commune I',
    },
    {
      id: 'bail_4',
      logementId: 'log_4',
      locataireId: 'loc_4',
      proprietaireId: proprietaire.id,
      dateDebut: '2026-08-25',
      loyer: 25000,
      cautionVersee: 50000,
      avanceVersee: 25000,
      dateLimiteDeclaration: '2026-11-25',
      statutDeclaration: 'deposee',
      communeDepot: 'Commune V',
    },
    {
      id: 'bail_5',
      logementId: 'log_5',
      locataireId: 'loc_5',
      proprietaireId: proprietaire.id,
      dateDebut: '2026-08-10',
      loyer: 42000,
      cautionVersee: 84000,
      avanceVersee: 42000,
      dateLimiteDeclaration: '2026-11-10',
      statutDeclaration: 'deposee',
      communeDepot: 'Commune V',
    },
  ];

  // ÉCHÉANCES D'OCTOBRE 2026
  const echeances: Echeance[] = [
    {
      id: 'ech_1',
      bailId: 'bail_1',
      logementId: 'log_1',
      locataireId: 'loc_1',
      proprietaireId: proprietaire.id,
      periodeMois: 10,
      periodeAnnee: 2026,
      montantDu: 80000,
      montantPaye: 80000,
      referenceCourte: 'LY-4827',
      statut: 'paye',
      dateEcheance: '2026-10-05',
      tokenLienPublic: 'tk_demo_ibrahim_80k',
      tokenExpiresAt: '2026-11-20T23:59:59Z',
    },
    {
      id: 'ech_2',
      bailId: 'bail_2',
      logementId: 'log_2',
      locataireId: 'loc_2',
      proprietaireId: proprietaire.id,
      periodeMois: 10,
      periodeAnnee: 2026,
      montantDu: 55000,
      montantPaye: 55000,
      referenceCourte: 'LY-5120',
      statut: 'paye',
      dateEcheance: '2026-10-05',
      tokenLienPublic: 'tk_demo_fatouma_55k',
      tokenExpiresAt: '2026-11-20T23:59:59Z',
    },
    {
      // DEMANDE : Paiement partiel (35 000 dû, 20 000 payé, reste 15 000)
      id: 'ech_3',
      bailId: 'bail_3',
      logementId: 'log_3',
      locataireId: 'loc_3',
      proprietaireId: proprietaire.id,
      periodeMois: 10,
      periodeAnnee: 2026,
      montantDu: 35000,
      montantPaye: 20000,
      referenceCourte: 'LY-3981',
      statut: 'paye_partiellement',
      dateEcheance: '2026-10-05',
      tokenLienPublic: 'tk_demo_oumarou_partial',
      tokenExpiresAt: '2026-11-20T23:59:59Z',
    },
    {
      // DEMANDE : Paiement rejeté -> l'échéance est revenue en retard
      id: 'ech_4',
      bailId: 'bail_4',
      logementId: 'log_4',
      locataireId: 'loc_4',
      proprietaireId: proprietaire.id,
      periodeMois: 10,
      periodeAnnee: 2026,
      montantDu: 25000,
      montantPaye: 0,
      referenceCourte: 'LY-7714',
      statut: 'en_retard',
      dateEcheance: '2026-10-05',
      tokenLienPublic: 'tk_demo_mahamadou_rejected',
      tokenExpiresAt: '2026-11-20T23:59:59Z',
    },
    {
      // DEMANDE : Paiement signalé par locataire en attente de confirmation
      id: 'ech_5',
      bailId: 'bail_5',
      logementId: 'log_5',
      locataireId: 'loc_5',
      proprietaireId: proprietaire.id,
      periodeMois: 10,
      periodeAnnee: 2026,
      montantDu: 42000,
      montantPaye: 0, // pas encore validé
      referenceCourte: 'LY-9023',
      statut: 'signale_par_locataire',
      dateEcheance: '2026-10-05',
      tokenLienPublic: 'tk_demo_mariama_pending',
      tokenExpiresAt: '2026-11-20T23:59:59Z',
    },
  ];

  // PAIEMENTS
  const paiements: Paiement[] = [
    {
      id: 'pay_1',
      bailId: 'bail_1',
      logementId: 'log_1',
      locataireId: 'loc_1',
      proprietaireId: proprietaire.id,
      echeanceId: 'ech_1',
      numeroReceptionId: 'nr_airtel',
      periodeMois: 10,
      periodeAnnee: 2026,
      montant: 80000,
      mode: 'especes',
      date: '2026-10-04T10:30:00Z',
      enregistreParRole: 'collecteur',
      enregistreParNom: 'Moussa Dan Baba (Gardien)',
      source: 'collecteur',
      statut: 'confirme',
      confirmeParNom: 'Moussa Dan Baba (Collecteur)',
      confirmeParRole: 'collecteur',
      dateConfirmation: '2026-10-04T10:30:00Z',
      referenceTransaction: 'ESP-100411',
      numeroQuittance: 'QUITT-2026-0001',
      synchronise: true,
      smsEnvoye: true,
      certificatId: 'CERT-NIG-2026-8A31-4F10',
      signatureNumerique: '9A7F310B42E18D90CC8174AA6290DF19904E08B321945D18',
      dateCertification: '2026-10-04T10:30:00Z',
    },
    {
      id: 'pay_2',
      bailId: 'bail_2',
      logementId: 'log_2',
      locataireId: 'loc_2',
      proprietaireId: proprietaire.id,
      echeanceId: 'ech_2',
      numeroReceptionId: 'nr_airtel',
      periodeMois: 10,
      periodeAnnee: 2026,
      montant: 55000,
      mode: 'airtel_money',
      date: '2026-10-05T14:15:00Z',
      enregistreParRole: 'proprietaire',
      enregistreParNom: 'Elhadj Hassan Issoufou',
      source: 'proprietaire',
      statut: 'confirme',
      confirmeParNom: 'Elhadj Hassan Issoufou',
      confirmeParRole: 'proprietaire',
      dateConfirmation: '2026-10-05T14:15:00Z',
      transactionIdOperateur: 'ATM-NIG-782910',
      referenceTransaction: 'ATM-NIG-782910',
      numeroQuittance: 'QUITT-2026-0002',
      synchronise: true,
      smsEnvoye: true,
      certificatId: 'CERT-NIG-2026-1C74-9B22',
      signatureNumerique: 'B28190CF14AA9021DD488E012B9802AA4F772091DE5408BC',
      dateCertification: '2026-10-05T14:15:00Z',
    },
    {
      // DONNÉES DEMANDE : 1 paiement partiel (20 000 payés sur 35 000)
      id: 'pay_3_partiel',
      bailId: 'bail_3',
      logementId: 'log_3',
      locataireId: 'loc_3',
      proprietaireId: proprietaire.id,
      echeanceId: 'ech_3',
      numeroReceptionId: 'nr_moov',
      periodeMois: 10,
      periodeAnnee: 2026,
      montant: 20000,
      mode: 'moov_flooz',
      date: '2026-10-06T11:20:00Z',
      enregistreParRole: 'proprietaire',
      enregistreParNom: 'Elhadj Hassan Issoufou',
      source: 'proprietaire',
      statut: 'confirme',
      confirmeParNom: 'Elhadj Hassan Issoufou',
      confirmeParRole: 'proprietaire',
      dateConfirmation: '2026-10-06T11:20:00Z',
      transactionIdOperateur: 'FLZ-261006-8910',
      referenceTransaction: 'FLZ-261006-8910',
      numeroQuittance: 'QUITT-2026-0003',
      synchronise: true,
      smsEnvoye: true,
      certificatId: 'CERT-NIG-2026-5E29-7A83',
      signatureNumerique: '3F108AB744219DE0078BB4C901A832EE7190AB90CD438201',
      dateCertification: '2026-10-06T11:20:00Z',
    },
    {
      // DONNÉES DEMANDE : 1 paiement signalé par un locataire EN ATTENTE DE CONFIRMATION
      id: 'pay_pending_mariama',
      bailId: 'bail_5',
      logementId: 'log_5',
      locataireId: 'loc_5',
      proprietaireId: proprietaire.id,
      echeanceId: 'ech_5',
      numeroReceptionId: 'nr_airtel',
      periodeMois: 10,
      periodeAnnee: 2026,
      montant: 42000,
      mode: 'airtel_money',
      date: '2026-10-21T09:15:00Z',
      enregistreParRole: 'locataire',
      enregistreParNom: 'Mariama Seydou (Locataire)',
      source: 'locataire',
      statut: 'en_attente_confirmation', // EN ATTENTE DE VALIDATION PAR LE PROPRIÉTAIRE
      transactionIdOperateur: 'ATM-261021-98421',
      referenceTransaction: 'ATM-261021-98421',
      numeroQuittance: '', // Aucune quittance tant que non confirmé !
      synchronise: true,
      smsEnvoye: false,
    },
    {
      // DONNÉES DEMANDE : 1 paiement REJETÉ avec motif obligatoire
      id: 'pay_rejected_mahamadou',
      bailId: 'bail_4',
      logementId: 'log_4',
      locataireId: 'loc_4',
      proprietaireId: proprietaire.id,
      echeanceId: 'ech_4',
      numeroReceptionId: 'nr_moov',
      periodeMois: 10,
      periodeAnnee: 2026,
      montant: 25000,
      mode: 'moov_flooz',
      date: '2026-10-18T16:30:00Z',
      enregistreParRole: 'locataire',
      enregistreParNom: 'Mahamadou Saley (Locataire)',
      source: 'locataire',
      statut: 'rejete',
      motifRejet: 'ID de transaction introuvable sur le relevé Flooz du propriétaire après vérification.',
      dateRejet: '2026-10-19T08:45:00Z',
      rejeteParNom: 'Elhadj Hassan Issoufou',
      transactionIdOperateur: 'FLZ-9999-FAUX-REF',
      referenceTransaction: 'FLZ-9999-FAUX-REF',
      numeroQuittance: '',
      synchronise: true,
      smsEnvoye: true,
    },
  ];

  // JOURNAL D'AUDIT DES PAIEMENTS
  const journalPaiements: JournalPaiement[] = [
    {
      id: 'log_1',
      paiementId: 'pay_1',
      action: 'confirmation',
      auteurNom: 'Moussa Dan Baba (Collecteur)',
      auteurRole: 'collecteur',
      date: '2026-10-04T10:30:00Z',
      details: {
        montant: 80000,
        mode: 'especes',
        echeanceRef: 'LY-4827',
      },
    },
    {
      id: 'log_2',
      paiementId: 'pay_2',
      action: 'confirmation',
      auteurNom: 'Elhadj Hassan Issoufou',
      auteurRole: 'proprietaire',
      date: '2026-10-05T14:15:00Z',
      details: {
        montant: 55000,
        mode: 'airtel_money',
        transactionId: 'ATM-NIG-782910',
        echeanceRef: 'LY-5120',
      },
    },
    {
      id: 'log_3',
      paiementId: 'pay_3_partiel',
      action: 'confirmation',
      auteurNom: 'Elhadj Hassan Issoufou',
      auteurRole: 'proprietaire',
      date: '2026-10-06T11:20:00Z',
      details: {
        montant: 20000,
        mode: 'moov_flooz',
        transactionId: 'FLZ-261006-8910',
        echeanceRef: 'LY-3981',
      },
    },
    {
      id: 'log_4',
      paiementId: 'pay_pending_mariama',
      action: 'declaration',
      auteurNom: 'Mariama Seydou (Locataire)',
      auteurRole: 'locataire',
      date: '2026-10-21T09:15:00Z',
      details: {
        montant: 42000,
        mode: 'airtel_money',
        transactionId: 'ATM-261021-98421',
        echeanceRef: 'LY-9023',
      },
    },
    {
      id: 'log_5',
      paiementId: 'pay_rejected_mahamadou',
      action: 'rejet',
      auteurNom: 'Elhadj Hassan Issoufou',
      auteurRole: 'proprietaire',
      date: '2026-10-19T08:45:00Z',
      motifRejet: 'ID de transaction introuvable sur le relevé Flooz du propriétaire après vérification.',
      details: {
        montant: 25000,
        mode: 'moov_flooz',
        transactionId: 'FLZ-9999-FAUX-REF',
        echeanceRef: 'LY-7714',
      },
    },
  ];

  const messagesSMS: MessageSMS[] = [
    {
      id: 'sms_1',
      destinataire: '+227 96 11 22 33',
      destinataireNom: 'Ibrahim Abdoulaye',
      type: 'quittance',
      langue: 'ha',
      contenu: 'Mun karbi kudi! Ibrahim Abdoulaye, kudin hayar Oktoba 2026 na 80 000 FCFA an karba ta ESPECES. Rasiti N° QUITT-2026-0001. Mungode.',
      statutEnvoi: 'envoye',
      date: '2026-10-04T10:31:00Z',
      referencePaiementId: 'pay_1',
    },
    {
      id: 'sms_2',
      destinataire: '+227 90 44 55 66',
      destinataireNom: 'Mme Fatouma Soumana',
      type: 'quittance',
      langue: 'dje',
      contenu: 'Nooru zaabu! Mme Fatouma Soumana, Oktoba 2026 fu hayya 55 000 FCFA zaabu nda AIRTEL_MONEY. Kasiiti QUITT-2026-0002. Fofo nda goy.',
      statutEnvoi: 'envoye',
      date: '2026-10-05T14:16:00Z',
      referencePaiementId: 'pay_2',
    },
    {
      id: 'sms_3',
      destinataire: '+227 92 12 34 56',
      destinataireNom: 'Mahamadou Saley',
      type: 'rejet',
      langue: 'fr',
      contenu: 'Loyo : Votre paiement de 25 000 FCFA pour Chambre-Salon A a été refusé par le propriétaire. Motif : ID de transaction introuvable sur le relevé Flooz du propriétaire après vérification. Merci de régulariser.',
      statutEnvoi: 'envoye',
      date: '2026-10-19T08:46:00Z',
      referencePaiementId: 'pay_rejected_mahamadou',
    },
  ];

  return {
    proprietaires: [proprietaire],
    numerosReception,
    biens,
    logements,
    locataires,
    baux,
    echeances,
    paiements,
    journalPaiements,
    smsParserRules: DEFAULT_SMS_PARSER_RULES,
    plafonds: DEFAULT_PLAFONDS,
    zones: DEFAULT_ZONES,
    messagesSMS,
    collecteurs: [collecteur],
    formules: DEFAULT_FORMULES,
    modelesSMS: defaultSmsTemplates,
    syncQueue: [],
    quittanceCounter: 3,
  };
}

export class LocalStorageManager {
  private static dbCache: AppDatabase | null = null;

  static getDB(): AppDatabase {
    if (this.dbCache) return this.dbCache;

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Assurer la présence des nouvelles collections v2
        if (
          parsed.proprietaires &&
          parsed.logements &&
          parsed.numerosReception &&
          parsed.echeances &&
          parsed.journalPaiements
        ) {
          this.dbCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading from localStorage, initializing fresh data', e);
    }

    const initial = createInitialDemoData();
    this.saveDB(initial);
    return initial;
  }

  static saveDB(db: AppDatabase): void {
    this.dbCache = db;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Error saving database to localStorage:', e);
    }
  }

  static resetToDemo(): AppDatabase {
    const fresh = createInitialDemoData();
    this.saveDB(fresh);
    return fresh;
  }

  static getNextQuittanceNumber(db: AppDatabase): string {
    db.quittanceCounter = (db.quittanceCounter || 0) + 1;
    const year = new Date().getFullYear();
    const formatted = db.quittanceCounter.toString().padStart(4, '0');
    return `QUITT-${year}-${formatted}`;
  }

  /**
   * Vérifie si un paiement existe déjà pour un bail et une période donnés (pour éviter les doublons)
   */
  static findDuplicatePayment(
    db: AppDatabase,
    bailId: string,
    mois: number,
    annee: number
  ): Paiement | undefined {
    return db.paiements.find(
      (p) =>
        p.bailId === bailId &&
        p.periodeMois === mois &&
        p.periodeAnnee === annee &&
        (p.statut === 'confirme' || p.statut === 'en_attente_confirmation')
    );
  }

  /**
   * Synchronisation des éléments hors-ligne
   */
  static syncQueue(db: AppDatabase): { syncedCount: number } {
    if (db.syncQueue.length === 0) return { syncedCount: 0 };
    const count = db.syncQueue.length;
    db.paiements = db.paiements.map((p) => ({ ...p, synchronise: true }));
    db.syncQueue = [];
    this.saveDB(db);
    return { syncedCount: count };
  }
}
