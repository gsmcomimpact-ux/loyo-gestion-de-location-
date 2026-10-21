import React, { useState, useEffect } from 'react';
import { AppDatabase, Collecteur } from '../../types';
import { useCountry } from '../../contexts/CountryContext';
import { UserCheck, Plus, Phone, Check, X, Shield, Building } from 'lucide-react';

interface CollectorsViewProps {
  db: AppDatabase;
  onCollectorAdded: (collector: Collecteur) => void;
  onCollectorUpdated: (collector: Collecteur) => void;
}

export const CollectorsView: React.FC<CollectorsViewProps> = ({
  db,
  onCollectorAdded,
  onCollectorUpdated,
}) => {
  const { country, formatMoney, formatPhone } = useCountry();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState(country.phonePrefix + ' ');
  const [selectedLogements, setSelectedLogements] = useState<string[]>([]);

  useEffect(() => {
    if (!telephone || telephone.startsWith('+')) {
      setTelephone(country.phonePrefix + ' ');
    }
  }, [country.phonePrefix]);

  const handleToggleLogement = (logId: string) => {
    setSelectedLogements((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim()) return;

    const newCollector: Collecteur = {
      id: `collec_${Date.now()}`,
      proprietaireId: db.proprietaires[0].id,
      nom: nom.trim(),
      telephone: telephone.trim(),
      logementsAssignes: selectedLogements,
      dateAjout: new Date().toISOString(),
    };

    onCollectorAdded(newCollector);
    setIsModalOpen(false);
    setNom('');
    setTelephone(country.phonePrefix + ' ');
    setSelectedLogements([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">Collecteurs désignés</h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {country.flag} {country.name}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Désignez des proches ou gardiens pour encaisser les loyers en espèces ou mobile money sur le terrain
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Inviter un collecteur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.collecteurs.map((collec) => {
          const logements = db.logements.filter((l) =>
            collec.logementsAssignes.includes(l.id)
          );
          const totalLoyersAssignes = logements.reduce((sum, l) => sum + l.loyerMensuel, 0);

          return (
            <div
              key={collec.id}
              className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900">{collec.nom}</h2>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400" />
                      <span className="font-mono">{formatPhone(collec.telephone)}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Actif sur terrain
                </span>
              </div>

              {/* Logements assignés */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-500 font-medium">
                  <span>Logements sous sa responsabilité :</span>
                  <span className="font-bold text-stone-800">{logements.length} logement(s)</span>
                </div>
                <div className="flex justify-between items-center text-stone-700 font-bold">
                  <span>Volume mensuel à recouvrer :</span>
                  <span className="font-mono text-emerald-800 text-sm">{formatMoney(totalLoyersAssignes)}</span>
                </div>

                <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-1.5">
                  {logements.map((log) => (
                    <span
                      key={log.id}
                      className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded font-medium text-stone-700"
                    >
                      {log.libelle}
                    </span>
                  ))}
                  {logements.length === 0 && (
                    <span className="text-[11px] text-stone-400 italic">Aucun logement assigné pour le moment</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Inviter Collecteur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">Nouveau Collecteur</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nom du collecteur / gardien *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Moussa Dan Baba"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Numéro de téléphone / WhatsApp *
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
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Logements assignés
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {db.logements.map((log) => {
                    const isSelected = selectedLogements.includes(log.id);
                    return (
                      <label
                        key={log.id}
                        className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLogement(log.id)}
                          className="w-3.5 h-3.5 rounded text-emerald-700"
                        />
                        <span className="font-semibold text-stone-800">{log.libelle}</span>
                        <span className="text-stone-400 font-mono text-[10px]">
                          ({formatMoney(log.loyerMensuel)})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-98"
                >
                  Ajouter le collecteur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
