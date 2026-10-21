import React from 'react';
import { MessageSMS } from '../../types';
import { X, Send, MessageSquare, CheckCircle2, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../../services/whatsappService';

interface SmsOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageSMS[];
}

export const SmsOutboxModal: React.FC<SmsOutboxModalProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Boîte d'envoi SMS aux Locataires (Niger)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Historique des rappels, quittances et relances transmis par SMS ({messages.length} messages)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-stone-400">
              Aucun SMS envoyé pour le moment.
            </div>
          ) : (
            messages.map((sms) => {
              const len = sms.contenu.length;
              const isSingle = len <= 160;

              return (
                <div
                  key={sms.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{sms.destinataireNom}</span>
                      <span className="font-mono text-stone-500">({sms.destinataire})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700 uppercase">
                        {sms.langue}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Délivré</span>
                      </span>
                    </div>
                  </div>

                  <p className="p-3 bg-white rounded-lg border border-stone-200 text-stone-800 leading-relaxed font-sans">
                    {sms.contenu}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>Type : <strong className="capitalize text-stone-600">{sms.type}</strong></span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">
                        {len} car. {isSingle ? '(1 SMS)' : '(concaténé)'}
                      </span>
                      <a
                        href={getWhatsAppUrl(sms.destinataire, sms.contenu)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:text-green-800 font-semibold flex items-center gap-1 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded border border-green-200 transition"
                        title="Transmettre ce message au locataire par WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-green-600" />
                        <span>Transmettre par WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
