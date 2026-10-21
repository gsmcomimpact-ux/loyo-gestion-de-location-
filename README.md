# LoyerFacile — Application de Gestion Locative (Niger)

**LoyerFacile** est une Progressive Web App (PWA) conçue spécifiquement pour le contexte nigérien (Niamey et régions), permettant aux propriétaires et à leurs collecteurs (gardiens, proches) de gérer facilement leurs biens, d'enregistrer des encaissements en espèces et mobile money en 2 clics, de générer des quittances officielles avec numérotation continue, et de se conformer au **Décret d'avril 2026 sur le plafonnement des loyers et l'obligation de déclaration communale**.

---

## 1. Contexte & Spécificités Niger

- **Décret d'Avril 2026** :
  - **Plafonnement des loyers F2 et F3** selon les zones urbaines (ex : Niamey I à V).
  - **Hausse limitée à 10% maximum**, subordonnée obligatoirement à des travaux ou améliorations justifiés du logement.
  - **Déclaration obligatoire de chaque bail à la commune sous 3 mois** : alertes progressives à J-30, J-15 et J-7, avec génération du formulaire officiel PDF prêt à signer et déposer en mairie.
- **Certificat Numérique Unique & QR Code Sécurisé** :
  - Chaque quittance de loyer générée se voit attribuer une **empreinte cryptographique unique** (hash SHA-256) et un identifiant officiel (ex: `CERT-NIG-2026-8A31-4F10`).
  - Un **QR code scannable** est incrusté directement sur le PDF de la quittance et consultable dans l'application.
  - Le scan du QR code ou la recherche par numéro permet à n'importe quel tiers (locataire, agent de mairie, inspecteur fiscal, banque) de **vérifier instantanément l'authenticité légale** du document.
- **Réalités locales** :

  - Fonctionnement **100% Hors-Ligne (Offline)** avec IndexedDB et synchronisation automatique sans doublon dès retour du réseau.
  - Prédominance des paiements en **espèces** (encaissement en 2 clics avec traçabilité du collecteur) et intégration **Mobile Money** (Airtel Money, Moov Flooz, Zamani Cash).
  - Communication avec les locataires **uniquement par SMS** (aucune obligation de smartphone pour le locataire).
  - Modèles de messages et interface multilingues : **Français**, **Haoussa (Hausa)** et **Zarma (Djerma)**.
  - Format monétaire nigérien : **FCFA** (ex: `25 000 FCFA` avec espace de milliers, sans décimales). Fuseau horaire `Africa/Niamey`.

---

## 2. Rôles et Utilisateurs

1. **Propriétaire (Bailleur)** : Vision globale du parc, encaissements, relances SMS, suivi des dépôts de garantie (cautions), déclarations communales.
2. **Collecteur (Gardien, Mandataire)** : Accès restreint uniquement aux logements qui lui sont attribués, écran grand format tactile pour valider les paiements en espèces ou mobile money et remettre la quittance.
3. **Administrateur** : Mise à jour de la table des plafonds légaux de loyer (modifiables sans toucher au code), gestion des zones, des modèles de messages SMS en FR/HA/DJE et des formules d'abonnements.

---

## 3. Installation et Démarrage

### Prérequis
- Node.js 20+ ou 22+
- npm ou pnpm

### Commandes
```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement (port 3000)
npm run dev

# Compilation pour la production
npm run build
```

---

## 4. Variables d'Environnement (.env)

Copiez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

| Variable | Description | Exemple |
|---|---|---|
| `VITE_IPAYMONEY_API_KEY` | Clé d'API fournie par l'agrégateur iPayMoney Niger | `sec_live_98ab71...` |
| `VITE_IPAYMONEY_BASE_URL` | URL de l'API iPayMoney | `https://api.ipaymoney.net/v1` |
| `VITE_SMS_GATEWAY_URL` | URL du point de terminaison HTTP de votre passerelle SMS | `https://api.gateway-sms.ne/v1/send` |
| `VITE_SMS_API_KEY` | Clé d'authentification Bearer de la passerelle SMS | `token_sms_niger_...` |
| `VITE_SMS_SENDER_ID` | Identifiant d'expéditeur GSM approuvé par l'ARCEP Niger | `LoyerFacile` |

