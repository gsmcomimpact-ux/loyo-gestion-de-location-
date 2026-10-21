import React, { useState } from 'react';
import { UserRole, Language, FormuleAbonnement } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useCountry } from '../contexts/CountryContext';
import { Building2, UserCheck, Shield, ChevronDown, Globe, Check } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  totalLogements: number;
  currentPlan: FormuleAbonnement;
  onOpenSmsOutbox: () => void;
  unreadSmsCount: number;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeRole,
  onChangeRole,
  language,
  onChangeLanguage,
  totalLogements,
  currentPlan,
  onOpenSmsOutbox,
  onResetDemo,
}) => {
  const { country, countryCode, setCountryCode, allCountries } = useCountry();
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', roles: ['proprietaire', 'admin'] },
    { id: 'collector_desk', label: 'Espace Collecteur', roles: ['collecteur'] },
    { id: 'payments', label: 'Paiements & Quittances', roles: ['proprietaire', 'collecteur', 'admin'] },
    { id: 'properties', label: 'Logements', roles: ['proprietaire', 'admin'] },
    { id: 'tenants', label: 'Locataires', roles: ['proprietaire', 'admin'] },
    { id: 'declarations', label: 'Contrats & Déclarations', roles: ['proprietaire', 'admin'] },
    { id: 'collectors', label: 'Collecteurs', roles: ['proprietaire'] },
    { id: 'admin', label: 'Réglementation & Admin', roles: ['admin'] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 shadow-md">
      {/* Top bar contract zone */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark & Active Country */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-black text-white text-base shadow-sm ring-1 ring-emerald-400/40 tracking-tight">
            LO
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap flex items-center gap-2">
              <span>Loyo</span>
              {/* Country Badge Button */}
              <button
                onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
                className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-700/80 hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                title="Changer de pays francophone"
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono">({country.currencySymbol})</span>
                <ChevronDown className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
            <div className="text-[10px] text-stone-400 leading-none hidden sm:block truncate max-w-[280px]">
              {country.regulations.title}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {visibleNav.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions, Country Selector, Role switcher and Install */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Country Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
              className="px-2.5 py-1.5 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg flex items-center gap-1.5 transition"
              title="Sélectionner le pays francophone"
            >
              <span className="text-base leading-none">{country.flag}</span>
              <span className="hidden md:inline font-bold">{country.name}</span>
              <span className="text-[10px] bg-stone-900 text-emerald-400 px-1 py-0.2 rounded font-mono">
                {country.currencySymbol}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {/* Country Dropdown Modal / Popover */}
            {isCountryMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs"
                  onClick={() => setIsCountryMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl py-3 px-3 z-50 text-stone-100 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 px-1">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        Choisir le Pays Francophone
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">
                      Réglementations & devises adaptées
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {allCountries.map((c) => {
                      const isSelected = c.code === countryCode;
                      const operators = c.paymentMethods
                        .filter((p) => p.type === 'mobile_money')
                        .map((p) => p.label.split(' ')[0])
                        .slice(0, 3)
                        .join(', ');

                      return (
                        <button
                          key={c.code}
                          onClick={() => {
                            setCountryCode(c.code);
                            setIsCountryMenuOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-emerald-950/80 border-emerald-600 text-white'
                              : 'bg-stone-800/70 hover:bg-stone-800 border-stone-700/60 text-stone-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0 leading-none mt-0.5">{c.flag}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs">{c.name}</span>
                                <span className="text-[10px] font-mono font-bold bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/50">
                                  {c.currencySymbol}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {c.phonePrefix}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-400 truncate mt-0.5">
                                Mobile Money : <span className="text-stone-300">{operators || 'Espèces / Virement'}</span>
                              </p>
                              <p className="text-[9px] text-emerald-400/90 truncate mt-0.5">
                                {c.regulations.decreeOrLaw}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-stone-900 flex items-center justify-center shrink-0 mt-1">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SMS Outbox icon button */}
          <button
            onClick={onOpenSmsOutbox}
            className="px-2.5 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg flex items-center gap-1.5 transition"
            title="Historique des SMS envoyés aux locataires"
          >
            <span>SMS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          {/* Language Selector */}
          <div className="hidden sm:flex items-center bg-stone-800 rounded-lg p-0.5 text-xs font-bold">
            {(['fr', 'ha', 'dje'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onChangeLanguage(lang)}
                className={`px-2 py-1 rounded-md transition ${
                  language === lang
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Role Switcher */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 bg-stone-800 text-stone-200 border border-stone-700 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer">
              {activeRole === 'proprietaire' && <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
              {activeRole === 'collecteur' && <UserCheck className="w-3.5 h-3.5 text-amber-400" />}
              {activeRole === 'admin' && <Shield className="w-3.5 h-3.5 text-sky-400" />}
              <span className="capitalize hidden md:inline">{activeRole}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </div>
            <div className="absolute right-0 mt-1 w-48 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                Changer de rôle
              </div>
              <button
                onClick={() => onChangeRole('proprietaire')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-stone-800 ${
                  activeRole === 'proprietaire' ? 'text-emerald-400 font-bold' : 'text-stone-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Propriétaire / Bailleur</span>
              </button>
              <button
                onClick={() => onChangeRole('collecteur')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-stone-800 ${
                  activeRole === 'collecteur' ? 'text-amber-400 font-bold' : 'text-stone-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Collecteur de loyers</span>
              </button>
              <button
                onClick={() => onChangeRole('admin')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-stone-800 ${
                  activeRole === 'admin' ? 'text-sky-400 font-bold' : 'text-stone-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administrateur Régie</span>
              </button>
              <div className="border-t border-stone-800 my-1" />
              <button
                onClick={onResetDemo}
                className="w-full text-left px-3 py-1.5 text-[11px] text-amber-400 hover:bg-stone-800"
              >
                Réinitialiser les données de démo
              </button>
            </div>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Mobile navigation row (scrollable horizontal buttons) */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 bg-stone-950 overflow-x-auto border-t border-stone-800 scrollbar-none">
        {visibleNav.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-400 hover:text-white bg-stone-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
