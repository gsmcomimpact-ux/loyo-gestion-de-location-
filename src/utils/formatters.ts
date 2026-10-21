/**
 * Formatage monétaire, calendaire et téléphonique pour l'espace francophone
 * - Monnaies : FCFA (XOF/XAF), GNF (Guinée), USD ($ RDC), EUR (€ Diaspora)
 * - Dates : format standard JJ/MM/AAAA
 * - Téléphones : indicatifs internationaux adaptés (+221, +225, +237, +229, +227, +243, +224, etc.)
 */

export function formatMoney(amount: number | undefined | null, currency: string = 'FCFA'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${currency}`;
  }
  const rounded = Math.round(amount);
  // Séparateur de milliers par espace (norme internationale & OHADA/UEMOA)
  const parts = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (currency === '$' || currency === 'USD') {
    return `${parts} $`;
  }
  if (currency === '€' || currency === 'EUR') {
    return `${parts} €`;
  }
  return `${parts} ${currency}`;
}

/**
 * Rétro-compatibilité pour les composants existants appelant formatFCFA
 */
export function formatFCFA(amount: number | undefined | null, currency: string = 'FCFA'): string {
  return formatMoney(amount, currency);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function getMonthName(monthNumber: number): string {
  return MOIS_FR[monthNumber - 1] || `Mois ${monthNumber}`;
}

/**
 * Formatage universel de numéros de téléphone pour pays francophones
 */
export function formatPhoneNumber(phone: string, defaultPrefix: string = '+221'): string {
  if (!phone) return '';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) {
    // Déjà avec indicatif international
    return clean.replace(/(\+\d{3})(\d{2,3})(\d{2,3})(\d{2,4})/, '$1 $2 $3 $4').trim();
  }
  // Sans indicatif : ajoute l'indicatif du pays actif
  return `${defaultPrefix} ${clean}`;
}

export function formatNigerPhone(phone: string): string {
  return formatPhoneNumber(phone, '+227');
}

/**
 * Nettoie le numéro pour WhatsApp (chiffres uniquement avec indicatif)
 */
export function cleanPhoneForWhatsApp(phone: string, defaultPrefix: string = '+221'): string {
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) {
    return clean.substring(1);
  }
  const prefixDigits = defaultPrefix.replace(/\D/g, '');
  if (!clean.startsWith(prefixDigits)) {
    return `${prefixDigits}${clean}`;
  }
  return clean;
}

/**
 * Conversion d'un montant numérique en toutes lettres (Français)
 * Ex: 35 000 FCFA -> "Trente-cinq mille francs CFA"
 * Ex: 1 500 000 GNF -> "Un million cinq cent mille francs guinéens"
 */
export function montantEnLettres(n: number | undefined | null, currency: string = 'FCFA'): string {
  let currencyLabel = 'francs CFA';
  const currUpper = currency.toUpperCase().trim();
  if (currUpper === 'GNF') {
    currencyLabel = 'francs guinéens';
  } else if (currUpper === 'USD' || currUpper === '$') {
    currencyLabel = 'dollars américains';
  } else if (currUpper === 'EUR' || currUpper === '€') {
    currencyLabel = 'euros';
  } else if (currUpper === 'CDF') {
    currencyLabel = 'francs congolais';
  }

  if (!n || isNaN(n) || n === 0) return `Zéro ${currencyLabel}`;

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const particuliers = [
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
  ];
  const dizaines = [
    '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
    'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'
  ];

  function convertirMoinsDeCent(num: number): string {
    if (num === 0) return '';
    if (num < 10) return unites[num];
    if (num >= 10 && num < 20) return particuliers[num - 10];

    const d = Math.floor(num / 10);
    const u = num % 10;

    if (d === 7) {
      if (u === 1) return 'soixante-et-onze';
      return `soixante-${particuliers[u]}`;
    }
    if (d === 8) {
      if (u === 0) return 'quatre-vingts';
      return `quatre-vingt-${unites[u]}`;
    }
    if (d === 9) {
      return `quatre-vingt-${particuliers[u]}`;
    }

    if (u === 1) return `${dizaines[d]}-et-un`;
    if (u > 0) return `${dizaines[d]}-${unites[u]}`;
    return dizaines[d];
  }

  function convertirMoinsDeMille(num: number): string {
    if (num === 0) return '';
    const c = Math.floor(num / 100);
    const reste = num % 100;

    let res = '';
    if (c === 1) {
      res = 'cent';
    } else if (c > 1) {
      res = `${unites[c]} cent${reste === 0 ? 's' : ''}`;
    }

    const suite = convertirMoinsDeCent(reste);
    if (suite) {
      res = res ? `${res} ${suite}` : suite;
    }
    return res;
  }

  const num = Math.round(Math.abs(n));
  let resultat = '';

  const millions = Math.floor(num / 1000000);
  const milliers = Math.floor((num % 1000000) / 1000);
  const reste = num % 100;

  if (millions > 0) {
    if (millions === 1) {
      resultat += 'un million ';
    } else {
      resultat += `${convertirMoinsDeMille(millions)} millions `;
    }
  }

  if (milliers > 0) {
    if (milliers === 1) {
      resultat += 'mille ';
    } else {
      resultat += `${convertirMoinsDeMille(milliers)} mille `;
    }
  }

  const centReste = num % 1000;
  if (centReste > 0) {
    resultat += convertirMoinsDeMille(centReste);
  }

  resultat = resultat.trim();
  if (!resultat) return `Zéro ${currencyLabel}`;

  const formatted = resultat.charAt(0).toUpperCase() + resultat.slice(1);
  return `${formatted} ${currencyLabel}`;
}
