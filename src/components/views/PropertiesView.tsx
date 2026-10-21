import React, { useState } from 'react';
import { AppDatabase, Logement, Bien } from '../../types';
import { checkRentCap } from '../../services/rentCapService';
import { useCountry } from '../../contexts/CountryContext';
import {
  Building2,
  Home,
  Plus,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Edit2,
  MapPin,
} from 'lucide-react';

interface PropertiesViewProps {
  db: AppDatabase;
  onOpenAddHousing: () => void;
  onEditHousing: (logement: Logement) => void;
  onOpenQuickPay: (logementId: string) => void;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  db,
  onOpenAddHousing,
  onEditHousing,
  onOpenQuickPay,
}) => {
  const { country, formatMoney } = useCountry();
  const [selectedBienId, setSelectedBienId] = useState<string>('all');

  const filteredLogements = db.logements.filter((l) => {
    if (selectedBienId === 'all') return true;
    return l.bienId === selectedBienId;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">Biens & Logements</h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {country.flag} {country.name} · {country.currencySymbol}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Suivi du parc locatif, encadrement des baux et conformité aux plafonds légaux ({country.regulations.decreeOrLaw})
          </p>
        </div>

        <button
          onClick={onOpenAddHousing}
          className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un logement</span>
        </button>
      </div>

      {/* Cartes des Biens / Immeubles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.biens.map((bien) => {
          const zone = db.zones.find((z) => z.id === bien.zoneId);
          const logementsDuBien = db.logements.filter((l) => l.bienId === bien.id);
          const occupes = logementsDuBien.filter((l) => l.statut === 'occupe').length;

          return (
            <div
              key={bien.id}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedBienId === bien.id
                  ? 'border-emerald-700 bg-emerald-50/50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
              onClick={() => setSelectedBienId(selectedBienId === bien.id ? 'all' : bien.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">{bien.nom}</h2>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      <span>{bien.adresse}, {bien.commune} ({bien.ville})</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {occupes}/{logementsDuBien.length} occupés
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-3 pt-2 border-t border-stone-100 flex justify-between">
                <span>Secteur : <strong>{zone?.nomZone || bien.commune}</strong></span>
                <span className="font-semibold text-emerald-800">
                  Total : {formatMoney(logementsDuBien.reduce((sum, l) => sum + l.loyerMensuel, 0))}/mois
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille des logements */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="text-sm font-bold text-stone-900">
            Logements répertoriés ({filteredLogements.length})
          </div>
          {selectedBienId !== 'all' && (
            <button
              onClick={() => setSelectedBienId('all')}
              className="text-xs text-stone-500 hover:text-stone-900 font-semibold"
            >
              Afficher tous les immeubles
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLogements.map((log) => {
            const bien = db.biens.find((b) => b.id === log.bienId);
            const bail = db.baux.find((b) => b.logementId === log.id);
            const locataire = db.locataires.find((lc) => lc.id === bail?.locataireId);
            const collecteur = db.collecteurs.find((c) => c.id === log.collecteurId);
            const zoneId = bien?.zoneId || 'zone_1';
            const capCheck = checkRentCap(log.type, log.loyerMensuel, zoneId, db.plafonds);

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        {log.type}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900">{log.libelle}</h3>
                      <div className="text-[11px] text-stone-500">{bien?.nom}</div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.statut === 'occupe'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {log.statut === 'occupe' ? 'Occupé' : 'Libre'}
                    </span>
                  </div>

                  {/* Loyer et Caution */}
                  <div className="mt-3 bg-white p-2.5 rounded-lg border border-stone-200 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-stone-500">Loyer mensuel :</span>
                      <span className="text-sm font-bold text-stone-900 font-mono">
                        {formatMoney(log.loyerMensuel)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-stone-500">
                      <span>Caution :</span>
                      <span className="font-mono">{formatMoney(log.caution)}</span>
                    </div>
                  </div>

                  {/* Statut Encadrement */}
                  <div className="mt-2 text-[10px]">
                    {capCheck.isApplicable && (
                      <div className="flex items-center gap-1.5 font-medium">
                        {capCheck.exceedsCap ? (
                          <div className="text-red-700 flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Dépasse plafond ({formatMoney(capCheck.capAmount)})</span>
                          </div>
                        ) : (
                          <div className="text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Conforme plafond ({formatMoney(capCheck.capAmount)})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Locataire en titre */}
                  {locataire && (
                    <div className="mt-2.5 p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs">
                      <div className="text-[10px] text-emerald-800 font-semibold uppercase">Locataire en titre</div>
                      <div className="font-bold text-stone-900">{locataire.nom}</div>
                      <div className="text-[11px] text-stone-500">
                        Échéance : le {locataire.jourEcheance} du mois
                      </div>
                    </div>
                  )}

                  {/* Collecteur assigné */}
                  {collecteur && (
                    <div className="mt-1 text-[11px] text-stone-500 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-600" />
                      <span>Collecteur : {collecteur.nom}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 gap-2">
                  <button
                    onClick={() => onEditHousing(log)}
                    className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>

                  {log.statut === 'occupe' && (
                    <button
                      onClick={() => onOpenQuickPay(log.id)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition"
                    >
                      Encaisser
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
