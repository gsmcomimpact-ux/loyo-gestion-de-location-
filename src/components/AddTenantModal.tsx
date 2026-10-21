import React, { useState, useEffect } from 'react';
import { Locataire, Bail, Logement, Language, AppDatabase } from '../types';
import { useCountry } from '../contexts/CountryContext';
import { X, UserPlus, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onTenantAdded: (locataire: Locataire, bail: Bail) => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  isOpen,
  onClose,
  db,
  onTenantAdded,
}) => {
  const { country, formatMoney } = useCountry();
  const vacantLogements = db.logements.filter((l) => l.statut === 'libre');

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState(country.phonePrefix + ' ');
  const [langue, setLangue] = useState<Language>('fr');
  const [logementId, setLogementId] = useState<string>(vacantLogements[0]?.id || db.logements[0]?.id || '');
  const [jourEcheance, setJourEcheance] = useState<number>(5);
  const [dateEntree, setDateEntree] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cautionVersee, setCautionVersee] = useState<number>(70000);
  const [avanceVersee, setAvanceVersee] = useState<number>(35000);

  // Update telephone prefix when country changes
  useEffect(() => {
    if (!telephone || telephone.startsWith('+')) {
      setTelephone(country.phonePrefix + ' ');
    }
  }, [country.phonePrefix]);

  // Sync default caution and loyer when logementId changes
  useEffect(() => {
    const selectedLog = db.logements.find((l) => l.id === logementId);
    if (selectedLog) {
      setCautionVersee(selectedLog.caution || selectedLog.loyerMensuel * country.regulations.maxCautionMonths);
      setAvanceVersee(selectedLog.loyerMensuel);
    }
  }, [logementId, db.logements, country.regulations.maxCautionMonths]);

  if (!isOpen) return null;

  const selectedLog = db.logements.find((l) => l.id === logementId);
  const selectedBien = db.biens.find((b) => b.id === selectedLog?.bienId);

  const maxLegalCaution = selectedLog ? selectedLog.loyerMensuel * country.regulations.maxCautionMonths : 0;
  const isCautionOverCap = maxLegalCaution > 0 && cautionVersee > maxLegalCaution;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim() || !logementId || !selectedLog) return;

    // Date de début + 3 mois = date limite légale de déclaration
    const startDate = new Date(dateEntree);
    const deadlineDate = new Date(startDate);
    deadlineDate.setMonth(deadlineDate.getMonth() + 3);

    const tenantId = `loc_${Date.now()}`;
    const newLocataire: Locataire = {
      id: tenantId,
      nom: nom.trim(),
      telephone: telephone.trim(),
      langue,
      logementId,
      dateEntree,
      jourEcheance,
      cautionVersee,
      statut: 'actif',
    };

    const newBail: Bail = {
      id: `bail_${Date.now()}`,
      logementId,
      locataireId: tenantId,
      proprietaireId: db.proprietaires[0].id,
      dateDebut: dateEntree,
      loyer: selectedLog.loyerMensuel,
      cautionVersee,
      avanceVersee,
      dateLimiteDeclaration: deadlineDate.toISOString().split('T')[0],
      statutDeclaration: 'a_faire',
      communeDepot: selectedBien?.commune || country.cities[0]?.communes[0] || 'Commune Centrale',
    };

    onTenantAdded(newLocataire, newBail);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">Nouveau locataire</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                {country.flag} {country.name}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Enregistrement et vérification de conformité du bail ({country.currencySymbol})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Encadré réglementation pays */}
        <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Règle légale : {country.regulations.decreeOrLaw}</span>
          </div>
          <p className="text-[11px] text-stone-600">
            {country.regulations.adviceForLandlords}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Nom du locataire */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Nom et Prénom(s) du Locataire *
            </label>
            <input
              type="text"
              placeholder={`Ex: ${country.sampleTenantName}`}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-300 p-2.5 bg-stone-50 focus:border-emerald-600 focus:outline-none font-semibold text-stone-900"
              required
            />
          </div>

          {/* Téléphone & Langue */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Numéro WhatsApp / Tél *
              </label>
              <input
                type="text"
                placeholder={country.phoneFormatPlaceholder}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Langue de notification
              </label>
              <select
                value={langue}
                onChange={(e) => setLangue(e.target.value as Language)}
                className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
              >
                <option value="fr">Français</option>
                <option value="ha">Haoussa</option>
                <option value="dje">Zarma / Djerma</option>
              </select>
            </div>
          </div>

          {/* Logement assigné */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Logement à attribuer *
            </label>
            <select
              value={logementId}
              onChange={(e) => setLogementId(e.target.value)}
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
              required
            >
              {db.logements.map((log) => {
                const b = db.biens.find((bi) => bi.id === log.bienId);
                return (
                  <option key={log.id} value={log.id}>
                    {log.libelle} ({log.type}) — {b?.nom} — {formatMoney(log.loyerMensuel)}/mois{' '}
                    {log.statut === 'occupe' ? '⚠️ (Déjà occupé)' : '✓ Libre'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date d'entrée & Jour d'échéance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Date d'entrée
              </label>
              <input
                type="date"
                value={dateEntree}
                onChange={(e) => setDateEntree(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Jour d'échéance mensuel
              </label>
              <select
                value={jourEcheance}
                onChange={(e) => setJourEcheance(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-bold"
              >
                <option value={1}>Le 1er du mois</option>
                <option value={5}>Le 5 du mois (Recommandé)</option>
                <option value={10}>Le 10 du mois</option>
                <option value={15}>Le 15 du mois</option>
                <option value={25}>Le 25 du mois</option>
              </select>
            </div>
          </div>

          {/* Caution & Avance avec vérification réglementaire */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Caution versée ({country.currencySymbol})
              </label>
              <input
                type="number"
                value={cautionVersee}
                onChange={(e) => setCautionVersee(Number(e.target.value))}
                className={`w-full text-xs font-bold rounded-xl border p-2.5 bg-stone-50 font-mono ${
                  isCautionOverCap ? 'border-amber-500 text-amber-900 bg-amber-50/50' : 'border-stone-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Avance versée ({country.currencySymbol})
              </label>
              <input
                type="number"
                value={avanceVersee}
                onChange={(e) => setAvanceVersee(Number(e.target.value))}
                className="w-full text-xs font-bold rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-mono"
              />
            </div>
          </div>

          {/* Alerte si dépassement du plafond de caution */}
          {isCautionOverCap && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention : Plafond légal de caution dépassé</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Pour {country.name}, la caution légale est plafonnée à {country.regulations.maxCautionMonths} mois de loyer ({formatMoney(maxLegalCaution)} max).
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer le locataire et générer le bail</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
