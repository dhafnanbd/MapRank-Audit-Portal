import React from 'react';
import { Menu, Plus, UserPlus, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  onNewAuditClick: () => void;
  onNewClientClick: () => void;
  onOpenSecurityTests: () => void;
  includeTestRecords: boolean;
  onToggleIncludeTestRecords: (val: boolean) => void;
  adminEmail: string;
  onLogout: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onNewAuditClick,
  onNewClientClick,
  onOpenSecurityTests,
  includeTestRecords,
  onToggleIncludeTestRecords,
  adminEmail,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#031630] leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Test Records Toggle */}
        <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition select-none">
          <input
            type="checkbox"
            checked={includeTestRecords}
            onChange={(e) => onToggleIncludeTestRecords(e.target.checked)}
            className="w-3.5 h-3.5 text-[#0561D5] rounded border-slate-300 focus:ring-0"
          />
          <span className="hidden sm:inline">Show Sample Data</span>
          <span className="sm:hidden">Sample Data</span>
        </label>

        {/* Security Tests Quick Button */}
        <button
          onClick={onOpenSecurityTests}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
          title="Inspect server security barrier tests"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Security Tests</span>
        </button>

        {/* Add Client Button */}
        <button
          onClick={onNewClientClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0561D5] bg-[#0561D5]/10 hover:bg-[#0561D5]/15 rounded-lg border border-[#0561D5]/30 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Client</span>
        </button>

        {/* Start New Audit */}
        <button
          onClick={onNewAuditClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Audit</span>
        </button>

        {/* Admin Avatar & Sign out */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right">
            <div className="text-xs font-bold text-[#031630] leading-none">MapRank Admin</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{adminEmail}</div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Sign out of portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
