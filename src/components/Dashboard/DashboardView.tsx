import React from 'react';
import {
  Users,
  FileCheck,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Info,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Client, GBPAuditData } from '../../types';

interface ActivityItem {
  id: string;
  auditId: string;
  businessName: string;
  actor: string;
  actionType: string;
  fieldKey: string;
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
  createdAt: string;
}

interface DashboardViewProps {
  clients: Client[];
  audits: GBPAuditData[];
  activity: ActivityItem[];
  onOpenAudit: (auditId: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenSecurityTests: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  audits,
  activity,
  onOpenAudit,
  onNavigateTab,
  onOpenSecurityTests,
}) => {
  const inProgress = audits.filter((a) => a.status === 'In Progress' || a.status === 'Draft').length;
  const completed = audits.filter((a) => a.status === 'Completed').length;
  const avgScore = audits.length
    ? Math.round(audits.reduce((acc, curr) => acc + curr.completionScore, 0) / audits.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Demonstration Workspace Notice */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-[#0561D5] text-white rounded-lg flex-shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#031630]">
              Agency Workspace • Database Persistent Storage Active
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
              Records flagged with{' '}
              <span className="inline-block px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 font-bold rounded border border-amber-300">
                [Sample Data]
              </span>{' '}
              are preloaded demonstration records. Newly created clients and audits are written directly to your relational SQLite database and preserved across sessions.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSecurityTests}
          className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-xs font-bold text-[#0561D5] hover:bg-blue-100 rounded-lg border border-blue-300 shadow-xs transition"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Verify Security Barriers
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-[#0561D5]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <span className="p-2 rounded-lg bg-blue-50 text-[#0561D5]">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#031630]">{clients.length}</div>
            <button
              onClick={() => onNavigateTab('clients')}
              className="text-xs font-bold text-[#0561D5] hover:underline mt-1 inline-flex items-center gap-1"
            >
              Browse Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-[#0561D5]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Audits</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#031630]">{inProgress}</div>
            <span className="text-xs text-slate-500 font-medium">In-flight worksheets</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-[#0561D5]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-[#18C99A]">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#031630]">{completed}</div>
            <span className="text-xs text-slate-500 font-medium">Verified & ready to publish</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-[#0561D5]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Audit Health</span>
            <span className="p-2 rounded-lg bg-teal-50 text-[#18C99A]">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#031630]">{avgScore}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-[#18C99A] h-1.5 rounded-full transition-all" style={{ width: `${avgScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Audits & Live Client Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audits (2 columns on lg) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#031630]">Recent GBP Audits</h3>
                <p className="text-xs text-slate-500 mt-0.5">Quick access to in-flight optimization worksheets</p>
              </div>
              <button
                onClick={() => onNavigateTab('audits')}
                className="text-xs font-bold text-[#0561D5] hover:underline"
              >
                All Audits →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F8FAFC] text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Listing / Business</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Health</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.slice(0, 5).map((audit) => (
                    <tr key={audit.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#031630] line-clamp-1">{audit.businessName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500">{audit.businessInfo.primaryCategory || 'Uncategorized'}</span>
                          {audit.isTestRecord && (
                            <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                              Sample Data
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">{audit.clientName}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            audit.status === 'Completed'
                              ? 'bg-[#18C99A]/15 text-[#0a7a5c]'
                              : audit.status === 'In Progress'
                              ? 'bg-blue-50 text-[#0561D5]'
                              : audit.status === 'Action Required'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {audit.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-[#0561D5]" style={{ width: `${audit.completionScore}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{audit.completionScore}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onOpenAudit(audit.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-2xs transition"
                        >
                          Open Form
                        </button>
                      </td>
                    </tr>
                  ))}
                  {audits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No audits found. Click &quot;+ New Audit&quot; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Client Review Activity Feed (Requirement 12) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18C99A] animate-ping" />
              <h3 className="text-sm sm:text-base font-bold text-[#031630]">Client Activity Stream</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real-Time</span>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {activity.map((item) => {
              const isApproval = item.actionType === 'STATUS_APPROVED';
              const isChanges = item.actionType === 'CHANGES_REQUESTED';
              const isReset = item.actionType === 'VALUE_EDITED_APPROVAL_RESET';

              return (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isApproval ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#18C99A] flex-shrink-0" />
                      ) : isChanges ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      ) : isReset ? (
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-[#0561D5] flex-shrink-0" />
                      )}
                      <span className="font-bold text-[#031630] line-clamp-1">{item.actor}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 pl-5">
                    <span className="font-semibold text-slate-800">{item.businessName}</span> •{' '}
                    <span className="font-mono text-slate-500 text-[10px]">{item.fieldKey}</span>
                  </div>

                  {item.comment && (
                    <div className="mt-1 pl-5">
                      <p className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg italic">
                        &quot;{item.comment}&quot;
                      </p>
                    </div>
                  )}

                  {isReset && (
                    <div className="pl-5 text-[10px] font-semibold text-purple-700">
                      ⚡ Approved value was edited; review status auto-reset to Pending.
                    </div>
                  )}
                </div>
              );
            })}

            {activity.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent review activity. Actions from client share links will stream here live.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
