import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CountryConfig,
  FRANCOPHONE_COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
  getAllCountries,
} from '../utils/countryConfig';
import {
  formatMoney as formatMoneyUtil,
  montantEnLettres as montantEnLettresUtil,
  formatPhoneNumber,
  cleanPhoneForWhatsApp as cleanPhoneUtil,
} from '../utils/formatters';

interface CountryContextType {
  country: CountryConfig;
  countryCode: string;
  setCountryCode: (code: string) => void;
  formatMoney: (amount?: number | null) => string;
  montantEnLettres: (amount?: number | null) => string;
  formatPhone: (phone: string) => string;
  cleanPhoneForWhatsApp: (phone: string) => string;
  allCountries: CountryConfig[];
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const STORAGE_COUNTRY_KEY = 'loyerfacile_country_code_v1';

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countryCode, setCountryCodeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_COUNTRY_KEY);
      if (saved && FRANCOPHONE_COUNTRIES[saved]) {
        return saved;
      }
    }
    return DEFAULT_COUNTRY_CODE;
  });

  const country = getCountryConfig(countryCode);

  const setCountryCode = (code: string) => {
    if (FRANCOPHONE_COUNTRIES[code]) {
      setCountryCodeState(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_COUNTRY_KEY, code);
      }
    }
  };

  const formatMoney = (amount?: number | null): string => {
    return formatMoneyUtil(amount, country.currencySymbol || country.currency);
  };

  const montantEnLettres = (amount?: number | null): string => {
    return montantEnLettresUtil(amount, country.currency);
  };

  const formatPhone = (phone: string): string => {
    return formatPhoneNumber(phone, country.phonePrefix);
  };

  const cleanPhoneForWhatsApp = (phone: string): string => {
    return cleanPhoneUtil(phone, country.phonePrefix);
  };

  return (
    <CountryContext.Provider
      value={{
        country,
        countryCode,
        setCountryCode,
        formatMoney,
        montantEnLettres,
        formatPhone,
        cleanPhoneForWhatsApp,
        allCountries: getAllCountries(),
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export function useCountry(): CountryContextType {
  const context = useContext(CountryContext);
  if (!context) {
    // Fallback if rendered outside provider
    const country = getCountryConfig(DEFAULT_COUNTRY_CODE);
    return {
      country,
      countryCode: DEFAULT_COUNTRY_CODE,
      setCountryCode: () => {},
      formatMoney: (amt) => formatMoneyUtil(amt, country.currencySymbol),
      montantEnLettres: (amt) => montantEnLettresUtil(amt, country.currency),
      formatPhone: (ph) => formatPhoneNumber(ph, country.phonePrefix),
      cleanPhoneForWhatsApp: (ph) => cleanPhoneUtil(ph, country.phonePrefix),
      allCountries: getAllCountries(),
    };
  }
  return context;
}
