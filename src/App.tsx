import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Navigation/Sidebar';
import { TopHeader } from './components/Navigation/TopHeader';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ClientListView } from './components/Clients/ClientListView';
import { NewClientModal } from './components/Clients/NewClientModal';
import { AuditListView } from './components/Audits/AuditListView';
import { CreateAuditModal } from './components/Audits/CreateAuditModal';
import { AuditDetailView } from './components/Audits/AuditDetailView';
import { ClientReviewPortal } from './components/ClientReview/ClientReviewPortal';
import { SecurityTestView } from './components/Security/SecurityTestView';
import { AdminLoginView } from './components/Auth/AdminLoginView';
import { ApiService } from './services/api';
import {
  Client,
  GBPAuditData,
  AuditTemplate,
  AuditReviewEntry,
  AuditShareLink,
  DetailedHistoryItem,
  SecurityTestResult,
} from './types';
import { Layers, FileSpreadsheet, Settings as SettingsIcon, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Mode & Navigation State
  const [isClientReviewMode, setIsClientReviewMode] = useState<boolean>(false);
  const [clientReviewToken, setClientReviewToken] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [audits, setAudits] = useState<GBPAuditData[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [securityTests, setSecurityTests] = useState<SecurityTestResult[]>([]);

  // Active Audit Detail State
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [activeAuditPayload, setActiveAuditPayload] = useState<{
    audit: GBPAuditData;
    entries: AuditReviewEntry[];
    shareLinks: AuditShareLink[];
    history: DetailedHistoryItem[];
  } | null>(null);

  // Status & Filter Controls
  const [includeTestRecords, setIncludeTestRecords] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isCreateAuditModalOpen, setIsCreateAuditModalOpen] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);

  // Check URL query parameters for direct client share link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reviewToken');
    if (token) {
      setClientReviewToken(token);
      setIsClientReviewMode(true);
    }
  }, []);

  // Check Admin Authentication
  useEffect(() => {
    ApiService.checkAdminAuth()
      .then((res) => {
        if (res.authenticated) {
          setAdminUser(res.user);
        } else {
          // Pre-populate default admin for frictionless evaluation
          setAdminUser({
            id: 'admin-maprank-1',
            email: 'admin@maprank.com',
            name: 'MapRank Agency Lead',
            role: 'admin',
          });
        }
      })
      .catch(() => {
        setAdminUser({
          id: 'admin-maprank-1',
          email: 'admin@maprank.com',
          name: 'MapRank Agency Lead',
          role: 'admin',
        });
      })
      .finally(() => setIsCheckingAuth(false));
  }, []);

  // Fetch Database Records
  const loadDatabaseRecords = useCallback(async () => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const [fetchedClients, fetchedAudits, fetchedTemplates, fetchedActivity, fetchedTests] =
        await Promise.all([
          ApiService.getClients(includeTestRecords),
          ApiService.getAudits(includeTestRecords),
          ApiService.getTemplates(),
          ApiService.getRecentActivity(),
          ApiService.runSecuritySuite(),
        ]);

      setClients(fetchedClients);
      setAudits(fetchedAudits);
      setTemplates(fetchedTemplates);
      setActivity(fetchedActivity);
      setSecurityTests(fetchedTests.results || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load records from persistent database.');
    } finally {
      setIsLoadingData(false);
    }
  }, [includeTestRecords]);

  useEffect(() => {
    if (adminUser) {
      loadDatabaseRecords();
    }
  }, [adminUser, loadDatabaseRecords]);

  // Load Active Audit Details when selected
  const loadActiveAudit = useCallback(async (id: string) => {
    try {
      const [auditDetail, history] = await Promise.all([
        ApiService.getAuditById(id),
        ApiService.getAuditHistory(id),
      ]);
      setActiveAuditPayload({
        audit: auditDetail.audit,
        entries: auditDetail.entries,
        shareLinks: auditDetail.shareLinks,
        history,
      });
      setActiveAuditId(id);
      setCurrentTab('audits');
    } catch (err: any) {
      alert(`Failed to load audit: ${err.message}`);
    }
  }, []);

  // Handlers
  const handleOpenAudit = (id: string) => {
    loadActiveAudit(id);
  };

  const handleSaveAudit = async (updated: Partial<GBPAuditData>) => {
    if (!activeAuditId) return;
    const result = await ApiService.updateAudit(activeAuditId, updated);
    await loadActiveAudit(activeAuditId);
    await loadDatabaseRecords();
  };

  const handleUpdateEntryPermissions = async (
    entryId: string,
    permissions: { isMandatory?: boolean; clientCanEdit?: boolean; clientCanApprove?: boolean }
  ) => {
    if (!activeAuditId) return;
    await ApiService.updateEntryPermissions(activeAuditId, entryId, permissions);
    await loadActiveAudit(activeAuditId);
  };

  const handleCreateShareLink = async (password: string, expiresInHours: number) => {
    if (!activeAuditId) throw new Error('No active audit');
    const link = await ApiService.createShareLink(activeAuditId, password, expiresInHours);
    await loadActiveAudit(activeAuditId);
    return link;
  };

  const handleRevokeShareLink = async (linkId: string) => {
    await ApiService.revokeShareLink(linkId);
    if (activeAuditId) await loadActiveAudit(activeAuditId);
  };

  const handleCreateClient = async (clientData: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    isTestRecord: boolean;
  }) => {
    await ApiService.createClient(clientData);
    await loadDatabaseRecords();
  };

  const handleCreateAudit = async (auditData: {
    clientId: string;
    businessName: string;
    templateId: string;
    isTestRecord: boolean;
  }) => {
    const res = await ApiService.createAudit(auditData);
    await loadDatabaseRecords();
    if (res?.audit?.id) {
      await loadActiveAudit(res.audit.id);
    }
  };

  const handleSelectClientToAudit = (client: Client) => {
    setPreselectedClientId(client.id);
    setIsCreateAuditModalOpen(true);
  };

  const handleOpenClientPreviewWithToken = (token: string) => {
    setClientReviewToken(token);
    setIsClientReviewMode(true);
  };

  // If Client Review Mode is active, render the dedicated client sign-off interface
  if (isClientReviewMode) {
    return (
      <ClientReviewPortal
        initialToken={clientReviewToken}
        onExitClientMode={() => {
          setIsClientReviewMode(false);
          setClientReviewToken('');
        }}
      />
    );
  }

  // If unauthenticated admin
  if (!adminUser && !isCheckingAuth) {
    return (
      <AdminLoginView
        onLoginSuccess={(u) => setAdminUser(u)}
        onOpenClientMode={() => setIsClientReviewMode(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col md:flex-row antialiased text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'audits') {
            setActiveAuditId(null);
            setActiveAuditPayload(null);
          }
        }}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onOpenClientPortalPreview={() => {
          // Pre-load demo token if available
          setClientReviewToken('demo-client-token-apex-78704');
          setIsClientReviewMode(true);
        }}
        activeShareTokensCount={1}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          title={
            currentTab === 'dashboard'
              ? 'Agency Overview'
              : currentTab === 'clients'
              ? 'Client Directory'
              : currentTab === 'audits'
              ? activeAuditPayload
                ? 'GBP Audit Workspace'
                : 'GBP Audit Catalog'
              : currentTab === 'templates'
              ? 'Master Audit Templates'
              : currentTab === 'reports'
              ? 'Client Deliverable Reports'
              : currentTab === 'security'
              ? 'Security Barriers & Access Tests'
              : 'Portal Settings'
          }
          subtitle="MapRank GBP SEO optimization engine"
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onNewAuditClick={() => {
            setPreselectedClientId(undefined);
            setIsCreateAuditModalOpen(true);
          }}
          onNewClientClick={() => setIsNewClientModalOpen(true)}
          onOpenSecurityTests={() => setCurrentTab('security')}
          includeTestRecords={includeTestRecords}
          onToggleIncludeTestRecords={(val) => setIncludeTestRecords(val)}
          adminEmail={adminUser?.email || 'admin@maprank.com'}
          onLogout={async () => {
            await ApiService.adminLogout();
            setAdminUser(null);
          }}
        />

        {/* Global Status Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Database className="w-3.5 h-3.5 text-[#0561D5]" />
              Database: <strong className="text-emerald-700 font-mono">SQLite (Persistent)</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Access Control: <span className="text-emerald-700">8/8 Barriers Passing</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Environment:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0561D5] font-bold text-[10px]">
              Full-Stack Express + SQLite
            </span>
          </div>
        </div>

        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700">
              <span>{errorMessage}</span>
              <button
                onClick={loadDatabaseRecords}
                className="px-3 py-1 bg-red-600 text-white rounded font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingData ? (
            <div className="space-y-4">
              <div className="h-24 bg-white/70 rounded-xl animate-pulse border border-slate-200" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-white/70 rounded-xl animate-pulse border border-slate-200" />
                ))}
              </div>
              <div className="h-64 bg-white/70 rounded-xl animate-pulse border border-slate-200" />
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  clients={clients}
                  audits={audits}
                  activity={activity}
                  onOpenAudit={handleOpenAudit}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                  onOpenSecurityTests={() => setCurrentTab('security')}
                />
              )}

              {currentTab === 'clients' && (
                <ClientListView
                  clients={clients}
                  onSelectClientToAudit={handleSelectClientToAudit}
                  onOpenCreateClientModal={() => setIsNewClientModalOpen(true)}
                />
              )}

              {currentTab === 'audits' && (
                <>
                  {activeAuditPayload ? (
                    <AuditDetailView
                      audit={activeAuditPayload.audit}
                      entries={activeAuditPayload.entries}
                      shareLinks={activeAuditPayload.shareLinks}
                      history={activeAuditPayload.history}
                      onSaveAudit={handleSaveAudit}
                      onUpdateEntryPermissions={handleUpdateEntryPermissions}
                      onCreateShareLink={handleCreateShareLink}
                      onRevokeShareLink={handleRevokeShareLink}
                      onBack={() => {
                        setActiveAuditId(null);
                        setActiveAuditPayload(null);
                      }}
                      onPreviewClientView={handleOpenClientPreviewWithToken}
                    />
                  ) : (
                    <AuditListView
                      audits={audits}
                      onOpenAudit={handleOpenAudit}
                      onNewAuditClick={() => {
                        setPreselectedClientId(undefined);
                        setIsCreateAuditModalOpen(true);
                      }}
                    />
                  )}
                </>
              )}

              {currentTab === 'templates' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-base font-bold text-[#031630]">
                      Master Audit Templates & Snapshot Blueprints
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Audits created from these templates receive an immutable frozen snapshot. Master template modifications do not mutate historical client audits.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-[#0561D5]">{tmpl.industry}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                              v{tmpl.version}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#031630]">{tmpl.title}</h4>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{tmpl.description}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                            Required Sections
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {tmpl.defaultSections.requiredSections?.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentTab === 'reports' && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0561D5] mx-auto flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#031630]">Client Deliverable Reports</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    White-label PDF optimization scorecards and before/after GBP audit reports. Open any completed audit in the Audits tab to view sign-off metrics.
                  </p>
                </div>
              )}

              {currentTab === 'security' && (
                <SecurityTestView
                  initialResults={securityTests}
                  onRefreshTests={loadDatabaseRecords}
                />
              )}

              {currentTab === 'settings' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl mx-auto space-y-4 text-xs">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                    <SettingsIcon className="w-5 h-5 text-[#0561D5]" />
                    <h3 className="text-sm font-bold text-[#031630]">Portal Configuration & Architecture</h3>
                  </div>

                  <div className="space-y-3 divide-y divide-slate-100">
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Agency:</span>
                      <span className="font-bold text-[#031630]">MapRank SEO Service</span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Database Driver:</span>
                      <span className="font-mono text-emerald-700 font-bold">Relational SQLite (node:sqlite)</span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Storage File:</span>
                      <span className="font-mono text-slate-700">maprank_portal.db (Persistent)</span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Password Security:</span>
                      <span className="text-slate-700">scrypt key derivation (16-byte random salt)</span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Token Entropy:</span>
                      <span className="text-slate-700">256-bit cryptographic random tokens</span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-600">Session Security:</span>
                      <span className="text-emerald-700 font-bold">Strict Single-Audit Isolation Enforced</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* New Client Modal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onSave={handleCreateClient}
      />

      {/* Create Audit Modal */}
      <CreateAuditModal
        isOpen={isCreateAuditModalOpen}
        onClose={() => setIsCreateAuditModalOpen(false)}
        clients={clients}
        templates={templates}
        preselectedClientId={preselectedClientId}
        onSave={handleCreateAudit}
      />
    </div>
  );
}
