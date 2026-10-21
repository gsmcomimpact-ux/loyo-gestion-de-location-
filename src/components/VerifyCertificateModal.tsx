import React, { useState } from 'react';
import { AppDatabase } from '../types';
import { verifyReceiptCertificate, VerificationResult } from '../services/certificateService';
import { formatFCFA, formatDate, getMonthName } from '../utils/formatters';
import { X, Search, ShieldCheck, AlertTriangle, CheckCircle2, QrCode, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../services/whatsappService';

interface VerifyCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  initialQuery?: string;
}

export const VerifyCertificateModal: React.FC<VerifyCertificateModalProps> = ({
  isOpen,
  onClose,
  db,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<VerificationResult | null>(() =>
    initialQuery ? verifyReceiptCertificate(initialQuery, db) : null
  );

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyReceiptCertificate(query, db);
    setResult(res);
  };

  const handleQuickTest = (sampleQuery: string) => {
    setQuery(sampleQuery);
    setResult(verifyReceiptCertificate(sampleQuery, db));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Vérification de Quittance & Certificat</h2>
              <p className="text-[11px] text-stone-500">
                Contrôle d'authenticité légale (Décret Avril 2026 - Niger)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Numéro de Certificat ou de Quittance
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: QUITT-2026-0001 ou CERT-NIG-2026-8A31-4F10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-xs font-mono rounded-xl border border-stone-300 p-2.5 bg-stone-50 focus:border-emerald-600 focus:outline-none uppercase"
                required
              />
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Vérifier</span>
              </button>
            </div>
          </div>

          {/* Boutons d'exemples rapides */}
          <div className="flex items-center gap-2 text-[11px] text-stone-500 flex-wrap">
            <span>Exemples de test :</span>
            <button
              type="button"
              onClick={() => handleQuickTest('QUITT-2026-0001')}
              className="text-emerald-800 underline font-mono font-semibold hover:text-emerald-900"
            >
              QUITT-2026-0001
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleQuickTest('QUITT-2026-0002')}
              className="text-emerald-800 underline font-mono font-semibold hover:text-emerald-900"
            >
              QUITT-2026-0002
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleQuickTest('FAUX-NUMERO-999')}
              className="text-red-700 underline font-mono hover:text-red-800"
            >
              Faux N° (Test)
            </button>
          </div>
        </form>

        {/* Résultat de la vérification */}
        {result && (
          <div className="mt-5 space-y-3 pt-3 border-t border-stone-200">
            {result.isValid ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>DOCUMENT OFFICIELLEMENT CERTIFIÉ & VALIDE</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Cette quittance a été émise et signée numériquement conformément à la réglementation nigérienne.
                </p>

                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">ID Certificat :</span>
                    <span className="font-mono font-bold text-emerald-900">{result.certificatId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">N° Quittance :</span>
                    <span className="font-mono font-bold">{result.numeroQuittance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Montant :</span>
                    <span className="font-mono font-black text-emerald-800">{formatFCFA(result.montant)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Locataire :</span>
                    <span className="font-semibold text-stone-800">{result.locataire?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Logement :</span>
                    <span className="text-stone-700">{result.logement?.libelle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Bailleur :</span>
                    <span className="text-stone-700">{result.proprietaire?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Date de règlement :</span>
                    <span className="text-stone-700">{formatDate(result.datePaiement)}</span>
                  </div>
                </div>

                {result.locataire && (
                  <div className="pt-2">
                    <a
                      href={getWhatsAppUrl(
                        result.locataire.telephone,
                        `*CONFIRMATION D'AUTHENTICITÉ DE QUITTANCE — LOYO* 🏛️\nLe certificat *${result.certificatId}* pour la quittance *${result.numeroQuittance}* pour le logement ${result.logement?.libelle} a été officiellement vérifié et validé conforme au registre Loyo.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs text-center"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Partager l'attestation de conformité sur WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>CERTIFICAT NON RECONNU OU INVALIDE</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  {result.message}
                </p>
                <p className="text-[11px] text-stone-600">
                  Attention : Si ce document vous a été présenté comme preuve de paiement, il ne figure pas dans le registre légal de la propriété.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
