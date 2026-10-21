import React, { useState } from 'react';
import { AppDatabase, Locataire, Bail } from '../../types';
import { formatDate, formatPhoneNumber } from '../../utils/formatters';
import { activeSmsProvider } from '../../services/smsProvider';
import { getWhatsAppUrl } from '../../services/whatsappService';
import { useCountry } from '../../contexts/CountryContext';
import {
  Users,
  Plus,
  Phone,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Search,
  Send,
  X,
  Check,
  MessageCircle,
} from 'lucide-react';

interface TenantsViewProps {
  db: AppDatabase;
  onOpenAddTenant: () => void;
  onOpenQuickPay: (logementId: string) => void;
  onSmsSent: () => void;
  onTenantUpdated: (locataire: Locataire) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  db,
  onOpenAddTenant,
  onOpenQuickPay,
  onSmsSent,
  onTenantUpdated,
}) => {
  const { country, formatMoney, formatPhone } = useCountry();

  const [searchTerm, setSearchTerm] = useState('');
  const [restitutionModalLocataire, setRestitutionModalLocataire] = useState<Locataire | null>(null);
  const [montantRestitution, setMontantRestitution] = useState<number>(0);
  const [motifRestitution, setMotifRestitution] = useState<string>('');

  const [directSmsTenant, setDirectSmsTenant] = useState<Locataire | null>(null);
  const [customSmsText, setCustomSmsText] = useState<string>('');

  const filteredTenants = db.locataires.filter((l) =>
    l.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.telephone.includes(searchTerm)
  );

  const handleOpenRestitution = (loc: Locataire) => {
    setRestitutionModalLocataire(loc);
    const restant = loc.cautionVersee - (loc.cautionRestituee || 0);
    setMontantRestitution(restant);
    setMotifRestitution('');
  };

  const handleSaveRestitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restitutionModalLocataire) return;

    const updated: Locataire = {
      ...restitutionModalLocataire,
      cautionRestituee: (restitutionModalLocataire.cautionRestituee || 0) + montantRestitution,
      motifRestitution: motifRestitution.trim(),
      dateRestitution: new Date().toISOString(),
    };

    onTenantUpdated(updated);
    setRestitutionModalLocataire(null);
  };

  const handleSendDirectSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSmsTenant || !customSmsText.trim()) return;

    await activeSmsProvider.sendSms({
      destinataire: directSmsTenant.telephone,
      destinataireNom: directSmsTenant.nom,
      type: 'autre',
      langue: directSmsTenant.langue,
      contenu: customSmsText.trim(),
    });

    db.messagesSMS.unshift({
      id: `sms_${Date.now()}`,
      destinataire: directSmsTenant.telephone,
      destinataireNom: directSmsTenant.nom,
      type: 'autre',
      langue: directSmsTenant.langue,
      contenu: customSmsText.trim(),
      statutEnvoi: 'envoye',
      date: new Date().toISOString(),
    });

    onSmsSent();
    setDirectSmsTenant(null);
    setCustomSmsText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">Locataires & Dépôts de Garantie</h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {country.flag} {country.name} · {country.currencySymbol}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Suivi des occupants, gestion des cautions (plafond légal : {country.regulations.maxCautionMonths} mois) et notifications WhatsApp
          </p>
        </div>

        <button
          onClick={onOpenAddTenant}
          className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau locataire</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Rechercher par nom ou numéro de téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 shadow-xs"
        />
      </div>

      {/* Cartes des locataires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenants.map((loc) => {
          const logement = db.logements.find((l) => l.id === loc.logementId);
          const bien = db.biens.find((b) => b.id === logement?.bienId);
          const cautionRestante = loc.cautionVersee - (loc.cautionRestituee || 0);

          return (
            <div
              key={loc.id}
              className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-stone-900">{loc.nom}</h2>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400" />
                      <span className="font-mono">{formatPhone(loc.telephone)}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 uppercase">
                    {loc.langue || 'FR'}
                  </span>
                </div>

                {/* Logement assigné */}
                <div className="mt-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1 text-xs">
                  <div className="font-semibold text-stone-800">{logement?.libelle}</div>
                  <div className="text-[11px] text-stone-500">{bien?.nom} ({bien?.commune})</div>
                  <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-200/60 flex justify-between">
                    <span>Loyer : <strong>{formatMoney(logement?.loyerMensuel)}</strong></span>
                    <span>Échéance : <strong>Le {loc.jourEcheance}</strong></span>
                  </div>
                </div>

                {/* Suivi de la Caution */}
                <div className="mt-3 p-2.5 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Caution initiale versée :</span>
                    <span className="font-mono font-semibold text-stone-800">{formatMoney(loc.cautionVersee)}</span>
                  </div>
                  {loc.cautionRestituee ? (
                    <div className="flex justify-between items-center text-amber-700 text-[11px]">
                      <span>Restituée :</span>
                      <span className="font-mono font-bold">-{formatMoney(loc.cautionRestituee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center text-stone-800 font-bold pt-1 border-t border-stone-100">
                    <span>Solde détenu :</span>
                    <span className="font-mono text-emerald-800">{formatMoney(cautionRestante)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-1.5 flex-wrap">
                <a
                  href={getWhatsAppUrl(
                    loc.telephone,
                    `Bonjour ${loc.nom}, message de votre bailleur concernant votre logement ${logement?.libelle || ''} (Loyo).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-xs flex items-center gap-1 transition border border-green-200"
                  title="Ouvrir une discussion WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    setDirectSmsTenant(loc);
                    setCustomSmsText(`Bonjour ${loc.nom}, `);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-1 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>

                <button
                  onClick={() => handleOpenRestitution(loc)}
                  className="py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-1 transition"
                  title="Restituer la caution (départ ou régularisation)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Caution</span>
                </button>

                {logement && (
                  <button
                    onClick={() => onOpenQuickPay(logement.id)}
                    className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Encaisser
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Restitution de caution */}
      {restitutionModalLocataire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">Restitution de Caution</h2>
              <button
                onClick={() => setRestitutionModalLocataire(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestitution} className="mt-4 space-y-4">
              <p className="text-xs text-stone-600">
                Locataire : <strong>{restitutionModalLocataire.nom}</strong>
                <br />
                Caution totale versée : {formatMoney(restitutionModalLocataire.cautionVersee)}
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Montant à restituer ({country.currencySymbol}) *
                </label>
                <input
                  type="number"
                  value={montantRestitution}
                  onChange={(e) => setMontantRestitution(Number(e.target.value))}
                  max={restitutionModalLocataire.cautionVersee - (restitutionModalLocataire.cautionRestituee || 0)}
                  className="w-full text-base font-bold text-emerald-800 rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Motif ou retenues éventuelles
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Restitution complète fin de bail après état des lieux satisfaisant"
                  value={motifRestitution}
                  onChange={(e) => setMotifRestitution(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-98"
                >
                  Confirmer la restitution de {formatMoney(montantRestitution)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal SMS direct */}
      {directSmsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">Envoyer un SMS</h2>
              <button
                onClick={() => setDirectSmsTenant(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectSms} className="mt-4 space-y-4">
              <div className="text-xs text-stone-600">
                Destinataire : <strong>{directSmsTenant.nom}</strong> ({directSmsTenant.telephone})
                <br />
                Langue configurée : <strong className="uppercase">{directSmsTenant.langue}</strong>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-stone-700">Message SMS</label>
                  <span className={`text-[11px] font-mono ${customSmsText.length > 160 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {customSmsText.length}/160 cars {customSmsText.length <= 160 ? '(1 SMS)' : '(2 SMS)'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={customSmsText}
                  onChange={(e) => setCustomSmsText(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-stone-50 font-sans focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer par SMS GSM</span>
                </button>

                <a
                  href={getWhatsAppUrl(directSmsTenant.telephone, customSmsText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition active:scale-98 flex items-center justify-center gap-2 text-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Envoyer par WhatsApp</span>
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
