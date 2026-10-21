import React, { useState } from 'react';
import { HousingType, Logement, Bien, AppDatabase } from '../types';
import { checkRentCap, checkRentIncrease } from '../services/rentCapService';
import { useCountry } from '../contexts/CountryContext';
import { X, AlertTriangle, ShieldAlert, Sparkles, Building2, Check } from 'lucide-react';

interface AddHousingModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onLogementAdded: (logement: Logement) => void;
  editingLogement?: Logement | null;
}

export const AddHousingModal: React.FC<AddHousingModalProps> = ({
  isOpen,
  onClose,
  db,
  onLogementAdded,
  editingLogement,
}) => {
  const { country, formatMoney } = useCountry();
  const currentPlan = db.formules.find((f) => f.code === db.proprietaires[0].formule) || db.formules[0];
  const isLimitReached = !editingLogement && db.logements.length >= currentPlan.maxLogements;

  const [bienId, setBienId] = useState<string>(
    editingLogement?.bienId || db.biens[0]?.id || ''
  );
  const [libelle, setLibelle] = useState<string>(editingLogement?.libelle || '');
  const [type, setType] = useState<HousingType>(editingLogement?.type || 'chambre-salon');
  const [loyerMensuel, setLoyerMensuel] = useState<number>(editingLogement?.loyerMensuel || 35000);
  const [caution, setCaution] = useState<number>(editingLogement?.caution || 70000);
  const [motifAmelioration, setMotifAmelioration] = useState<string>(
    editingLogement?.motifAmelioration || ''
  );

  if (!isOpen) return null;

  const selectedBien = db.biens.find((b) => b.id === bienId);
  const zoneId = selectedBien?.zoneId || 'zone_niamey_1';

  // 1. Contrôle du Plafond Décret 2026
  const capResult = checkRentCap(type, loyerMensuel, zoneId, db.plafonds);

  // 2. Contrôle de la hausse de 10%
  const previousRent = editingLogement?.loyerMensuel;
  const increaseResult = checkRentIncrease(previousRent, loyerMensuel, motifAmelioration);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || !bienId) return;

    const newLogement: Logement = {
      id: editingLogement ? editingLogement.id : `log_${Date.now()}`,
      bienId,
      libelle,
      type,
      loyerMensuel,
      caution,
      statut: editingLogement ? editingLogement.statut : 'libre',
      dateDerniereHausse: increaseResult.isIncrease ? new Date().toISOString() : editingLogement?.dateDerniereHausse,
      loyerPrecedent: editingLogement ? editingLogement.loyerMensuel : undefined,
      motifAmelioration: motifAmelioration.trim() || editingLogement?.motifAmelioration,
      collecteurId: editingLogement?.collecteurId,
    };

    onLogementAdded(newLogement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {editingLogement ? 'Modifier le logement' : 'Nouveau logement'}
            </h2>
            <p className="text-xs text-stone-500">
              {country.flag} {country.name} · Encadrement locatif & conformité ({country.currencySymbol})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription Plan Limit Blocker */}
        {isLimitReached ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Limite de logements atteinte ({db.logements.length}/{currentPlan.maxLogements})
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                Votre formule actuelle <strong>« {currentPlan.nom} »</strong> est limitée à {currentPlan.maxLogements} logements.
                Passez à la formule supérieure pour gérer davantage de biens.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Formule recommandée : Bailleur</span>
                <span className="text-xs font-bold text-emerald-700">500 FCFA/logement/mois</span>
              </div>
              <ul className="text-[11px] text-emerald-800 space-y-1">
                <li>• Jusqu'à 20 logements</li>
                <li>• Collecteurs illimités</li>
                <li>• Quittances SMS automatiques</li>
              </ul>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800"
            >
              Fermer et consulter les abonnements
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Choix du Bien */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Immeuble / Bien rattaché *
              </label>
              <select
                value={bienId}
                onChange={(e) => setBienId(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-medium"
                required
              >
                {db.biens.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom} — {b.commune} ({b.ville})
                  </option>
                ))}
              </select>
            </div>

            {/* Libellé */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Libellé du logement *
              </label>
              <input
                type="text"
                placeholder="Ex: Chambre 3, F3 Étage 1, Porte 4"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                className="w-full text-sm rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-semibold focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>

            {/* Type de logement */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Type de logement *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['chambre-salon', 'F2', 'F3', 'F4', 'F5', 'autre'] as HousingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition ${
                      type === t
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Loyer Mensuel */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">
                  Loyer mensuel convenu ({country.currencySymbol}) *
                </label>
                {capResult.capAmount && (
                  <span className="text-[11px] text-stone-500 font-mono">
                    Plafond zone : {formatMoney(capResult.capAmount)}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={loyerMensuel}
                onChange={(e) => setLoyerMensuel(Number(e.target.value))}
                className="w-full text-base font-bold text-emerald-800 rounded-xl border border-stone-300 p-2.5 bg-stone-50 focus:border-emerald-600 focus:outline-none font-mono"
                required
              />
            </div>

            {/* Caution */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Caution demandée ({country.currencySymbol})
              </label>
              <input
                type="number"
                value={caution}
                onChange={(e) => setCaution(Number(e.target.value))}
                className="w-full text-xs font-semibold rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-mono"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">
                Plafond légal conseillé : {country.regulations.maxCautionMonths} mois ({formatMoney(loyerMensuel * country.regulations.maxCautionMonths)}).
              </p>
            </div>

            {/* Avertissement Plafonnement Légal */}
            {capResult.exceedsCap && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1 text-xs text-red-900">
                <div className="flex items-center gap-2 font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Dépassement du Plafond Légal ({country.regulations.decreeOrLaw})</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Le loyer saisi dépasse le plafond de {formatMoney(capResult.capAmount)} fixé pour un {type} dans ce secteur ({country.name}).
                  Dépassement : <strong className="font-mono text-red-700">+{formatMoney(capResult.difference)}</strong>.
                </p>
                <p className="text-[10px] text-stone-500 italic">
                  Note : {capResult.noteVerification || 'Barème locatif officiel à vérifier auprès de l\'administration.'}
                </p>
              </div>
            )}

            {/* Contrôle de la hausse de 10% */}
            {increaseResult.isIncrease && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Hausse de loyer détectée : +{increaseResult.percentage.toFixed(1)}%</span>
                </div>
                <p className="text-[11px]">
                  Le décret d'avril 2026 limite strictement les augmentations à 10% maximum et impose la réalisation préalable de travaux d'amélioration.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-stone-800 mb-1">
                    Précisez les améliorations ou travaux réalisés *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Réfection carrelage, pose brasseurs d'air, réfection étanchéité toiture"
                    value={motifAmelioration}
                    onChange={(e) => setMotifAmelioration(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white focus:outline-none"
                    required={increaseResult.exceeds10Percent}
                  />
                </div>
              </div>
            )}

            {/* Bouton de validation */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{editingLogement ? 'Mettre à jour le logement' : 'Enregistrer le logement'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
