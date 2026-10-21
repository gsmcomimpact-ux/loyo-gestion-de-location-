import { MessageSMS, Language } from '../types';

export interface SmsSendOptions {
  destinataire: string;
  destinataireNom: string;
  type: MessageSMS['type'];
  langue: Language;
  contenu: string;
  referencePaiementId?: string;
}

export interface SmsProviderResult {
  success: boolean;
  messageId: string;
  statut: 'envoye' | 'en_attente' | 'echec';
  details?: string;
}

export interface SmsProvider {
  id: string;
  nom: string;
  sendSms(options: SmsSendOptions): Promise<SmsProviderResult>;
}

/**
 * Fournisseur SMS Local & Démonstration
 * Enregistre les SMS dans les logs console et dans l'historique interne de l'application
 */
export class ConsoleAndLogSmsProvider implements SmsProvider {
  id = 'console_logger';
  nom = 'Simulateur SMS Niger (Logs locaux)';

  async sendSms(options: SmsSendOptions): Promise<SmsProviderResult> {
    const messageId = `SMS-NIG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const length = options.contenu.length;
    const isSingleSms = length <= 160;

    console.log(
      `%c[SMS NIGER OUTBOX] Envoi à ${options.destinataire} (${options.destinataireNom}) - Langue: ${options.langue} - Longueur: ${length} cars (${isSingleSms ? '1 SMS' : 'SMS concaténé'})`,
      'background: #0D5C3A; color: #fff; font-weight: bold; padding: 2px 6px;'
    );
    console.log(`Contenu: "${options.contenu}"`);

    return {
      success: true,
      messageId,
      statut: 'envoye',
      details: `SMS simulé délivré au réseau GSM Niger (${options.destinataire}). Longueur: ${length} caractères.`,
    };
  }
}

/**
 * Fournisseur SMS HTTP configurable via variables d'environnement
 * Compatible avec les passerelles SMS opérant au Niger (ex: Hub2, Orange/Airtel SMS API, Twilio, Infobip)
 */
export class ConfigurableHttpSmsProvider implements SmsProvider {
  id = 'http_gateway';
  nom = 'Passerelle HTTP SMS (Configurable)';

  private gatewayUrl: string;
  private apiKey: string;
  private senderId: string;

  constructor() {
    this.gatewayUrl = import.meta.env.VITE_SMS_GATEWAY_URL || '';
    this.apiKey = import.meta.env.VITE_SMS_API_KEY || '';
    this.senderId = import.meta.env.VITE_SMS_SENDER_ID || 'Loyo';
  }

  async sendSms(options: SmsSendOptions): Promise<SmsProviderResult> {
    if (!this.gatewayUrl) {
      // Si aucune URL n'est configurée, déléguer au logger de démo
      const fallback = new ConsoleAndLogSmsProvider();
      return fallback.sendSms(options);
    }

    try {
      const response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.senderId,
          to: options.destinataire,
          text: options.contenu,
          message_type: 'GSM7',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          messageId: data.message_id || `SMS-${Date.now()}`,
          statut: 'envoye',
          details: 'Délivré à la passerelle SMS',
        };
      } else {
        return {
          success: false,
          messageId: `ERR-${Date.now()}`,
          statut: 'echec',
          details: `Erreur HTTP passerelle: ${response.status}`,
        };
      }
    } catch (err) {
      console.warn('[SMS Gateway] Erreur réseau:', err);
      return {
        success: false,
        messageId: `ERR-${Date.now()}`,
        statut: 'echec',
        details: 'Impossible de joindre la passerelle SMS',
      };
    }
  }
}

export const activeSmsProvider: SmsProvider = import.meta.env.VITE_SMS_GATEWAY_URL
  ? new ConfigurableHttpSmsProvider()
  : new ConsoleAndLogSmsProvider();
