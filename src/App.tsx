/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppDatabase,
  UserRole,
  Language,
  Logement,
  Locataire,
  Bail,
  Paiement,
  Plafond,
  ModeleSMS,
  Collecteur,
  SubscriptionPlanCode,
  Echeance,
} from './types';
import { LocalStorageManager } from './services/storage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { DashboardView } from './components/views/DashboardView';
import { PaymentsView } from './components/views/PaymentsView';
import { PropertiesView } from './components/views/PropertiesView';
import { TenantsView } from './components/views/TenantsView';
import { LeaseDeclarationView } from './components/views/LeaseDeclarationView';
import { CollectorsView } from './components/views/CollectorsView';
import { CollectorDeskView } from './components/views/CollectorDeskView';
import { AdminView } from './components/views/AdminView';
import { QuickPayModal } from './components/QuickPayModal';
import { AddHousingModal } from './components/AddHousingModal';
import { AddTenantModal } from './components/AddTenantModal';
import { SmsOutboxModal } from './components/views/SmsOutboxModal';
import { SubscriptionModal } from './components/views/SubscriptionModal';
import { VerifyCertificateModal } from './components/VerifyCertificateModal';
import { TenantPublicPayModal } from './components/TenantPublicPayModal';
import { formatNigerPhone } from './utils/formatters';
import { Smartphone, Lock, CheckCircle2, Shield, ArrowRight, QrCode } from 'lucide-react';


