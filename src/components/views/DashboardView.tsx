import React, { useState } from 'react';
import { AppDatabase, Bail, Locataire, Echeance } from '../../types';
import { formatDate, MOIS_FR } from '../../utils/formatters';
import { calculateDeclarationCountdown } from '../../services/rentCapService';
import { activeSmsProvider } from '../../services/smsProvider';
import { buildEcheanceSmsContent, getPreferredReceptionNumber, getTenantPaymentUrl } from '../../services/echeanceService';
import { useCountry } from '../../contexts/CountryContext';
import {
  Banknote,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building,
  MessageCircle,
  Scale,
  Smartphone,
  Info,
  ClipboardPaste,
  Check,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  db: AppDatabase;
  onOpenQuickPay: (logementId?: string) => void;
  onOpenAddHousing: () => void;
  onOpenAddTenant: () => void;
  onNavigateTab: (tab: string) => void;
  onSmsSent: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  onOpenQuickPay,
  onOpenAddHousing,
  onOpenAddTenant,
  onNavigateTab,
  onSmsSent,
}) => {
  const { country, formatMoney } = useCountry();
  const proprietaire = db.proprietaires[0];

  const currentMonth = 10; // Octobre
  const currentYear = 2026;

  // Calcul du total attendu
  const occupiedLogements = db.logements.filter((l) => l.statut === 'occupe');
  const totalAttendu = occupiedLogements.reduce((sum, l) => sum + l.loyerMensuel, 0);

  // 1. CONFIRMÉ : Total encaissé confirmé pour le mois
  const paiementsConfirmes = db.paiements.filter(
    (p) => p.periodeMois === currentMonth && p.periodeAnnee === currentYear && p.statut === 'confirme'
  );
  const totalConfirme = paiementsConfirmes.reduce((sum, p) => sum + p.montant, 0);
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalConfirme / totalAttendu) * 100) : 0;

  // 2. EN ATTENTE DE CONFIRMATION : Paiements signalés par locataires non encore validés
  const paiementsEnAttente = db.paiements.filter(
    (p) => p.statut === 'en_attente_confirmation'
  );
  const totalEnAttente = paiementsEnAttente.reduce((sum, p) => sum + p.montant, 0);

  // 3. EN RETARD : Échéances échues sans paiement complet et non signalées
  // RÈGLE : Les relances s'arrêtent dès qu'un paiement est signalé par le locataire
  const echeancesEnRetard = db.echeances.filter(
    (e) => e.statut === 'en_retard' || (e.statut === 'paye_partiellement' && e.montantDu > e.montantPaye)
  );
  const totalEnRetard = echeancesEnRetard.reduce(
    (sum, e) => sum + Math.max(0, e.montantDu - e.montantPaye),
    0
  );

  // Cautions détenues
  const totalCautions = db.locataires
    .filter((loc) => loc.statut === 'actif')
    .reduce((sum, loc) => sum + (loc.cautionVersee - (loc.cautionRestituee || 0)), 0);

  // Déclarations de bail
  const bauxADeclarer = db.baux
    .map((bail) => {
      const countdown = calculateDeclarationCountdown(bail);
      const log = db.logements.find((l) => l.id === bail.logementId);
      const loc = db.locataires.find((lc) => lc.id === bail.locataireId);
      return { bail, countdown, log, loc };
    })
    .filter((item) => item.bail.statutDeclaration === 'a_faire' || item.countdown.isOverdue)
    .sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft);

  // Action d'envoi rapide de rappel SMS avec référence et lien
  const [sendingSmsId, setSendingSmsId] = React.useState<string | null>(null);
  const handleSendReminderSms = async (ech: Echeance) => {
    setSendingSmsId(ech.id);
    const loc = db.locataires.find((l) => l.id === ech.locataireId);
    const log = db.logements.find((l) => l.id === ech.logementId);
    if (!loc || !log) return;

    const nr = getPreferredReceptionNumber(db, log, proprietaire.id);
    const text = buildEcheanceSmsContent({
      locataire: loc,
      logement: log,
      echeance: ech,
      numeroReception: nr,
      currency: country.currencySymbol,
    });

    await activeSmsProvider.sendSms({
      destinataire: loc.telephone,
      destinataireNom: loc.nom,
      type: 'relance',
      langue: loc.langue || 'fr',
      contenu: text,
    });

    db.messagesSMS.unshift({
      id: `sms_${Date.now()}`,
      destinataire: loc.telephone,
      destinataireNom: loc.nom,
      type: 'relance',
      langue: loc.langue || 'fr',
      contenu: text,
      statutEnvoi: 'envoye',
      date: new Date().toISOString(),
    });

    onSmsSent();
    setSendingSmsId(null);
  };

  return (
    <div className="space-y-6">
      {/* Bannière d'accueil rapide avec actions principales */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>{country.flag}</span>
                <span>{country.name}</span>
                <span>•</span>
                <span>{country.currencySymbol}</span>
              </span>
              <span className="text-[11px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60 font-medium">
                Paiement Direct Propriétaire
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Tableau de Bord — {MOIS_FR[currentMonth - 1]} {currentYear}
            </h1>
            <p className="text-xs text-stone-300 mt-1 max-w-xl">
              {occupiedLogements.length} logements occupés sur {db.logements.length} au total. Conforme à la réglementation : {country.regulations.decreeOrLaw}.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenQuickPay()}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>Encaisser un loyer direct</span>
            </button>
            <button
              onClick={() => onNavigateTab('payments')}
              className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 border border-stone-700 transition"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coller un SMS opérateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* AVERTISSEMENT CAPITAL : LOYO NE REÇOIT PAS VOTRE ARGENT */}
      <div className="bg-amber-500/10 border border-amber-300/70 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-sm text-amber-900 block">
            Loyo ne reçoit pas votre argent : vous payez directement votre propriétaire.
          </span>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            L'application ne touche JAMAIS aux fonds des loyers. Le locataire paie directement le propriétaire, en espèces ou par mobile money sur les numéros du propriétaire. Loyo enregistre, fait confirmer et émet la quittance officielle certifiée.
          </p>
        </div>
      </div>

      {/* ALERTE SPÉCIALE : PAIEMENTS EN ATTENTE DE CONFIRMATION */}
      {paiementsEnAttente.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-amber-950 text-sm">
                {paiementsEnAttente.length} paiement{paiementsEnAttente.length > 1 ? 's' : ''} signalé{paiementsEnAttente.length > 1 ? 's' : ''} en attente de confirmation !
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                Total : <strong className="font-mono">{formatMoney(totalEnAttente)}</strong>. Vos locataires ont cliqué "J'ai payé" et attendent l'émission de leur quittance.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('payments')}
            className="py-2 px-4 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
          >
            <span>Vérifier & Confirmer maintenant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3 KPIs PRINCIPAUX SÉPARÉS (CONFIRMÉ, EN ATTENTE, EN RETARD) SELON LA SPÉCIFICATION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1 : CONFIRMÉ */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Loyers Confirmés</span>
              </span>
              <span className="text-xs font-bold text-emerald-700 font-mono">{tauxRecouvrement}%</span>
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
              {formatMoney(totalConfirme)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Sur {formatMoney(totalAttendu)} attendus ce mois ({paiementsConfirmes.length} règlements soldés)
            </p>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(tauxRecouvrement, 100)}%` }}
            />
          </div>
        </div>

        {/* KPI 2 : EN ATTENTE DE CONFIRMATION */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
          paiementsEnAttente.length > 0
            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/40'
            : 'bg-white border-stone-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>En attente de confirmation</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono">
                {paiementsEnAttente.length}
              </span>
            </div>
            <div className="text-2xl font-black text-amber-950 mt-2 font-mono tabular-nums">
              {formatMoney(totalEnAttente)}
            </div>
            <p className="text-[11px] text-amber-800 mt-1">
              {paiementsEnAttente.length > 0
                ? 'Signalés par les locataires via Mobile Money'
                : 'Aucun versement en attente de visa'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1 mt-3"
          >
            <span>Accéder à la file</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* KPI 3 : EN RETARD */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
          echeancesEnRetard.length > 0
            ? 'bg-red-50/60 border-red-200'
            : 'bg-white border-stone-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Loyers en Retard</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-200 text-red-900 font-mono">
                {echeancesEnRetard.length}
              </span>
            </div>
            <div className="text-2xl font-black text-red-950 mt-2 font-mono tabular-nums">
              {formatMoney(totalEnRetard)}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {echeancesEnRetard.length > 0
                ? `${echeancesEnRetard.length} locataire(s) avec solde restant impayé`
                : 'Aucun retard constaté'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-xs font-bold text-red-900 hover:underline flex items-center gap-1 mt-3"
          >
            <span>Gérer les relances</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2 Colonnes : File des retards & Déclarations de baux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section Retards & Relances avec Liens */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-stone-900">
                  Relances de Loyer ({echeancesEnRetard.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
              >
                <span>Voir les échéances</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-stone-100 mt-2">
              {echeancesEnRetard.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Tous les loyers échus ont été réglés ou sont à jour.
                </div>
              ) : (
                echeancesEnRetard.map((ech) => {
                  const loc = db.locataires.find((l) => l.id === ech.locataireId);
                  const log = db.logements.find((l) => l.id === ech.logementId);
                  const reste = Math.max(0, ech.montantDu - ech.montantPaye);

                  return (
                    <div key={ech.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span>{loc?.nom}</span>
                          <span className="font-mono text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded">
                            {ech.referenceCourte}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {log?.libelle} · Reste : <strong className="text-red-700 font-mono">{formatMoney(reste)}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendReminderSms(ech)}
                        disabled={sendingSmsId === ech.id}
                        className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1 border border-emerald-200 transition shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>{sendingSmsId === ech.id ? 'Envoi...' : 'SMS + Lien'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Section Déclarations & Baux */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-stone-900">
                  Déclarations de Bail ({bauxADeclarer.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('declarations')}
                className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
              >
                <span>Voir les baux</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-stone-100 mt-2">
              {bauxADeclarer.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Tous les baux sont enregistrés auprès des mairies ou communes.
                </div>
              ) : (
                bauxADeclarer.slice(0, 3).map((item) => (
                  <div key={item.bail.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{item.loc?.nom}</div>
                      <div className="text-[11px] text-stone-500">
                        {item.log?.libelle} ({item.bail.communeDepot || 'Commune centrale'})
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      J-{item.countdown.daysLeft} jours
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
