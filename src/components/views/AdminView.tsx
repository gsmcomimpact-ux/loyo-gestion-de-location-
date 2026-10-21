import React, { useState } from 'react';
import { AppDatabase, Plafond, Zone, ModeleSMS, HousingType } from '../../types';
import { useCountry } from '../../contexts/CountryContext';
import {
  Shield,
  Edit2,
  Plus,
  Save,
  X,
  MessageSquare,
  Layers,
  MapPin,
  Check,
  AlertTriangle,
  Globe,
  Scale,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

interface AdminViewProps {
  db: AppDatabase;
  onPlafondUpdated: (plafond: Plafond) => void;
  onPlafondAdded: (plafond: Plafond) => void;
  onSmsTemplateUpdated: (template: ModeleSMS) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  db,
  onPlafondUpdated,
  onPlafondAdded,
  onSmsTemplateUpdated,
}) => {
  const { country, countryCode, setCountryCode, allCountries, formatMoney } = useCountry();

  const [activeTab, setActiveTab] = useState<'pays' | 'plafonds' | 'zones' | 'sms' | 'abonnements' | 'regles_sms'>('pays');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edit Plafond State
  const [editingPlafond, setEditingPlafond] = useState<Plafond | null>(null);
  const [montantMax, setMontantMax] = useState<number>(0);
  const [noteVerification, setNoteVerification] = useState<string>('');

  // Add Plafond Modal State
  const [isAddingPlafond, setIsAddingPlafond] = useState(false);
  const [newZoneId, setNewZoneId] = useState(db.zones[0]?.id || 'zone_1');
  const [newType, setNewType] = useState<HousingType>('F3');
  const [newMontant, setNewMontant] = useState(80000);
  const [newNote, setNewNote] = useState('À VÉRIFIER');

  // Edit SMS Template State
  const [editingTemplate, setEditingTemplate] = useState<ModeleSMS | null>(null);
  const [tplFr, setTplFr] = useState('');
  const [tplHa, setTplHa] = useState('');
  const [tplDje, setTplDje] = useState('');

  const handleStartEditPlafond = (p: Plafond) => {
    setEditingPlafond(p);
    setMontantMax(p.montantMax);
    setNoteVerification(p.noteVerification);
  };

  const handleSavePlafond = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlafond) return;

    const updated: Plafond = {
      ...editingPlafond,
      montantMax,
      noteVerification,
      dateMiseAJour: new Date().toISOString().split('T')[0],
    };

    onPlafondUpdated(updated);
    setEditingPlafond(null);
  };

  const handleCreatePlafond = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlaf: Plafond = {
      id: `plaf_${Date.now()}`,
      zoneId: newZoneId,
      typeLogement: newType,
      montantMax: newMontant,
      noteVerification: newNote,
      dateMiseAJour: new Date().toISOString().split('T')[0],
    };

    onPlafondAdded(newPlaf);
    setIsAddingPlafond(false);
  };

  const handleStartEditTpl = (tpl: ModeleSMS) => {
    setEditingTemplate(tpl);
    setTplFr(tpl.contenu.fr);
    setTplHa(tpl.contenu.ha);
    setTplDje(tpl.contenu.dje);
  };

  const handleSaveTpl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const updated: ModeleSMS = {
      ...editingTemplate,
      contenu: {
        fr: tplFr,
        ha: tplHa,
        dje: tplDje,
      },
    };

    onSmsTemplateUpdated(updated);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* En-tête Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
            <Shield className="w-4 h-4" />
            <span>Portail d'Administration Loyo</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mt-1">
            Réglementations & Réalités des Pays Francophones
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Paramétrage des pays de l'espace francophone, plafonds légaux de caution, devises et opérateurs Mobile Money
          </p>
        </div>
      </div>

      {/* Onglets Admin */}
      <div className="flex items-center gap-1 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pays')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pays'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Pays Francophones ({allCountries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plafonds')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'plafonds'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Plafonds & Barèmes ({db.plafonds.length})
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'zones'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Zones & Villes ({db.zones.length})
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'sms'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Modèles SMS
        </button>

        <button
          onClick={() => setActiveTab('abonnements')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'abonnements'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Abonnements SaaS & Back-Office
        </button>

        <button
          onClick={() => setActiveTab('regles_sms')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'regles_sms'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          Analyseur SMS Opérateurs
        </button>
      </div>

      {/* CONTENU ONGLET 1 : PAYS FRANCOPHONES ET RÉALITÉS */}
      {activeTab === 'pays' && (
        <div className="space-y-4">
          <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{country.flag}</span>
                <span className="text-base font-bold text-white">Pays Actif : {country.name}</span>
                <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                  {country.currencySymbol} ({country.currencyCode})
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                Législation en vigueur : <strong>{country.regulations.decreeOrLaw}</strong> · Plafond caution : <strong>{country.regulations.maxCautionMonths} mois de loyer</strong>
              </p>
            </div>
            <div className="text-xs text-emerald-300 bg-emerald-900/60 p-3 rounded-xl border border-emerald-800">
              Cliquez sur n'importe quel pays ci-dessous pour adapter instantanément la plateforme à sa réalité !
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCountries.map((c) => {
              const isSelected = c.code === countryCode;
              return (
                <div
                  key={c.code}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/70 shadow-md ring-2 ring-emerald-600/30'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl leading-none">{c.flag}</span>
                        <div>
                          <h3 className="text-base font-bold text-stone-900">{c.name}</h3>
                          <div className="text-xs text-stone-500 font-mono">
                            Indicatif : {c.phonePrefix}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs bg-stone-900 text-white px-2 py-0.5 rounded">
                          {c.currencySymbol}
                        </span>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">{c.currencyCode}</div>
                      </div>
                    </div>

                    {/* Cadre légal */}
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" />
                        <span>Réglementation des baux</span>
                      </div>
                      <div className="font-bold text-stone-900 text-xs">
                        {c.regulations.decreeOrLaw}
                      </div>
                      <div className="text-[11px] text-stone-600 flex justify-between pt-1 border-t border-stone-100">
                        <span>Plafond de caution :</span>
                        <strong className="text-emerald-900">{c.regulations.maxCautionMonths} mois de loyer</strong>
                      </div>
                    </div>

                    {/* Moyens de paiement */}
                    <div className="space-y-1 text-xs">
                      <div className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Opérateurs de paiement</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.paymentMethods.map((pm) => (
                          <span
                            key={pm.id}
                            className="text-[10px] px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-700"
                          >
                            {pm.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Villes principales */}
                    <div className="text-[11px] text-stone-500">
                      Villes : <strong className="text-stone-700">{c.cities.map((ct) => ct.name).join(', ')}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setCountryCode(c.code)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                      isSelected
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Pays actuellement actif</span>
                      </>
                    ) : (
                      <span>Basculer sur {c.name}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : PLAFONDS */}
      {activeTab === 'plafonds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">
              Barème des loyers plafonnés ({country.flag} {country.name})
            </h2>
            <button
              onClick={() => setIsAddingPlafond(true)}
              className="py-2 px-3 rounded-xl bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter une typologie</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Zone & Commune</th>
                    <th className="py-3 px-4">Typologie</th>
                    <th className="py-3 px-4">Loyer Maximum</th>
                    <th className="py-3 px-4">Note Officielle</th>
                    <th className="py-3 px-4">Dernière révision</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {db.plafonds.map((p) => {
                    const zone = db.zones.find((z) => z.id === p.zoneId);

                    return (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{zone?.nomZone || p.zoneId}</div>
                          <div className="text-[11px] text-stone-500">{zone?.commune}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded text-[11px]">
                            {p.typeLogement}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800 text-sm">
                          {formatMoney(p.montantMax)}
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {p.noteVerification}
                        </td>
                        <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                          {p.dateMiseAJour}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleStartEditPlafond(p)}
                            className="py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs inline-flex items-center gap-1 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3 : ZONES */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.zones.map((z) => {
              const biensInZone = db.biens.filter((b) => b.zoneId === z.id);

              return (
                <div key={z.id} className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">{z.nomZone}</h3>
                      <div className="text-xs text-stone-500 mt-0.5">{z.commune} · {z.ville}</div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {biensInZone.length} bien(s)
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    {z.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4 : MODÈLES SMS */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.modelesSMS.map((tpl) => (
              <div key={tpl.code} className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{tpl.nom}</h3>
                    <span className="text-[10px] font-mono text-stone-400">Code : {tpl.code}</span>
                  </div>
                  <button
                    onClick={() => handleStartEditTpl(tpl)}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] font-bold uppercase text-stone-500">Français :</span>
                    <p className="mt-0.5 text-stone-700">{tpl.contenu.fr}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] font-bold uppercase text-stone-500">Haoussa :</span>
                    <p className="mt-0.5 text-stone-700">{tpl.contenu.ha}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] font-bold uppercase text-stone-500">Zarma :</span>
                    <p className="mt-0.5 text-stone-700">{tpl.contenu.dje}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 5 : ABONNEMENTS SAAS & BACK-OFFICE */}
      {activeTab === 'abonnements' && (
        <div className="space-y-6">
          {/* Cadre explicatif de paiement de l'abonnement SaaS */}
          <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                <Shield className="w-4 h-4" />
                <span>Abonnement SaaS Loyo (Distinct des Loyers)</span>
              </div>
              <p className="text-xs text-stone-200 leading-relaxed max-w-2xl">
                L'abonnement à la plateforme est réglé <strong>hors application</strong> par Mobile Money au numéro de l'entreprise Loyo (+227 90 00 00 00). L'administrateur active ou prolonge les accès bailleurs depuis ce back-office.
              </p>
            </div>
            <div className="text-xs text-emerald-300 bg-emerald-900/60 p-3 rounded-xl border border-emerald-800 shrink-0">
              Compte de versement Loyo : <strong>+227 90 00 00 00</strong>
            </div>
          </div>

          {/* TABLEAU DES COMPTES BAILLEURS & VALIDATION ADMINISTRATIVE */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wide">
                Comptes Bailleurs & Droits d'Accès ({db.proprietaires.length})
              </h3>
              <span className="text-[10px] text-stone-500">
                Activation & renouvellement manuel des licences
              </span>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {db.proprietaires.map((prop) => {
                const expDate = prop.dateExpirationAbonnement || '2026-12-31';
                const isActif = (prop.statutAbonnement || 'actif') === 'actif';

                return (
                  <div key={prop.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{prop.nom}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          isActif ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isActif ? 'Actif' : 'Suspendu / Expiré'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span>Tél : {prop.telephone}</span>
                        <span>•</span>
                        <span>Ville : {prop.ville}</span>
                        <span>•</span>
                        <span>Formule : <strong className="uppercase text-stone-800">{prop.formule}</strong></span>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Expiration de l'abonnement : <strong>{expDate}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          const curr = new Date(prop.dateExpirationAbonnement || '2026-12-31');
                          curr.setDate(curr.getDate() + 30);
                          prop.dateExpirationAbonnement = curr.toISOString().split('T')[0];
                          prop.statutAbonnement = 'actif';
                          setSuccessNotice(`Abonnement de ${prop.nom} prolongé de 30 jours (nouvelle fin : ${prop.dateExpirationAbonnement}).`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition"
                      >
                        +30 jours
                      </button>

                      <button
                        onClick={() => {
                          const curr = new Date(prop.dateExpirationAbonnement || '2026-12-31');
                          curr.setFullYear(curr.getFullYear() + 1);
                          prop.dateExpirationAbonnement = curr.toISOString().split('T')[0];
                          prop.statutAbonnement = 'actif';
                          setSuccessNotice(`Abonnement de ${prop.nom} prolongé d'un an (nouvelle fin : ${prop.dateExpirationAbonnement}).`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-200 transition"
                      >
                        +1 an
                      </button>

                      <button
                        onClick={() => {
                          prop.statutAbonnement = isActif ? 'suspendu' : 'actif';
                          setSuccessNotice(`Statut de ${prop.nom} mis à jour : ${prop.statutAbonnement}.`);
                        }}
                        className={`py-1 px-2.5 rounded-lg font-semibold text-xs border transition ${
                          isActif
                            ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {isActif ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formules Tarifaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {db.formules.map((f) => (
              <div key={f.code} className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-stone-900">{f.nom}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {f.maxLogements >= 9999 ? 'Illimité' : `Max ${f.maxLogements}`}
                  </span>
                </div>
                <div className="text-xl font-black text-stone-900 font-mono">
                  {f.prixParLogement === 0 ? 'Gratuit' : `${formatMoney(f.prixParLogement)}/logement`}
                </div>
                <p className="text-xs text-stone-500">{f.description}</p>
                <ul className="text-xs space-y-1 text-stone-600 pt-2 border-t border-stone-100">
                  {f.caracteristiques.map((c, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 6 : RÈGLES DE PARSING SMS PAR OPÉRATEUR */}
      {activeTab === 'regles_sms' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Modèles d'Analyse SMS par Opérateur</h2>
              <p className="text-stone-500 mt-0.5">
                Règles de reconnaissance automatique pour extraire montant, expéditeur et ID de transaction des SMS reçus par les propriétaires.
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
              Analyseur Multi-Opérateurs Actif
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.smsParserRules.map((rule) => (
              <div key={rule.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-stone-900 text-xs">{rule.nomOperateur}</span>
                  </div>
                  <button
                    onClick={() => {
                      rule.actif = !rule.actif;
                      setSuccessNotice(`Règle ${rule.nomOperateur} ${rule.actif ? 'activée' : 'désactivée'}.`);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      rule.actif
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >
                    {rule.actif ? 'Actif' : 'Inactif'}
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Mots-clés déclencheurs :</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.map((kw, idx) => (
                      <span key={idx} className="bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Exemple de SMS reçu :</span>
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 font-mono text-[11px] text-stone-700 leading-relaxed">
                    "{rule.exempleSms}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Edition Plafond */}
      {editingPlafond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">
                Modifier le plafond : {editingPlafond.typeLogement}
              </h2>
              <button onClick={() => setEditingPlafond(null)} className="p-1 rounded-lg text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlafond} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Loyer Max ({country.currencySymbol}) *
                </label>
                <input
                  type="number"
                  value={montantMax}
                  onChange={(e) => setMontantMax(Number(e.target.value))}
                  className="w-full text-base font-bold font-mono p-2.5 rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Note de conformité
                </label>
                <input
                  type="text"
                  value={noteVerification}
                  onChange={(e) => setNoteVerification(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Plafond */}
      {isAddingPlafond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">Nouveau Plafond Légal</h2>
              <button onClick={() => setIsAddingPlafond(false)} className="p-1 rounded-lg text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlafond} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Zone géographique *</label>
                <select
                  value={newZoneId}
                  onChange={(e) => setNewZoneId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5"
                >
                  {db.zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.nomZone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Typologie *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as HousingType)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5"
                >
                  {(['chambre-salon', 'F2', 'F3', 'F4', 'F5', 'autre'] as HousingType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Montant Plafond ({country.currencySymbol}) *
                </label>
                <input
                  type="number"
                  value={newMontant}
                  onChange={(e) => setNewMontant(Number(e.target.value))}
                  className="w-full text-sm font-bold font-mono rounded-xl border border-stone-300 p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Note de vérification</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                >
                  Ajouter à la table des plafonds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition Modèle SMS */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900">
                Modifier le Modèle SMS : {editingTemplate.nom}
              </h2>
              <button onClick={() => setEditingTemplate(null)} className="p-1 rounded-lg text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTpl} className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-stone-700">Texte Français</label>
                  <span className={`text-[10px] font-mono ${tplFr.length > 160 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {tplFr.length}/160 cars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={tplFr}
                  onChange={(e) => setTplFr(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 font-sans"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-stone-700">Texte Haoussa (Hausa)</label>
                  <span className={`text-[10px] font-mono ${tplHa.length > 160 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {tplHa.length}/160 cars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={tplHa}
                  onChange={(e) => setTplHa(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 font-sans"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-stone-700">Texte Zarma (Djerma)</label>
                  <span className={`text-[10px] font-mono ${tplDje.length > 160 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                    {tplDje.length}/160 cars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={tplDje}
                  onChange={(e) => setTplDje(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 font-sans"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                >
                  Enregistrer le modèle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