*Note : En l'absence de clés réelles ou en environnement de démonstration, l'application utilise automatiquement les couches simulées `ConsoleAndLogSmsProvider` et `IPayMoneyProvider` pour vous permettre de tester immédiatement l'ensemble des parcours.*

---

## 5. Comment brancher le Fournisseur SMS

L'architecture repose sur l'interface TypeScript `SmsProvider` située dans `src/services/smsProvider.ts` :

```typescript
export interface SmsProvider {
  id: string;
  nom: string;
  sendSms(options: SmsSendOptions): Promise<SmsProviderResult>;
}
```

1. **Pour utiliser une passerelle HTTP standard (ex: Orange Niger SMS API, Airtel Partner, Twilio, Infobip ou agrégateur régional)** :
   - Renseignez simplement `VITE_SMS_GATEWAY_URL` et `VITE_SMS_API_KEY` dans votre `.env`.
   - La classe `ConfigurableHttpSmsProvider` envoie une requête POST au format JSON avec les champs `from`, `to`, `text`.
2. **Pour une intégration personnalisée avec webhook ou SMPP** :
   - Implémentez l'interface `SmsProvider` dans `src/services/smsProvider.ts`.
   - Retournez le `messageId` et le statut `'envoye'`.

Les SMS sont encodés en respectant la limite GSM-7 (160 caractères) pour limiter les coûts d'envoi.

---

## 6. Comment brancher l'Agrégateur iPayMoney

L'interface `PaymentProvider` dans `src/services/paymentProviders.ts` gère l'abstraction :

```typescript
export interface PaymentProvider {
  id: string;
  nom: string;
  initiatePayment(req: MobilePaymentRequest): Promise<PaymentProviderResult>;
  verifyPayment(reference: string): Promise<PaymentProviderResult>;
}
```

- La classe `IPayMoneyProvider` prend en charge le Push USSD vers les abonnés **Airtel Money**, **Moov Flooz** et **Zamani Cash**.
- Renseignez `VITE_IPAYMONEY_API_KEY` et l'URL d'API de production.
- Le mode manuel permet également au propriétaire ou collecteur de saisir simplement la référence de transaction SMS reçue pour confirmation instantanée.

---

## 7. Comment mettre à jour la Table des Plafonds (Décret 2026)

**Aucun plafond n'est codé en dur** dans les règles métier. La table est entièrement dynamique :

1. Connectez-vous avec le rôle **Administrateur** via le sélecteur en haut à droite.
2. Rendez-vous sur l'onglet **« Plafonds & Admin »**.
3. Vous y trouverez la table de toutes les zones (Commune I à V de Niamey) et types de logements (F2, F3).
4. Cliquez sur **« Modifier »** pour ajuster un montant ou ajouter un nouveau plafond avec un bouton dédié.
5. Toute modification est immédiatement répercutée sur le contrôle de conformité lors de la saisie d'un nouveau loyer ou d'une révision.
6. Les plafonds de test initiaux sont clairement identifiés par la mention **« À VÉRIFIER (Décret Avril 2026) »**, notamment le plafond de **80 000 FCFA pour un F3 à Niamey I**.

---

## 8. Données de Démonstration Incluses

Pour faciliter vos tests, l'application est pré-chargée avec :
- **Propriétaire** : Elhadj Hassan Issoufou (+227 96 45 12 30)
- **2 Biens à Niamey** :
  - *Résidence Sahel* (Quartier Yantala, Commune I)
  - *Cour Familiale* (Harobanda, Commune V)
- **6 Logements** : F3, F2 et chambres-salons (5 occupés, 1 libre).
- **1 Collecteur de terrain** : Moussa Dan Baba (+227 90 22 14 55), gardien assigné à 3 logements.
- **5 Locataires** avec langues variées (Français, Haoussa, Zarma).
- **1 Locataire en retard** : Oumarou Garba (Chambre-salon 1, 8 jours de retard) permettant de tester le rappel SMS en 1 clic.
- **1 Bail à déclarer sous 3 mois** : Mariama Seydou (échéance dans 23 jours, badge J-23) permettant de tester la génération du PDF officiel pour la mairie.
- Bouton **« Réinitialiser démo Niamey »** disponible à tout moment dans le menu profil.
