export interface PaymentMethodOption {
  id: string;
  label: string;
  subLabel: string;
  type: 'cash' | 'mobile_money' | 'bank' | 'card';
  badgeColor: string;
  provider: string;
}

export interface CityOption {
  name: string;
  communes: string[];
}

export interface CountryRegulation {
  title: string;
  decreeOrLaw: string;
  maxCautionMonths: number;
  maxAvanceMonths: number;
  description: string;
  officialAuthority: string;
  requiresRegistration: boolean;
  adviceForLandlords: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  phonePrefix: string;
  phoneFormatPlaceholder: string;
  cities: CityOption[];
  paymentMethods: PaymentMethodOption[];
  regulations: CountryRegulation;
  sampleOwnerName: string;
  sampleTenantName: string;
}

export const FRANCOPHONE_COUNTRIES: Record<string, CountryConfig> = {
  SN: {
    code: 'SN',
    name: 'Sénégal',
    flag: '🇸🇳',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+221',
    phoneFormatPlaceholder: '+221 77 123 45 67',
    sampleOwnerName: 'Elhadj Abdoulaye Diop',
    sampleTenantName: 'Fatou Ndiaye',
    cities: [
      {
        name: 'Dakar',
        communes: [
          'Plateau',
          'Almadies',
          'Ouakam',
          'Mermoz-Sacré-Cœur',
          'Yoff',
          'Grand Yoff',
          'Ngor',
          'Fann-Point E-Amitié',
          'Guédiawaye',
          'Pikine',
          'Rufisque',
        ],
      },
      { name: 'Thiès', communes: ['Thiès Nord', 'Thiès Sud', 'Thiès Ouest'] },
      { name: 'Saint-Louis', communes: ['Sor', 'Île Saint-Louis', 'Ndar'] },
      { name: 'Mbour', communes: ['Saly Portudal', 'Mbour Centre', 'Somalone'] },
      { name: 'Ziguinchor', communes: ['Ziguinchor Centre', 'Boukot'] },
    ],
    paymentMethods: [
      {
        id: 'wave',
        label: 'Wave Sénégal',
        subLabel: 'QR code & virement sans frais (1%)',
        type: 'mobile_money',
        badgeColor: 'border-sky-500 bg-sky-50 text-sky-950',
        provider: 'wave',
      },
      {
        id: 'orange_money',
        label: 'Orange Money SN',
        subLabel: '#144# / Push mobile',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'free_money',
        label: 'Free Money SN',
        subLabel: 'Paiement direct USSD',
        type: 'mobile_money',
        badgeColor: 'border-red-600 bg-red-50 text-red-950',
        provider: 'free_money',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Reçu immédiat remis au locataire',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'CBAO, SGBS, BOA, Ecobank',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: 'Réglementation des baux au Sénégal (CONAREL)',
      decreeOrLaw: 'Décret N° 2023-447 & Code des Obligations Civiles et Commerciales',
      maxCautionMonths: 2,
      maxAvanceMonths: 1,
      description:
        'La Commission Nationale de Régulation des Loyers (CONAREL) plafonne la caution à 2 mois maximum et le prépaiement à 1 mois. Les hausses unilatérales de loyer sont encadrées.',
      officialAuthority: 'Commission Nationale de Régulation des Loyers (CONAREL) & Mairies de Dakar',
      requiresRegistration: true,
      adviceForLandlords: 'Plafonnez la caution à 2 mois maximum pour éviter les sanctions CONAREL.',
    },
  },

  CI: {
    code: 'CI',
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+225',
    phoneFormatPlaceholder: '+225 07 08 09 10 11',
    sampleOwnerName: 'Kouassi Jean-Marc Koffi',
    sampleTenantName: 'Awa Bakayoko',
    cities: [
      {
        name: 'Abidjan',
        communes: [
          'Cocody (Angré, Riviera, Deux-Plateaux)',
          'Plateau',
          'Marcory (Zone 4, Biétry)',
          'Yopougon',
          'Koumassi',
          'Treichville',
          'Port-Bouët',
          'Attécoubé',
          'Bingerville',
          'Songon',
        ],
      },
      { name: 'Bouaké', communes: ['Ahougnansou', 'Koko', 'Nimbo', 'Dar-es-Salam'] },
      { name: 'Yamoussoukro', communes: ['Habitat', 'Morofé', 'Assabou'] },
      { name: 'San-Pédro', communes: ['Balmer', 'Bardot', 'Cité'] },
    ],
    paymentMethods: [
      {
        id: 'wave',
        label: 'Wave CI',
        subLabel: 'Transfert instantané sans frais',
        type: 'mobile_money',
        badgeColor: 'border-sky-500 bg-sky-50 text-sky-950',
        provider: 'wave',
      },
      {
        id: 'orange_money',
        label: 'Orange Money CI',
        subLabel: '#144# / App Max it',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'mtn_momo',
        label: 'MTN MoMo CI',
        subLabel: '*133# / MoMo App',
        type: 'mobile_money',
        badgeColor: 'border-yellow-500 bg-yellow-50 text-yellow-950',
        provider: 'mtn_momo',
      },
      {
        id: 'moov_money',
        label: 'Moov Money CI',
        subLabel: '*155# / Moov Money',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_money',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'En main propre contre quittance immédiate',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'NSIA, SGBCI, Ecobank, BNI, Coris',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Code de la Construction et de l'Habitat (Loi 2019-576)",
      decreeOrLaw: "Loi N° 2019-576 du 26 juin 2019 régissant les baux d'habitation",
      maxCautionMonths: 2,
      maxAvanceMonths: 2,
      description:
        "L'article 418 de la Loi ivoirienne plafonne strictement la caution à deux (2) mois de loyer et l'avance à deux (2) mois de loyer maximum. Les honoraires d'agence sont aussi strictement encadrés.",
      officialAuthority: "Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)",
      requiresRegistration: true,
      adviceForLandlords: 'La formule légale 2+2 (2 mois de caution + 2 mois d’avance) est le plafond absolu en Côte d’Ivoire.',
    },
  },

  CM: {
    code: 'CM',
    name: 'Cameroun',
    flag: '🇨🇲',
    currency: 'FCFA',
    currencyCode: 'XAF',
    currencySymbol: 'FCFA',
    phonePrefix: '+237',
    phoneFormatPlaceholder: '+237 6 70 00 00 00',
    sampleOwnerName: 'Ferdinand Kamdem Tchuente',
    sampleTenantName: 'Chantal Ngo Bikoi',
    cities: [
      {
        name: 'Douala',
        communes: [
          'Bonanjo (Douala 1er)',
          'Akwa (Douala 1er)',
          'Bonapriso',
          'Bali',
          'Makepe (Douala 5e)',
          'Bonamoussadi',
          'Deido (Douala 2e)',
          'Bépanda',
        ],
      },
      {
        name: 'Yaoundé',
        communes: [
          'Bastos (Yaoundé 2e)',
          'Centre-ville',
          'Omnisports',
          'Biyem-Assi',
          'Mendong',
          'Mvan',
          'Ngousso',
        ],
      },
      { name: 'Bafoussam', communes: ['Bafoussam 1er', 'Bafoussam 2e', 'Bafoussam 3e'] },
      { name: 'Garoua', communes: ['Garoua 1er', 'Garoua 2e'] },
      { name: 'Kribi', communes: ['Kribi 1er', 'Kribi 2e'] },
    ],
    paymentMethods: [
      {
        id: 'mtn_momo',
        label: 'MTN Mobile Money CM',
        subLabel: '*126# / MoMo App Cameroun',
        type: 'mobile_money',
        badgeColor: 'border-yellow-500 bg-yellow-50 text-yellow-950',
        provider: 'mtn_momo',
      },
      {
        id: 'orange_money',
        label: 'Orange Money Cameroun',
        subLabel: '#150# / Orange Money CM',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'express_union',
        label: 'Express Union Mobile',
        subLabel: 'EU Mobile Money Cameroun',
        type: 'mobile_money',
        badgeColor: 'border-purple-600 bg-purple-50 text-purple-950',
        provider: 'express_union',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Paiement direct avec reçu certifié',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'Afriland First Bank, SG Cameroun, UBA, SCB',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Baux d'habitation et Enregistrement Fiscal au Cameroun",
      decreeOrLaw: "Code Général des Impôts & Acte Uniforme OHADA",
      maxCautionMonths: 3,
      maxAvanceMonths: 6,
      description:
        "Au Cameroun, tout contrat de bail doit être formalisé par écrit et enregistré auprès du centre des impôts (DGI) compétent, avec acquittement du droit d'enregistrement de 2%.",
      officialAuthority: 'Direction Générale des Impôts (DGI) & Communautés Urbaines',
      requiresRegistration: true,
      adviceForLandlords: "L'enregistrement fiscal protège le bailleur en cas de litige ou de procédure d'expulsion.",
    },
  },

  BJ: {
    code: 'BJ',
    name: 'Bénin',
    flag: '🇧🇯',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+229',
    phoneFormatPlaceholder: '+229 97 12 34 56',
    sampleOwnerName: 'Marius Houndékon',
    sampleTenantName: 'Sènan Viviane Dossou',
    cities: [
      {
        name: 'Cotonou',
        communes: [
          'Haie Vive (12e Arr.)',
          'Cadjehoun',
          'Gbegamey',
          'Fidjrossè',
          'Akpakpa',
          'Dandji',
          'Agla',
          'Kouhounou',
        ],
      },
      { name: 'Abomey-Calavi', communes: ['Calavi Centre', 'Akassato', 'Godomey', 'Zinvié'] },
      { name: 'Porto-Novo', communes: ['1er Arr.', '2e Arr.', '3e Arr.', '4e Arr.', '5e Arr.'] },
      { name: 'Parakou', communes: ['1er Arrondissement', '2e Arrondissement', '3e Arrondissement'] },
    ],
    paymentMethods: [
      {
        id: 'mtn_momo',
        label: 'MTN Mobile Money Bénin',
        subLabel: '*880# / MoMo Bénin',
        type: 'mobile_money',
        badgeColor: 'border-yellow-500 bg-yellow-50 text-yellow-950',
        provider: 'mtn_momo',
      },
      {
        id: 'moov_flooz',
        label: 'Moov Money Flooz BJ',
        subLabel: '*155# / Flooz Bénin',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_flooz',
      },
      {
        id: 'celtiis_cash',
        label: 'Celtiis Cash Bénin',
        subLabel: '*889# / Celtiis Cash',
        type: 'mobile_money',
        badgeColor: 'border-teal-600 bg-teal-50 text-teal-950',
        provider: 'celtiis_cash',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Quittance numérique obligatoire',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'BOA Bénin, Ecobank, BIIC, NSIA',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Loi N° 2021-14 portant bail d'habitation au Bénin",
      decreeOrLaw: "Loi N° 2021-14 du 20 décembre 2021",
      maxCautionMonths: 3,
      maxAvanceMonths: 3,
      description:
        "Au Bénin, la caution et l'avance sont expressément limitées à trois (3) mois chacune. La remise d'une quittance de loyer pour chaque paiement est une obligation légale sous peine de sanction.",
      officialAuthority: "Ministère du Cadre de Vie et des Transports & Mairies",
      requiresRegistration: true,
      adviceForLandlords: 'La quittance avec décharge exacte protège contre les amendes prévues par la Loi 2021-14.',
    },
  },

  ML: {
    code: 'ML',
    name: 'Mali',
    flag: '🇲🇱',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+223',
    phoneFormatPlaceholder: '+223 76 12 34 56',
    sampleOwnerName: 'Mamadou Lamine Traoré',
    sampleTenantName: 'Oumou Sangaré',
    cities: [
      {
        name: 'Bamako',
        communes: [
          'Commune I (Dravela, Djélibougou)',
          'Commune II (Bagadadji, Hippodrome, Zone Industrielle)',
          'Commune III (Centre, Badiallan, Koulouba)',
          'Commune IV (Hamdallaye ACI 2000, Lafiabougou)',
          'Commune V (Badalabougou, Baco-Djicoroni, Daoudabougou)',
          'Commune VI (Sogoniko, Faladié, Magnambougou)',
        ],
      },
      { name: 'Sikasso', communes: ['Sikasso Ville', 'Wayerma', 'Mancourani'] },
      { name: 'Ségou', communes: ['Ségou Centre', 'Angoulême', 'Sébougou'] },
      { name: 'Mopti', communes: ['Mopti Ville', 'Sévaré'] },
    ],
    paymentMethods: [
      {
        id: 'orange_money',
        label: 'Orange Money Mali',
        subLabel: '#144# / Orange Money ML',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'moov_money',
        label: 'Moov Africa Malitel',
        subLabel: '*166# / Malitel Money',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_money',
      },
      {
        id: 'wave',
        label: 'Wave Mali',
        subLabel: 'Wave App Mali 1%',
        type: 'mobile_money',
        badgeColor: 'border-sky-500 bg-sky-50 text-sky-950',
        provider: 'wave',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Règlement direct',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'BDM-SA, BNDA, BMS, Ecobank',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Réglementation des baux d'habitation au Mali",
      decreeOrLaw: "Décret portant réglementation des baux d'habitation",
      maxCautionMonths: 2,
      maxAvanceMonths: 2,
      description:
        'Au Mali, le dépôt de garantie ne doit pas excéder deux (2) mois de loyer. Les litiges relèvent des tribunaux de grande instance des communes de Bamako.',
      officialAuthority: "Ministère de l'Urbanisme et de l'Habitat & Mairies de Bamako",
      requiresRegistration: false,
      adviceForLandlords: 'Établissez toujours un état des lieux contradictoire avant remise des clés.',
    },
  },

  BF: {
    code: 'BF',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+226',
    phoneFormatPlaceholder: '+226 70 12 34 56',
    sampleOwnerName: 'Wendkouni Jean Ouédraogo',
    sampleTenantName: 'Aminata Sawadogo',
    cities: [
      {
        name: 'Ouagadougou',
        communes: [
          'Arrondissement 1 (Centre, Baskuy)',
          'Arrondissement 2 (Paspanga, Dapoya)',
          'Arrondissement 5 (Kalgondin, Wemtenga)',
          'Arrondissement 12 (Ouaga 2000, Patte d\'Oie)',
          'Arrondissement 9 (Kamboinsin)',
          'Arrondissement 6 (Gounghin)',
        ],
      },
      { name: 'Bobo-Dioulasso', communes: ['Arrondissement de Do', 'Arrondissement de Dafra', 'Arrondissement de Konsa'] },
      { name: 'Koudougou', communes: ['Secteur 1', 'Secteur 2', 'Secteur 3'] },
    ],
    paymentMethods: [
      {
        id: 'orange_money',
        label: 'Orange Money Burkina',
        subLabel: '*144# / Orange Money BF',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'moov_money',
        label: 'Moov Money Burkina',
        subLabel: '*555# / Moov Money BF',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_money',
      },
      {
        id: 'coris_money',
        label: 'Coris Money',
        subLabel: 'Coris Bank Mobile',
        type: 'mobile_money',
        badgeColor: 'border-red-600 bg-red-50 text-red-950',
        provider: 'coris_money',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Paiement direct en main propre',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'Coris Bank, BOA-BF, Ecobank, Vista Bank',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Loi portant bail d'habitation au Burkina Faso",
      decreeOrLaw: "Loi N° 015-2015/CNT portant bail d'habitation",
      maxCautionMonths: 2,
      maxAvanceMonths: 2,
      description:
        'La loi burkinabè protège les parties en limitant la caution à un maximum de deux (2) mois de loyer. Les révisions de loyer sont encadrées.',
      officialAuthority: "Ministère de l'Urbanisme, des Affaires Foncières et de l'Habitat",
      requiresRegistration: false,
      adviceForLandlords: 'Laissez un reçu numéroté pour chaque paiement perçu en espèces.',
    },
  },

  TG: {
    code: 'TG',
    name: 'Togo',
    flag: '🇹🇬',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+228',
    phoneFormatPlaceholder: '+228 90 12 34 56',
    sampleOwnerName: 'Kokou Mawuli Lawson',
    sampleTenantName: 'Akouvi Mensah',
    cities: [
      {
        name: 'Lomé',
        communes: [
          'Golfe 1 (Bè Afédomé, Bè Apéhémé)',
          'Golfe 2 (Tokoin, Hedzranawoé)',
          'Golfe 3 (Doumasséssé)',
          'Golfe 4 (Amoutivé, Déckon)',
          'Golfe 5 (Aflao Gakli)',
          'Golfe 7 (Aflao Sagbado)',
          'Agoè-Nyivé 1 (Agoè Centre)',
        ],
      },
      { name: 'Kara', communes: ['Kozah 1', 'Kozah 2', 'Kozah 3'] },
      { name: 'Sokodé', communes: ['Tchaoudjo 1', 'Tchaoudjo 2'] },
      { name: 'Kpalimé', communes: ['Kloto 1', 'Kloto 2'] },
    ],
    paymentMethods: [
      {
        id: 'tmoney',
        label: 'TMoney Togocom',
        subLabel: '*145# / TMoney Togo',
        type: 'mobile_money',
        badgeColor: 'border-yellow-500 bg-yellow-50 text-yellow-950',
        provider: 'tmoney',
      },
      {
        id: 'moov_flooz',
        label: 'Moov Money Flooz TG',
        subLabel: '*155# / Flooz Togo',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_flooz',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Règlement direct',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'Ecobank Togo, UTB, BTCI, Orabank, Coris',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Décret de plafonnement des cautions au Togo (Décret 2022-001)",
      decreeOrLaw: "Décret N° 2022-001/PR du 5 janvier 2022",
      maxCautionMonths: 3,
      maxAvanceMonths: 3,
      description:
        'Le décret togolais plafonne expressément la caution à 3 mois de loyer et l’avance à 3 mois de loyer. Tout montant supérieur est réputé nul.',
      officialAuthority: "Ministère de l'Urbanisme, de l'Habitat et de la Réforme Foncière",
      requiresRegistration: false,
      adviceForLandlords: 'Ne dépassez jamais le total de 3 mois de caution + 3 mois d’avance exigibles.',
    },
  },

  CD: {
    code: 'CD',
    name: 'RD Congo',
    flag: '🇨🇩',
    currency: 'USD',
    currencyCode: 'USD',
    currencySymbol: '$',
    phonePrefix: '+243',
    phoneFormatPlaceholder: '+243 81 234 5678',
    sampleOwnerName: 'Patrice Ilunga Mwamba',
    sampleTenantName: 'Mireille Kanyinda',
    cities: [
      {
        name: 'Kinshasa',
        communes: [
          'Gombe',
          'Ngaliema (Macampagne, Binza)',
          'Limete (Résidentiel, Industriel)',
          'Kintambo',
          'Bandalungwa',
          'Lemba',
          'Barumbu',
          'Lingwala',
          'Mont-Ngafula',
        ],
      },
      { name: 'Lubumbashi', communes: ['Lubumbashi', 'Kampemba', 'Kenya', 'Katuba', 'Ruashi'] },
      { name: 'Goma', communes: ['Goma Centre', 'Karisimbi', 'Himbi'] },
      { name: 'Matadi', communes: ['Matadi Centre', 'Nzanza', 'Mvuzi'] },
    ],
    paymentMethods: [
      {
        id: 'mpesa',
        label: 'M-Pesa Vodacom RDC',
        subLabel: '*1122# / M-Pesa App (USD / CDF)',
        type: 'mobile_money',
        badgeColor: 'border-red-600 bg-red-50 text-red-950',
        provider: 'mpesa',
      },
      {
        id: 'airtel_money',
        label: 'Airtel Money RDC',
        subLabel: '*501# / Airtel Money',
        type: 'mobile_money',
        badgeColor: 'border-rose-600 bg-rose-50 text-rose-950',
        provider: 'airtel_money',
      },
      {
        id: 'orange_money',
        label: 'Orange Money RDC',
        subLabel: '*144# / Orange Money RDC',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'afrimoney',
        label: 'Afrimoney RDC',
        subLabel: '*111# / Africell',
        type: 'mobile_money',
        badgeColor: 'border-purple-600 bg-purple-50 text-purple-950',
        provider: 'afrimoney',
      },
      {
        id: 'especes',
        label: 'Espèces (USD / Cash)',
        subLabel: 'Règlement en devises ou francs congolais',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'Rawbank, EquityBCDC, TMB, Sofibanque',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: 'Loi relative aux baux à loyer non professionnels en RDC',
      decreeOrLaw: "Loi N° 15/025 du 31 décembre 2015",
      maxCautionMonths: 3,
      maxAvanceMonths: 3,
      description:
        'La loi congolaise fixe la garantie locative à un maximum de trois (3) mois de loyer pour un usage résidentiel. La quittance est un moyen de preuve impératif.',
      officialAuthority: "Ministère de l'Urbanisme et Habitat & Hôtels de Ville",
      requiresRegistration: true,
      adviceForLandlords: 'Précisez clairement la devise contractuelle (USD ou équivalent CDF) sur la quittance.',
    },
  },

  GN: {
    code: 'GN',
    name: 'Guinée',
    flag: '🇬🇳',
    currency: 'GNF',
    currencyCode: 'GNF',
    currencySymbol: 'GNF',
    phonePrefix: '+224',
    phoneFormatPlaceholder: '+224 620 12 34 56',
    sampleOwnerName: 'Thierno Ousmane Diallo',
    sampleTenantName: 'Mariama Camara',
    cities: [
      {
        name: 'Conakry',
        communes: [
          'Kaloum (Centre administratif)',
          'Dixinn (Camayenne, Hafia)',
          'Matam (Madina, Bonfi)',
          'Ratoma (Kipé, Nongo, Taouyah, Lambanyi)',
          'Matoto (Enta, Sangoyah, Gbessia)',
        ],
      },
      { name: 'Kindia', communes: ['Kindia Centre', 'Damakania', 'Friguiagbé'] },
      { name: 'Labé', communes: ['Labé Centre', 'Daka', 'Pounthioun'] },
      { name: 'Kankan', communes: ['Kankan Centre', 'Bordo', 'Morialén'] },
    ],
    paymentMethods: [
      {
        id: 'orange_money',
        label: 'Orange Money Guinée',
        subLabel: '*144# / Orange Money GN',
        type: 'mobile_money',
        badgeColor: 'border-amber-600 bg-amber-50 text-amber-950',
        provider: 'orange_money',
      },
      {
        id: 'mtn_momo',
        label: 'MTN MoMo Guinée',
        subLabel: '*440# / MTN Areeba MoMo',
        type: 'mobile_money',
        badgeColor: 'border-yellow-500 bg-yellow-50 text-yellow-950',
        provider: 'mtn_momo',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash GNF)',
        subLabel: 'Règlement en Francs Guinéens',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'Vista Bank Guinée, Ecobank, SGBG, BICIGUI',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Code de la Construction et de l'Habitat de Guinée",
      decreeOrLaw: "Code de l'Habitat de la République de Guinée",
      maxCautionMonths: 2,
      maxAvanceMonths: 2,
      description:
        "L'avance et la caution sont encadrées à un maximum de 2 à 3 mois de loyer. Les bailleurs doivent délivrer un reçu certifié pour chaque versement.",
      officialAuthority: "Ministère de l'Urbanisme, de l'Habitat et de l'Aménagement du Territoire",
      requiresRegistration: false,
      adviceForLandlords: 'Mentionnez toujours le montant en toutes lettres en Francs Guinéens (GNF).',
    },
  },

  GA: {
    code: 'GA',
    name: 'Gabon',
    flag: '🇬🇦',
    currency: 'FCFA',
    currencyCode: 'XAF',
    currencySymbol: 'FCFA',
    phonePrefix: '+241',
    phoneFormatPlaceholder: '+241 77 12 34 56',
    sampleOwnerName: 'Jean-Pierre Nguema Ndong',
    sampleTenantName: 'Estelle Ondo Mba',
    cities: [
      {
        name: 'Libreville',
        communes: [
          '1er Arrondissement (Centre, Batterie 4, Sablière)',
          '2e Arrondissement (Camp de Police, Nkembo)',
          '3e Arrondissement (Mont-Bouët, Belle Vue)',
          '4e Arrondissement (Akébé, Plaine Niger)',
          '5e Arrondissement (Sotéga, Lalala)',
          '6e Arrondissement (Nzeng-Ayong)',
        ],
      },
      { name: 'Port-Gentil', communes: ['1er Arrondissement', '2e Arrondissement', '3e Arrondissement', '4e Arrondissement'] },
      { name: 'Franceville', communes: ['1er Arrondissement', '2e Arrondissement', '3e Arrondissement'] },
    ],
    paymentMethods: [
      {
        id: 'airtel_money',
        label: 'Airtel Money Gabon',
        subLabel: '*150# / Airtel Money GA',
        type: 'mobile_money',
        badgeColor: 'border-red-600 bg-red-50 text-red-950',
        provider: 'airtel_money',
      },
      {
        id: 'moov_money',
        label: 'Moov Africa Gabon Telecom',
        subLabel: '*555# / Moov Money GA',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_money',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Règlement direct avec reçu',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'BGFI Bank, UGB, BICIG, Ecobank Gabon',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Réglementation des baux d'habitation au Gabon",
      decreeOrLaw: "Loi régissant les rapports locatifs & Code Civil Gabonais",
      maxCautionMonths: 2,
      maxAvanceMonths: 2,
      description:
        'Au Gabon, la caution est légalement plafonnée à 2 mois de loyer. Les clauses résolutoires sont soumises à mise en demeure préalable.',
      officialAuthority: "Ministère de l'Habitat et de l'Urbanisme & Mairies",
      requiresRegistration: false,
      adviceForLandlords: 'Précisez l’état des compteurs SEEG (eau et électricité) lors de l’entrée des lieux.',
    },
  },

  NE: {
    code: 'NE',
    name: 'Niger',
    flag: '🇳🇪',
    currency: 'FCFA',
    currencyCode: 'XOF',
    currencySymbol: 'FCFA',
    phonePrefix: '+227',
    phoneFormatPlaceholder: '+227 96 12 34 56',
    sampleOwnerName: 'Elhadj Hassan Issoufou',
    sampleTenantName: 'Moustapha Garba',
    cities: [
      {
        name: 'Niamey',
        communes: [
          'Commune I (Plateau, Yantala, Koira Kano, Recasement)',
          'Commune II (Boukoki, Lazaret, Talladjé ouest)',
          'Commune III (Aéroport, Banifandou, Bassora, Gamkallé)',
          'Commune IV (Saga, Aéroport est)',
          'Commune V (Rive droite, Kirkissoye, Karadjé)',
        ],
      },
      { name: 'Maradi', communes: ['Commune I', 'Commune II', 'Commune III'] },
      { name: 'Zinder', communes: ['Commune I', 'Commune II', 'Commune III', 'Commune IV'] },
      { name: 'Tahoua', communes: ['Commune I', 'Commune II'] },
      { name: 'Agadez', communes: ['Commune I', 'Commune II'] },
    ],
    paymentMethods: [
      {
        id: 'airtel_money',
        label: 'Airtel Money Niger',
        subLabel: '*404# / Airtel Money NE',
        type: 'mobile_money',
        badgeColor: 'border-red-600 bg-red-50 text-red-950',
        provider: 'airtel_money',
      },
      {
        id: 'moov_flooz',
        label: 'Moov Flooz Niger',
        subLabel: '*155# / Flooz Niger',
        type: 'mobile_money',
        badgeColor: 'border-blue-600 bg-blue-50 text-blue-950',
        provider: 'moov_flooz',
      },
      {
        id: 'zamani_cash',
        label: 'Zamani Cash',
        subLabel: '*555# / Zamani Cash',
        type: 'mobile_money',
        badgeColor: 'border-orange-600 bg-orange-50 text-orange-950',
        provider: 'zamani_cash',
      },
      {
        id: 'al_izza',
        label: 'Al Izza Cash',
        subLabel: 'Réseau Al Izza / Nita',
        type: 'mobile_money',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'al_izza',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Validation immédiate par collecteur',
        type: 'cash',
        badgeColor: 'border-emerald-700 bg-emerald-50 text-emerald-900',
        provider: 'cash',
      },
      {
        id: 'virement',
        label: 'Virement bancaire',
        subLabel: 'SONIBANK, BOA-Niger, BIA, Ecobank Niger',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
    ],
    regulations: {
      title: "Réglementation des baux et plafonnement des loyers au Niger",
      decreeOrLaw: "Décret N° 2026/PRN/MU du 15 Avril 2026",
      maxCautionMonths: 2,
      maxAvanceMonths: 1,
      description:
        "Le décret nigérien fixe les plafonds de loyer par zone et oblige à la déclaration officielle du bail auprès de la mairie d'arrondissement sous un délai de 3 mois.",
      officialAuthority: "Ministère de l'Urbanisme et du Logement & Mairies de Niamey",
      requiresRegistration: true,
      adviceForLandlords: 'La déclaration communale du bail sous 3 mois évite le blocage des procédures et les pénalités.',
    },
  },

  INT: {
    code: 'INT',
    name: 'Diaspora / International',
    flag: '🌍',
    currency: 'EUR',
    currencyCode: 'EUR',
    currencySymbol: '€',
    phonePrefix: '+33',
    phoneFormatPlaceholder: '+33 6 12 34 56 78',
    sampleOwnerName: 'Diaspora Management SARL',
    sampleTenantName: 'Marc Dupont',
    cities: [
      { name: 'Paris', communes: ['Paris Centre', '15e Arr.', '16e Arr.', '17e Arr.'] },
      { name: 'Bruxelles', communes: ['Bruxelles-Ville', 'Ixelles', 'Uccle'] },
      { name: 'Genève', communes: ['Genève Centre', 'Carouge'] },
      { name: 'Montréal', communes: ['Ville-Marie', 'Plateau-Mont-Royal', 'Côte-des-Neiges'] },
    ],
    paymentMethods: [
      {
        id: 'virement',
        label: 'Virement SEPA / Swift',
        subLabel: 'Virement bancaire international',
        type: 'bank',
        badgeColor: 'border-indigo-600 bg-indigo-50 text-indigo-950',
        provider: 'bank',
      },
      {
        id: 'carte_bancaire',
        label: 'Carte Bancaire (Stripe / CB)',
        subLabel: 'Visa, Mastercard',
        type: 'card',
        badgeColor: 'border-purple-600 bg-purple-50 text-purple-950',
        provider: 'card',
      },
      {
        id: 'wave',
        label: 'Wave Transfert',
        subLabel: 'Envoi direct Afrique',
        type: 'mobile_money',
        badgeColor: 'border-sky-500 bg-sky-50 text-sky-950',
        provider: 'wave',
      },
      {
        id: 'especes',
        label: 'Espèces (Cash)',
        subLabel: 'Paiement en mains propres',
        type: 'cash',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-950',
        provider: 'cash',
      },
    ],
    regulations: {
      title: "Gestion locative pour la Diaspora Francophone",
      decreeOrLaw: "Bail de droit commun & Gestion patrimoniale à distance",
      maxCautionMonths: 2,
      maxAvanceMonths: 1,
      description:
        "Supervision à distance de vos parcs immobiliers dans les capitales africaines avec génération de quittances certifiées et téléchargeables.",
      officialAuthority: "Juridiction du lieu de situation de l'immeuble",
      requiresRegistration: true,
      adviceForLandlords: 'Automatisez vos quittances certifiées pour sécuriser vos encaissements depuis l’étranger.',
    },
  },
};

export const DEFAULT_COUNTRY_CODE = 'SN'; // Default to Senegal or user chosen

export function getCountryConfig(code?: string): CountryConfig {
  if (!code) return FRANCOPHONE_COUNTRIES.SN;
  const upper = code.toUpperCase();
  return FRANCOPHONE_COUNTRIES[upper] || FRANCOPHONE_COUNTRIES.SN;
}

export function getAllCountries(): CountryConfig[] {
  return Object.values(FRANCOPHONE_COUNTRIES);
}
