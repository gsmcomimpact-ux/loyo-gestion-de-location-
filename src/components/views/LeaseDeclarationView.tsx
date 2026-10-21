import React, { useState } from 'react';
import { AppDatabase, Bail, DeclarationStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import { calculateDeclarationCountdown } from '../../services/rentCapService';
import { generateDeclarationBailPDF } from '../../services/pdfService';
import { useCountry } from '../../contexts/CountryContext';
import {
  FileText,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  X,
  Check,
  ShieldCheck,
  Scale,
} from 'lucide-react';

interface LeaseDeclarationViewProps {
  db: AppDatabase;
  onBailUpdated: (bail: Bail) => void;
}

export const LeaseDeclarationView: React.FC<LeaseDeclarationViewProps> = ({
  db,
  onBailUpdated,
}) => {
  const { country, formatMoney } = useCountry();

  const [markingBail, setMarkingBail] = useState<Bail | null>(null);
  const [numeroDepot, setNumeroDepot] = useState('');
  const [dateDepot, setDateDepot] = useState(new Date().toISOString().split('T')[0]);
  const [communeDepot, setCommuneDepot] = useState(country.cities[0]?.communes[0] || 'Commune Centrale');

  const handleDownloadDeclarationPDF = (bail: Bail) => {
    const logement = db.logements.find((l) => l.id === bail.logementId);
    const bien = db.biens.find((b) => b.id === logement?.bienId);
    const locataire = db.locataires.find((lc) => lc.id === bail.locataireId);
    const proprietaire = db.proprietaires[0];

    if (!logement || !bien || !locataire || !proprietaire) return;

    const doc = generateDeclarationBailPDF(bail, logement, bien, locataire, proprietaire, country.currencySymbol);
    const safeLoc = locataire.nom.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Contrat_Bail_${bien.commune}_${safeLoc}.pdf`);
  };

  const handleSaveMarkAsDeposited = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingBail) return;

    const updated: Bail = {
      ...markingBail,
      statutDeclaration: 'deposee',
      dateDepot,
      numeroDepotCommune: numeroDepot.trim() || `DEP-${Date.now().toString().slice(-4)}`,
      communeDepot,
    };

    onBailUpdated(updated);
    setMarkingBail(null);
  };

  const handleValidateBail = (bail: Bail) => {
    const updated: Bail = {
      ...bail,
      statutDeclaration: 'validee',
    };
    onBailUpdated(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">
              Contrats de Bail & Formalités Légales
            </h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {country.flag} {country.name} · {country.currencySymbol}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Génération des contrats officiels, respect des plafonds de caution ({country.regulations.maxCautionMonths} mois) & suivi des dépôts administratifs
          </p>
        </div>
      </div>

      {/* Cadre explicatif de la loi du pays */}
      <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
            <Scale className="w-4 h-4" />
            <span>Réglementation Officielle : {country.regulations.decreeOrLaw}</span>
          </div>
          <p className="text-xs text-stone-200 leading-relaxed max-w-2xl">
            {country.regulations.description}
          </p>
        </div>
        <div className="text-xs font-semibold text-emerald-300 bg-emerald-900/60 px-3.5 py-2.5 rounded-xl border border-emerald-800 shrink-0 space-y-0.5">
          <div>Caution max : <strong>{country.regulations.maxCautionMonths} mois</strong></div>
          <div className="text-[11px] text-emerald-400">Avance max : {country.regulations.maxAvanceMonths} mois</div>
        </div>
      </div>

      {/* Tableau des baux */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Logement & Bien</th>
                <th className="py-3 px-4">Locataire</th>
                <th className="py-3 px-4">Prise d'effet</th>
                <th className="py-3 px-4">Loyer & Caution</th>
                <th className="py-3 px-4">Délai Légal</th>
                <th className="py-3 px-4">Statut Administratif</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {db.baux.map((bail) => {
                const logement = db.logements.find((l) => l.id === bail.logementId);
                const bien = db.biens.find((b) => b.id === logement?.bienId);
                const locataire = db.locataires.find((lc) => lc.id === bail.locataireId);
                const countdown = calculateDeclarationCountdown(bail);

                return (
                  <tr key={bail.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{logement?.libelle}</div>
                      <div className="text-[11px] text-stone-500">
                        {bien?.nom} ({bien?.commune}, {bien?.ville})
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{locataire?.nom}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{locataire?.telephone}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-stone-700">
                      {formatDate(bail.dateDebut)}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-stone-900">{formatMoney(bail.loyer)}/m</div>
                      <div className="text-[10px] text-stone-500">
                        Caution : {formatMoney(bail.cautionVersee)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${countdown.alertLevel === 'urgent' ? 'text-red-600' : 'text-stone-400'}`} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          countdown.alertLevel === 'urgent'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : countdown.alertLevel === 'warning'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-50 text-stone-700 border-stone-200'
                        }`}>
                          {countdown.badgeText}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Limite : {formatDate(bail.dateLimiteDeclaration)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {bail.statutDeclaration === 'validee' ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Validée & Archivée</span>
                        </div>
                      ) : bail.statutDeclaration === 'deposee' ? (
                        <div>
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Déposée ({bail.numeroDepotCommune})</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Le {formatDate(bail.dateDepot)} ({bail.communeDepot})
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>À régulariser</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadDeclarationPDF(bail)}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold text-xs flex items-center gap-1 transition"
                          title="Télécharger le formulaire de bail officiel PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Contrat PDF</span>
                        </button>

                        {bail.statutDeclaration === 'a_faire' && (
                          <button
                            onClick={() => {
                              setMarkingBail(bail);
                              setNumeroDepot(`DEP-${Date.now().toString().slice(-4)}`);
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition"
                          >
                            Marquer déposé
                          </button>
                        )}

                        {bail.statutDeclaration === 'deposee' && (
                          <button
                            onClick={() => handleValidateBail(bail)}
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Valider</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Marquer Déposé */}
      {markingBail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">Enregistrer le dépôt</h2>
              <button
                onClick={() => setMarkingBail(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMarkAsDeposited} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Commune / Arrondissement de dépôt
                </label>
                <select
                  value={communeDepot}
                  onChange={(e) => setCommuneDepot(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                >
                  {country.cities.flatMap((c) => c.communes).map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Numéro de récépissé ou d'enregistrement
                </label>
                <input
                  type="text"
                  placeholder="Ex: REC-2026-084"
                  value={numeroDepot}
                  onChange={(e) => setNumeroDepot(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Date de dépôt au guichet
                </label>
                <input
                  type="date"
                  value={dateDepot}
                  onChange={(e) => setDateDepot(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-98"
                >
                  Confirmer l'enregistrement du bail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
