import React, { useState } from 'react';
import { Paiement, Echeance, Locataire, Logement, AppDatabase } from '../types';
import { useCountry } from '../contexts/CountryContext';
import { activeSmsProvider } from '../services/smsProvider';
import { X, AlertTriangle, Send, ShieldAlert } from 'lucide-react';

interface RejectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paiement: Paiement | null;
  db: AppDatabase;
  onPaymentRejected: (rejectedPayment: Paiement, updatedEcheance: Echeance) => void;
}

export const RejectPaymentModal: React.FC<RejectPaymentModalProps> = ({
  isOpen,
  onClose,
  paiement,
  db,
  onPaymentRejected,
}) => {
  const { country, formatMoney } = useCountry();
  const proprietaire = db.proprietaires[0];

  const [motif, setMotif] = useState('');
  const [motifPredefini, setMotifPredefini] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !paiement) return null;

  const locataire = db.locataires.find((l) => l.id === paiement.locataireId);
  const logement = db.logements.find((l) => l.id === paiement.logementId);
  const echeance = db.echeances.find((e) => e.id === paiement.echeanceId);

  const predefMotifs = [
    'ID de transaction introuvable sur le compte opérateur après vérification.',
    'Montant déclaré non reçu ou insuffisant par rapport à l\'échéance.',
    'Compte de réception erroné / paiement non crédité au propriétaire.',
    'Autre motif précisé ci-dessous.',
  ];

  const handleSelectPredefini = (m: string) => {
    setMotifPredefini(m);
    if (m !== 'Autre motif précisé ci-dessous.') {
      setMotif(m);
    } else {
      setMotif('');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalMotif = motif.trim();
    if (!finalMotif) {
      setErrorMsg('Le motif de rejet est obligatoire pour informer le locataire.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();

      // 1. Mise à jour du paiement en "rejete"
      const updatedPayment: Paiement = {
        ...paiement,
        statut: 'rejete',
        motifRejet: finalMotif,
        dateRejet: now,
        rejeteParNom: proprietaire.nom,
      };

      // 2. Mise à jour de l'échéance : les relances reprennent ! (statut en_retard ou a_payer)
      const isPastDue = echeance
        ? new Date(echeance.dateEcheance).getTime() < Date.now()
        : true;

      const updatedEcheance: Echeance = echeance
        ? {
            ...echeance,
            statut: isPastDue ? 'en_retard' : 'a_payer',
          }
        : {
            id: `ech_fallback_${Date.now()}`,
            bailId: paiement.bailId,
            logementId: paiement.logementId,
            locataireId: paiement.locataireId,
            proprietaireId: proprietaire.id,
            periodeMois: paiement.periodeMois,
            periodeAnnee: paiement.periodeAnnee,
            montantDu: paiement.montant,
            montantPaye: 0,
            referenceCourte: 'LY-REJ',
            statut: 'en_retard',
            dateEcheance: now.split('T')[0],
            tokenLienPublic: `tk_${Date.now()}`,
            tokenExpiresAt: now,
          };

      // 3. Journalisation de l'audit
      db.journalPaiements.unshift({
        id: `jrn_rej_${Date.now()}`,
        paiementId: paiement.id,
        action: 'rejet',
        auteurNom: proprietaire.nom,
        auteurRole: 'proprietaire',
        date: now,
        motifRejet: finalMotif,
        details: {
          montant: paiement.montant,
          mode: paiement.mode,
          transactionId: paiement.transactionIdOperateur || paiement.referenceTransaction,
          echeanceRef: echeance?.referenceCourte,
        },
      });

      // 4. Envoi d'un SMS au locataire pour le prévenir du rejet avec motif
      if (locataire) {
        const smsContent = `Loyo : Votre paiement de ${formatMoney(paiement.montant)} pour ${logement?.libelle || 'votre logement'} a été refusé par le propriétaire. Motif : ${finalMotif}. Merci de régulariser.`;

        await activeSmsProvider.sendSms({
          destinataire: locataire.telephone,
          destinataireNom: locataire.nom,
          type: 'rejet',
          langue: locataire.langue || 'fr',
          contenu: smsContent,
          referencePaiementId: paiement.id,
        });

        db.messagesSMS.unshift({
          id: `sms_rej_${Date.now()}`,
          destinataire: locataire.telephone,
          destinataireNom: locataire.nom,
          type: 'rejet',
          langue: locataire.langue || 'fr',
          contenu: smsContent,
          statutEnvoi: 'envoye',
          date: now,
          referencePaiementId: paiement.id,
        });
      }

      onPaymentRejected(updatedPayment, updatedEcheance);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors du rejet : ' + (err?.message || 'Inconnue'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl text-stone-900 border border-stone-200 overflow-hidden my-auto animate-in fade-in duration-200">
        <div className="bg-red-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-800 flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Rejeter ce paiement</h2>
              <p className="text-[11px] text-red-200">
                Motif obligatoire transmis immédiatement au locataire par SMS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-red-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleReject} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Rappel du paiement contesté */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between font-bold text-stone-900">
              <span>{locataire?.nom}</span>
              <span className="font-mono text-emerald-900 text-sm">
                {formatMoney(paiement.montant)}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 flex items-center justify-between">
              <span>{logement?.libelle} · Mode : {paiement.mode}</span>
              <span className="font-mono">Réf : {paiement.transactionIdOperateur || paiement.referenceTransaction || 'N/A'}</span>
            </div>
          </div>

          {/* Motifs fréquents */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 uppercase tracking-wide block text-[11px]">
              Sélectionner un motif prédéfini
            </label>
            <div className="space-y-1.5">
              {predefMotifs.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPredefini(m)}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                    motifPredefini === m
                      ? 'border-red-600 bg-red-50 text-red-950 font-semibold'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Saisie explicite du motif */}
          <div className="space-y-1">
            <label className="font-bold text-stone-800 uppercase tracking-wide block text-[11px]">
              Motif de rejet détaillé (Obligatoire) *
            </label>
            <textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Expliquez clairement pourquoi ce paiement est refusé..."
              className="w-full p-2.5 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-600"
              required
            />
            <p className="text-[10px] text-stone-500">
              Ce motif sera envoyé par SMS à {locataire?.nom} et les relances de loyer reprendront automatiquement.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Traitement...' : 'Confirmer le rejet & Prévenir par SMS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
