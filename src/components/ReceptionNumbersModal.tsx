import React, { useState } from 'react';
import { NumeroReception, PaymentMethod, AppDatabase } from '../types';
import { useCountry } from '../contexts/CountryContext';
import {
  X,
  Plus,
  Smartphone,
  Check,
  Star,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface ReceptionNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onNumeroUpdated: (updatedList: NumeroReception[]) => void;
}

export const ReceptionNumbersModal: React.FC<ReceptionNumbersModalProps> = ({
  isOpen,
  onClose,
  db,
  onNumeroUpdated,
}) => {
  const { country } = useCountry();
  const proprietaire = db.proprietaires[0];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [operateur, setOperateur] = useState<PaymentMethod>('airtel_money');
  const [numero, setNumero] = useState(country.phonePrefix + ' ');
  const [nomAffiche, setNomAffiche] = useState(proprietaire.nom);
  const [parDefaut, setParDefaut] = useState(false);
  const [instructions, setInstructions] = useState('');

  if (!isOpen) return null;

  const currentNumbers = db.numerosReception.filter(
    (nr) => nr.proprietaireId === proprietaire.id
  );

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setOperateur('airtel_money');
    setNumero(country.phonePrefix + ' ');
    setNomAffiche(proprietaire.nom);
    setParDefaut(currentNumbers.length === 0);
    setInstructions('');
  };

  const handleStartEdit = (nr: NumeroReception) => {
    setEditingId(nr.id);
    setIsAdding(true);
    setOperateur(nr.operateur);
    setNumero(nr.numero);
    setNomAffiche(nr.nomAffiche);
    setParDefaut(nr.parDefaut);
    setInstructions(nr.instructions || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let updated = [...db.numerosReception];

    if (parDefaut) {
      // Retirer le statut par défaut des autres numéros du même propriétaire
      updated = updated.map((nr) =>
        nr.proprietaireId === proprietaire.id ? { ...nr, parDefaut: false } : nr
      );
    }

    if (editingId) {
      updated = updated.map((nr) =>
        nr.id === editingId
          ? {
              ...nr,
              operateur,
              numero: numero.trim(),
              nomAffiche: nomAffiche.trim(),
              parDefaut,
              instructions: instructions.trim() || undefined,
            }
          : nr
      );
    } else {
      const newNr: NumeroReception = {
        id: `nr_${Date.now()}`,
        proprietaireId: proprietaire.id,
        operateur,
        numero: numero.trim(),
        nomAffiche: nomAffiche.trim(),
        actif: true,
        parDefaut,
        instructions: instructions.trim() || undefined,
      };
      updated.push(newNr);
    }

    onNumeroUpdated(updated);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleToggleActif = (id: string) => {
    const updated = db.numerosReception.map((nr) =>
      nr.id === id ? { ...nr, actif: !nr.actif } : nr
    );
    onNumeroUpdated(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = db.numerosReception.map((nr) =>
      nr.proprietaireId === proprietaire.id
        ? { ...nr, parDefaut: nr.id === id }
        : nr
    );
    onNumeroUpdated(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto animate-in fade-in duration-200">
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Mes Numéros de Réception</h2>
              <p className="text-[11px] text-stone-400">
                Numéros personnels Mobile Money où vos locataires vous paient directement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rappel Loyo ne touche pas l'argent */}
        <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 px-5 text-xs text-emerald-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Ces numéros sont affichés sur le portail de vos locataires pour qu'ils vous règlent directement.
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Liste des numéros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                Numéros enregistrés ({currentNumbers.length})
              </span>
              {!isAdding && (
                <button
                  onClick={handleStartAdd}
                  className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un numéro</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {currentNumbers.map((nr) => (
                <div
                  key={nr.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    nr.actif
                      ? nr.parDefaut
                        ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'bg-white border-stone-200'
                      : 'bg-stone-100 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs uppercase text-emerald-950">
                        {nr.operateur.replace('_', ' ')}
                      </span>
                      {nr.parDefaut && (
                        <span className="bg-emerald-200 text-emerald-900 text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Par défaut</span>
                        </span>
                      )}
                      {!nr.actif && (
                        <span className="bg-stone-200 text-stone-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                          Désactivé
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-stone-900">
                      {nr.numero}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      Titulaire affiché : <strong>{nr.nomAffiche}</strong>
                    </div>
                    {nr.instructions && (
                      <div className="text-[10px] text-stone-400 italic truncate">
                        {nr.instructions}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!nr.parDefaut && nr.actif && (
                      <button
                        onClick={() => handleSetDefault(nr.id)}
                        className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs"
                        title="Définir comme numéro par défaut"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(nr)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg text-xs"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActif(nr.id)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${
                        nr.actif
                          ? 'text-stone-600 hover:bg-stone-100 border-stone-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {nr.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulaire d'ajout ou de modification */}
          {isAdding && (
            <form onSubmit={handleSave} className="border-t border-stone-200 pt-4 space-y-3 bg-stone-50 p-4 rounded-xl border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">
                  {editingId ? 'Modifier le numéro' : 'Nouveau numéro de réception'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Opérateur</label>
                  <select
                    value={operateur}
                    onChange={(e) => setOperateur(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {country.paymentMethods
                      .filter((pm) => pm.type === 'mobile_money')
                      .map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.label}
                        </option>
                      ))}
                    <option value="especes">Espèces (Remise physique)</option>
                    <option value="virement">Virement Bancaire (RIB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Numéro Mobile Money *</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="+227 96 00 00 00"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Nom affiché du titulaire *
                  </label>
                  <input
                    type="text"
                    value={nomAffiche}
                    onChange={(e) => setNomAffiche(e.target.value)}
                    placeholder="Nom tel qu'il apparaît sur l'opérateur"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Instructions particulières (facultatif)
                  </label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Ex: Composer *444# ou scanner QR"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="chk_default"
                  checked={parDefaut}
                  onChange={(e) => setParDefaut(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chk_default" className="text-stone-700 font-medium cursor-pointer">
                  Définir comme numéro de réception par défaut
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="py-1.5 px-3 rounded-lg text-stone-600 hover:bg-stone-200 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
                >
                  {editingId ? 'Enregistrer les modifications' : 'Ajouter le numéro'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
