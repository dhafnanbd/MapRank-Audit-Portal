import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Key,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  MessageSquare,
  Building,
  Check,
  X,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { AuditReviewEntry } from '../../types';

interface ClientReviewPortalProps {
  initialToken?: string;
  onExitClientMode: () => void;
}

export const ClientReviewPortal: React.FC<ClientReviewPortalProps> = ({
  initialToken = '',
  onExitClientMode,
}) => {
  // Authentication State
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [passwordInput, setPasswordInput] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Review State
  const [auditInfo, setAuditInfo] = useState<{
    id: string;
    businessName: string;
    status: string;
    completionScore: number;
    isTestRecord: boolean;
    updatedAt: string;
  } | null>(null);
  const [entries, setEntries] = useState<AuditReviewEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [saveStatusMap, setSaveStatusMap] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  // Request Changes Dialog
  const [activeCommentEntryId, setActiveCommentEntryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Debounce timers ref for autosave
  const debounceTimers = useRef<Record<string, any>>({});

  // If token was provided via props / query, populate it
  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
    }
  }, [initialToken]);

  // Handle Client Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !passwordInput.trim()) {
      setAuthError('Please enter both the review token and access password.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await ApiService.clientAuthenticate(tokenInput.trim(), passwordInput.trim());
      setSessionToken(res.sessionToken);
      setAuditId(res.auditId);
    } catch (err: any) {
      setAuthError(err.message || 'Access Denied: Incorrect password or expired token.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Load authorized audit when authenticated
  useEffect(() => {
    if (sessionToken) {
      setIsLoadingAudit(true);
      ApiService.clientGetAudit(sessionToken)
        .then((data) => {
          setAuditInfo(data.audit);
          setEntries(data.entries);
        })
        .catch((err) => {
          setAuthError(`Failed to load audit: ${err.message}`);
          setSessionToken(null);
        })
        .finally(() => setIsLoadingAudit(false));
    }
  }, [sessionToken]);

  // Autosave Handler with confirmation
  const handleFieldChange = (entry: AuditReviewEntry, val: any) => {
    if (!sessionToken || !auditId) return;

    // Update local state immediately for responsive typing
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, fieldValue: val } : e))
    );

    setSaveStatusMap((prev) => ({ ...prev, [entry.id]: 'saving' }));

    if (debounceTimers.current[entry.id]) {
      clearTimeout(debounceTimers.current[entry.id]);
    }

    debounceTimers.current[entry.id] = setTimeout(async () => {
      try {
        const res = await ApiService.clientUpdateEntry(sessionToken, auditId, entry.id, val);

        // Requirement 9: Confirm successful database writes before displaying Saved
        setSaveStatusMap((prev) => ({ ...prev, [entry.id]: 'saved' }));

        // Requirement 10: If status was reset to Pending because an approved value changed, reflect immediately
        if (res.reviewStatus) {
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, reviewStatus: res.reviewStatus as any } : e))
          );
        }

        setTimeout(() => {
          setSaveStatusMap((prev) => ({ ...prev, [entry.id]: 'idle' }));
        }, 2500);
      } catch (err: any) {
        setSaveStatusMap((prev) => ({ ...prev, [entry.id]: 'error' }));
      }
    }, 600);
  };

  // Approval Submission
  const handleApprove = async (entry: AuditReviewEntry) => {
    if (!sessionToken || !auditId) return;
    try {
      const res = await ApiService.clientReviewEntry(sessionToken, auditId, entry.id, 'Approved');
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, reviewStatus: 'Approved', clientComment: undefined } : e
        )
      );
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  // Request Changes Submission (Requires Feedback Comment)
  const handleRequestChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !auditId || !activeCommentEntryId) return;

    if (!commentText.trim()) {
      setCommentError('A comment is required explaining what changes are needed.');
      return;
    }

    setIsSubmittingReview(true);
    setCommentError(null);
    try {
      await ApiService.clientReviewEntry(
        sessionToken,
        auditId,
        activeCommentEntryId,
        'Changes Requested',
        commentText.trim()
      );

      setEntries((prev) =>
        prev.map((e) =>
          e.id === activeCommentEntryId
            ? { ...e, reviewStatus: 'Changes Requested', clientComment: commentText.trim() }
            : e
        )
      );
      setActiveCommentEntryId(null);
      setCommentText('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to submit changes request.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Password Verification Gate
  if (!sessionToken || !auditInfo) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#031630] p-6 text-center text-white">
            <div className="w-12 h-12 rounded-xl bg-[#0561D5] mx-auto flex items-center justify-center text-xl font-black mb-3 ring-2 ring-white/10">
              M
            </div>
            <h2 className="text-base font-bold">MapRank GBP Client Review Gateway</h2>
            <p className="text-xs text-[#18C99A] font-semibold mt-0.5">
              Secure Listing Verification & Sign-Off
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={handleAuthSubmit} className="p-6 space-y-4 text-xs">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Share Link Token
              </label>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter 64-char crypto token or paste review link"
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Access Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter client password supplied by MapRank"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Verified on server with scrypt key derivation. Never exposed in frontend code.
              </p>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-slate-600 text-[11px] space-y-1">
              <span className="font-bold text-[#0561D5] block">Demo Access Hint:</span>
              <span>Sample Token: <code className="bg-white px-1 rounded">demo-client-token-apex-78704</code></span>
              <br />
              <span>Sample Password: <code className="bg-white px-1 rounded">client123</code></span>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 bg-[#0561D5] hover:bg-[#044db0] text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 text-xs"
            >
              {isAuthenticating ? 'Verifying Password...' : 'Unlock Client Review Portal'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onExitClientMode}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
              >
                ← Return to Agency Admin Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loaded Client Review Workspace
  const approvedCount = entries.filter((e) => e.reviewStatus === 'Approved').length;
  const changesCount = entries.filter((e) => e.reviewStatus === 'Changes Requested').length;
  const totalCount = entries.length;
  const progressPercent = Math.round((approvedCount / (totalCount || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 pb-12">
      {/* Top Client Navbar */}
      <header className="sticky top-0 z-30 bg-[#031630] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#0F294D] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0561D5] flex items-center justify-center font-black text-white text-sm">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{auditInfo.businessName}</h1>
            <p className="text-[11px] text-[#18C99A] font-semibold">MapRank GBP Client Review Session</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:block text-right">
            <span className="text-slate-400">Approval Progress:</span>{' '}
            <strong className="text-white">{approvedCount} of {totalCount}</strong>
          </div>

          <div className="w-24 bg-white/15 rounded-full h-2 hidden sm:block overflow-hidden">
            <div className="bg-[#18C99A] h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>

          <button
            onClick={() => {
              setSessionToken(null);
              setAuditInfo(null);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition"
          >
            Lock Session
          </button>

          <button
            onClick={onExitClientMode}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0561D5] hover:bg-[#044db0] text-white shadow-2xs transition"
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Main Review Workspace */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#031630]">
              Google Business Profile Sign-Off Checklist
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Please review each profile parameter below. Editable fields can be corrected directly (with automatic cloud saving). Click <strong>Approve</strong> to sign off or <strong>Request Changes</strong> to leave notes for our SEO team.
            </p>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className="text-xl font-black text-[#031630]">{progressPercent}%</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {approvedCount} Approved • {changesCount} Changes
            </span>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-4">
          {entries.map((entry) => {
            const saveStatus = saveStatusMap[entry.id] || 'idle';
            const isApproved = entry.reviewStatus === 'Approved';
            const isChanges = entry.reviewStatus === 'Changes Requested';

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                  isApproved
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : isChanges
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#031630]">{entry.fieldLabel}</span>
                    {entry.isMandatory && (
                      <span className="text-[9px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-200">
                        Mandatory
                      </span>
                    )}
                    {!entry.clientCanEdit && (
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                        Locked for editing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Autosave Status Indicators */}
                    {saveStatus === 'saving' && (
                      <span className="text-[11px] text-amber-600 font-bold animate-pulse flex items-center gap-1">
                        <Save className="w-3 h-3" /> Saving to database...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved to database
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                        <X className="w-3 h-3" /> Write failed
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isChanges
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {entry.reviewStatus}
                    </span>
                  </div>
                </div>

                {/* Entry Value Input / Display */}
                <div className="py-3 text-xs">
                  {entry.clientCanEdit ? (
                    typeof entry.fieldValue === 'string' || typeof entry.fieldValue === 'number' ? (
                      <input
                        type="text"
                        value={entry.fieldValue ?? ''}
                        onChange={(e) => handleFieldChange(entry, e.target.value)}
                        placeholder={`Enter ${entry.fieldLabel.toLowerCase()}...`}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:bg-white text-xs"
                      />
                    ) : (
                      <textarea
                        rows={3}
                        value={
                          typeof entry.fieldValue === 'object'
                            ? JSON.stringify(entry.fieldValue, null, 2)
                            : String(entry.fieldValue)
                        }
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleFieldChange(entry, parsed);
                          } catch {
                            handleFieldChange(entry, e.target.value);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:bg-white font-mono text-[11px]"
                      />
                    )
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium">
                      {typeof entry.fieldValue === 'object'
                        ? JSON.stringify(entry.fieldValue)
                        : String(entry.fieldValue || 'None')}
                    </div>
                  )}

                  {/* Feedback comment display if Changes Requested */}
                  {entry.clientComment && (
                    <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-700" />
                      <div>
                        <strong className="block text-[11px]">Requested Change Note:</strong>
                        <span>{entry.clientComment}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Actions */}
                {entry.clientCanApprove && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setActiveCommentEntryId(entry.id);
                        setCommentText(entry.clientComment || '');
                        setCommentError(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        isChanges
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => handleApprove(entry)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                        isApproved
                          ? 'bg-[#18C99A] text-white shadow-xs'
                          : 'bg-[#0561D5] hover:bg-[#044db0] text-white'
                      }`}
                    >
                      {isApproved ? '✓ Approved' : 'Approve Item'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Changes Requested Comment Modal (Requirement 8) */}
      {activeCommentEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-[#031630] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Request Changes on Item</h3>
                <p className="text-[11px] text-[#18C99A]">Feedback recorded in audit history</p>
              </div>
              <button
                onClick={() => setActiveCommentEntryId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestChangesSubmit} className="p-6 space-y-4">
              {commentError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
                  {commentError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Required Change Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Explain what needs adjustment (e.g. Please update our Friday closing time from 5 PM to 4 PM)..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCommentEntryId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
