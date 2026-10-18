import React, { useState } from 'react';
import { Search, Plus, FileCheck, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { GBPAuditData, AuditStatus } from '../../types';

interface AuditListViewProps {
  audits: GBPAuditData[];
  onOpenAudit: (id: string) => void;
  onNewAuditClick: () => void;
}

export const AuditListView: React.FC<AuditListViewProps> = ({
  audits,
  onOpenAudit,
  onNewAuditClick,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [search, setSearch] = useState('');

  const statusList: (AuditStatus | 'All')[] = ['All', 'Draft', 'In Progress', 'In Review', 'Completed', 'Action Required'];

  const filtered = audits.filter((a) => {
    const matchesStatus = selectedStatus === 'All' || a.status === selectedStatus;
    const matchesSearch =
      a.businessName.toLowerCase().includes(search.toLowerCase()) ||
      a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.businessInfo.primaryCategory.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusList.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedStatus === tab
                  ? 'bg-[#031630] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audits..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:outline-hidden"
            />
          </div>

          <button
            onClick={onNewAuditClick}
            className="whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Audit</span>
          </button>
        </div>
      </div>

      {/* Grid of Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((audit) => (
          <div
            key={audit.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-[#0561D5]/40 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    audit.status === 'Completed'
                      ? 'bg-[#18C99A]/15 text-[#0a7a5c]'
                      : audit.status === 'In Progress'
                      ? 'bg-blue-50 text-[#0561D5]'
                      : audit.status === 'Action Required'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {audit.status}
                </span>

                {audit.isTestRecord && (
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                    Sample Data
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-[#031630] mt-3 line-clamp-1">{audit.businessName}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Client: {audit.clientName}</p>

              <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Primary Category</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                    {audit.businessInfo.primaryCategory || 'Not declared'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Google Verification</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      audit.businessInfo.isVerified ? 'text-[#18C99A]' : 'text-slate-400'
                    }`}
                  >
                    {audit.businessInfo.isVerified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified ({audit.businessInfo.verificationMethod})</span>
                      </>
                    ) : (
                      'Unverified'
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-500 font-medium">Audit Optimization</span>
                  <span className="font-bold text-[#031630]">{audit.completionScore}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[#18C99A] transition-all duration-300"
                    style={{ width: `${audit.completionScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Updated {audit.updatedAt}</span>
              <button
                onClick={() => onOpenAudit(audit.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-white bg-[#0561D5] hover:bg-[#044db0] shadow-2xs transition"
              >
                <span>Work on Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
            No audits found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
};