export default function App() {
  const isOnline = useOnlineStatus();

  // Database State
  const [db, setDb] = useState<AppDatabase>(() => LocalStorageManager.getDB());
  const [activeRole, setActiveRole] = useState<UserRole>('proprietaire');
  const [language, setLanguage] = useState<Language>('fr');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayLogementId, setQuickPayLogementId] = useState<string | undefined>(undefined);

  const [isAddHousingOpen, setIsAddHousingOpen] = useState(false);
  const [editingLogement, setEditingLogement] = useState<Logement | null>(null);

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isSmsOutboxOpen, setIsSmsOutboxOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInitialQuery, setVerifyInitialQuery] = useState('');
  const [publicPayEcheance, setPublicPayEcheance] = useState<Echeance | null>(null);

  // Auto-detect ?verify= ou ?quittance= ou ?pay= (portail de paiement locataire)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify') || params.get('quittance');
      if (verifyParam) {
        setVerifyInitialQuery(verifyParam);
        setIsVerifyModalOpen(true);
      }

      const payParam = params.get('pay');
      if (payParam) {
        const found = db.echeances.find((e) => e.tokenLienPublic === payParam);
        if (found) {
          setPublicPayEcheance(found);
        }
      }
    }
  }, [db.echeances]);

  // OTP Login Simulation State (pour montrer la conformité au point 1 du MVP)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Logged in by default for testing

  const [showOtpScreen, setShowOtpScreen] = useState<boolean>(false);
  const [loginPhone, setLoginPhone] = useState<string>('+227 96 45 12 30');
  const [otpCode, setOtpCode] = useState<string>('');
  const [sentOtp, setSentOtp] = useState<string | null>(null);

  // Save DB helper
  const updateDb = (newDb: AppDatabase) => {
    setDb({ ...newDb });
    LocalStorageManager.saveDB(newDb);
  };

  // Sync effect when connection returns
  useEffect(() => {
    if (isOnline && db.syncQueue && db.syncQueue.length > 0) {
      const res = LocalStorageManager.syncQueue(db);
      if (res.syncedCount > 0) {
        setSyncSuccessMsg(`${res.syncedCount} encaissement(s) synchronisé(s) avec succès !`);
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
    }
  }, [isOnline, db]);

  // Adjust active tab when switching roles
  useEffect(() => {
    if (activeRole === 'collecteur') {
      setCurrentTab('collector_desk');
    } else if (activeRole === 'admin') {
      setCurrentTab('admin');
    } else {
      if (currentTab === 'collector_desk' || currentTab === 'admin') {
        setCurrentTab('dashboard');
      }
    }
  }, [activeRole]);

  // Handlers
  const handleOpenQuickPay = (logementId?: string) => {
    setQuickPayLogementId(logementId);
    setIsQuickPayOpen(true);
  };

  const handlePaymentSaved = (paiement: Paiement) => {
    const updatedPaiements = [paiement, ...db.paiements];
    let updatedQueue = db.syncQueue;

    if (!isOnline) {
      updatedQueue = [
        ...db.syncQueue,
        {
          type: 'paiement',
          action: 'create',
          data: paiement,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    updateDb({
      ...db,
      paiements: updatedPaiements,
      syncQueue: updatedQueue,
    });
  };

  const handleLogementAdded = (logement: Logement) => {
    const exists = db.logements.some((l) => l.id === logement.id);
    let updatedLogements: Logement[];

    if (exists) {
      updatedLogements = db.logements.map((l) => (l.id === logement.id ? logement : l));
    } else {
      updatedLogements = [...db.logements, logement];
    }

    updateDb({
      ...db,
      logements: updatedLogements,
    });
  };

  const handleTenantAdded = (locataire: Locataire, bail: Bail) => {
    // Mark logement as occupied
    const updatedLogements = db.logements.map((l) =>
      l.id === locataire.logementId ? { ...l, statut: 'occupe' as const } : l
    );

    updateDb({
      ...db,
      locataires: [locataire, ...db.locataires],
      baux: [bail, ...db.baux],
      logements: updatedLogements,
    });
  };

  const handleTenantUpdated = (locataire: Locataire) => {
    const updated = db.locataires.map((l) => (l.id === locataire.id ? locataire : l));
    updateDb({
      ...db,
      locataires: updated,
    });
  };

  const handleBailUpdated = (bail: Bail) => {
    const updated = db.baux.map((b) => (b.id === bail.id ? bail : b));
    updateDb({
      ...db,
      baux: updated,
    });
  };

  const handleCollectorAdded = (collector: Collecteur) => {
    updateDb({
      ...db,
      collecteurs: [...db.collecteurs, collector],
    });
  };

  const handleCollectorUpdated = (collector: Collecteur) => {
    const updated = db.collecteurs.map((c) => (c.id === collector.id ? collector : c));
    updateDb({
      ...db,
      collecteurs: updated,
    });
  };

  const handlePlafondUpdated = (plafond: Plafond) => {
    const updated = db.plafonds.map((p) => (p.id === plafond.id ? plafond : p));
    updateDb({
      ...db,
      plafonds: updated,
    });
  };

  const handlePlafondAdded = (plafond: Plafond) => {
    updateDb({
      ...db,
      plafonds: [plafond, ...db.plafonds],
    });
  };

  const handleSmsTemplateUpdated = (template: ModeleSMS) => {
    const updated = db.modelesSMS.map((m) => (m.code === template.code ? template : m));
    updateDb({
      ...db,
      modelesSMS: updated,
    });
  };

  const handleSelectPlan = (code: SubscriptionPlanCode) => {
    const updatedProprio = { ...db.proprietaires[0], formule: code };
    updateDb({
      ...db,
      proprietaires: [updatedProprio],
    });
  };

  const handleResetDemo = () => {
    if (confirm('Voulez-vous réinitialiser les données de démo de Niamey ?')) {
      const fresh = LocalStorageManager.resetToDemo();
      setDb(fresh);
    }
  };

  // OTP Login Simulation
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setSentOtp(generated);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === sentOtp || otpCode === '1234') {
      setIsAuthenticated(true);
      setShowOtpScreen(false);
    } else {
      alert('Code OTP invalide. Essayez avec le code affiché.');
    }
  };

  const currentPlan =
    db.formules.find((f) => f.code === db.proprietaires[0]?.formule) || db.formules[0];

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 font-sans selection:bg-emerald-700 selection:text-white">
      {/* Offline Status & Sync Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={db.syncQueue?.length || 0}
        onSync={() => {
          const res = LocalStorageManager.syncQueue(db);
          setSyncSuccessMsg(`${res.syncedCount} encaissement(s) synchronisé(s) !`);
          setTimeout(() => setSyncSuccessMsg(null), 4000);
        }}
        syncSuccessMessage={syncSuccessMsg}
      />

      {/* Main Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        language={language}
        onChangeLanguage={setLanguage}
        totalLogements={db.logements.length}
        currentPlan={currentPlan}
        onOpenSmsOutbox={() => setIsSmsOutboxOpen(true)}
        unreadSmsCount={db.messagesSMS.length}
        onResetDemo={handleResetDemo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* View Routing */}
        {currentTab === 'dashboard' && (
          <DashboardView
            db={db}
            onOpenQuickPay={handleOpenQuickPay}
            onOpenAddHousing={() => {
              setEditingLogement(null);
              setIsAddHousingOpen(true);
            }}
            onOpenAddTenant={() => setIsAddTenantOpen(true)}
            onNavigateTab={setCurrentTab}
            onSmsSent={() => setDb({ ...db })}
          />
        )}

        {currentTab === 'collector_desk' && (
          <CollectorDeskView db={db} onOpenQuickPay={handleOpenQuickPay} />
        )}

        {currentTab === 'payments' && (
          <PaymentsView
            db={db}
            onOpenQuickPay={handleOpenQuickPay}
            onSmsSent={() => setDb({ ...db })}
            onDbUpdated={() => setDb({ ...db })}
          />
        )}

        {currentTab === 'properties' && (
          <PropertiesView
            db={db}
            onOpenAddHousing={() => {
              setEditingLogement(null);
              setIsAddHousingOpen(true);
            }}
            onEditHousing={(log) => {
              setEditingLogement(log);
              setIsAddHousingOpen(true);
            }}
            onOpenQuickPay={handleOpenQuickPay}
          />
        )}

        {currentTab === 'tenants' && (
          <TenantsView
            db={db}
            onOpenAddTenant={() => setIsAddTenantOpen(true)}
            onOpenQuickPay={handleOpenQuickPay}
            onSmsSent={() => setDb({ ...db })}
            onTenantUpdated={handleTenantUpdated}
          />
        )}

        {currentTab === 'declarations' && (
          <LeaseDeclarationView db={db} onBailUpdated={handleBailUpdated} />
        )}

        {currentTab === 'collectors' && (
          <CollectorsView
            db={db}
            onCollectorAdded={handleCollectorAdded}
            onCollectorUpdated={handleCollectorUpdated}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView
            db={db}
            onPlafondUpdated={handlePlafondUpdated}
            onPlafondAdded={handlePlafondAdded}
            onSmsTemplateUpdated={handleSmsTemplateUpdated}
          />
        )}
      </main>

      {/* Footer minimal & ergonomique */}
      <footer className="bg-stone-900 text-stone-400 py-6 px-4 border-t border-stone-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-[10px] font-black text-white inline-flex items-center justify-center">LO</span>
              Loyo
            </span>
            <span>· Plateforme Francophone de Gestion Locative & Quittances Certifiées</span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="hover:text-emerald-400 font-semibold transition"
            >
              Formules d'abonnement ({currentPlan.nom})
            </button>
            <span>·</span>
            <button
              onClick={() => {
                setVerifyInitialQuery('');
                setIsVerifyModalOpen(true);
              }}
              className="hover:text-emerald-400 font-semibold transition flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Vérifier un QR / Certificat</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setShowOtpScreen(true)}
              className="hover:text-stone-200 transition"
            >
              Test Connexion OTP
            </button>
          </div>
        </div>
      </footer>

      {/* Modal QuickPay (2-clics) */}
      <QuickPayModal
        isOpen={isQuickPayOpen}
        onClose={() => {
          setIsQuickPayOpen(false);
          setQuickPayLogementId(undefined);
        }}
        db={db}
        onPaymentSaved={handlePaymentSaved}
        activeRole={activeRole}
        preselectedLogementId={quickPayLogementId}
      />

      {/* Modal Add / Edit Housing */}
      <AddHousingModal
        isOpen={isAddHousingOpen}
        onClose={() => {
          setIsAddHousingOpen(false);
          setEditingLogement(null);
        }}
        db={db}
        onLogementAdded={handleLogementAdded}
        editingLogement={editingLogement}
      />

      {/* Modal Add Tenant */}
      <AddTenantModal
        isOpen={isAddTenantOpen}
        onClose={() => setIsAddTenantOpen(false)}
        db={db}
        onTenantAdded={handleTenantAdded}
      />

      {/* Modal SMS Outbox */}
      <SmsOutboxModal
        isOpen={isSmsOutboxOpen}
        onClose={() => setIsSmsOutboxOpen(false)}
        messages={db.messagesSMS}
      />

      {/* Modal Subscriptions */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        db={db}
        onSelectPlan={handleSelectPlan}
      />

      {/* Modal Vérification de Certificat Numérique & QR Code */}
      <VerifyCertificateModal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setVerifyInitialQuery('');
        }}
        db={db}
        initialQuery={verifyInitialQuery}
      />


      {/* Modal Test Connexion OTP par SMS (Feature 1 MVP) */}
      {showOtpScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-800" />
                <span>Connexion OTP par SMS</span>
              </h2>
              <button
                onClick={() => setShowOtpScreen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {!sentOtp ? (
              <form onSubmit={handleRequestOtp} className="mt-4 space-y-4">
                <p className="text-xs text-stone-600">
                  Entrez votre numéro de téléphone au Niger pour recevoir un code temporaire de connexion par SMS.
                </p>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Numéro de téléphone (+227)
                  </label>
                  <input
                    type="text"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full text-sm font-mono rounded-xl border border-stone-300 p-2.5 bg-stone-50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Envoyer le code OTP par SMS
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  Code SMS simulé envoyé au <strong>{loginPhone}</strong> :{' '}
                  <strong className="font-mono text-emerald-800 font-black text-sm">{sentOtp}</strong>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Saisissez le code à 4 chiffres reçu
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Ex: 1234"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full text-center text-xl font-bold tracking-widest font-mono rounded-xl border border-stone-300 p-2.5 bg-stone-50 focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Vérifier et accéder à mon compte
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
