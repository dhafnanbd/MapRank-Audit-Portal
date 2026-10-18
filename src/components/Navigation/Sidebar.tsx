import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  ExternalLink,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'clients' | 'audits' | 'templates' | 'reports' | 'security' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenClientPortalPreview: () => void;
  activeShareTokensCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  onOpenClientPortalPreview,
  activeShareTokensCount,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'audits', label: 'GBP Audits', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Layers className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Tests', icon: <ShieldCheck className="w-4 h-4" />, badge: '8/8 PASS' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#031630] text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#0F294D]">
        <div className="w-9 h-9 rounded-xl bg-[#0561D5] flex items-center justify-center font-extrabold text-base text-white shadow-sm ring-2 ring-white/10">
          M
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white leading-tight">MapRank</h1>
          <p className="text-[11px] text-[#18C99A] font-semibold tracking-wide">GBP Audit Portal</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Agency Command
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#0561D5] text-white shadow-sm shadow-[#0561D5]/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#18C99A]/20 text-[#18C99A] border border-[#18C99A]/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Client Review Portal Direct Preview Switcher */}
        <div className="pt-4 mt-4 border-t border-[#0F294D]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
            Client Review Mode
          </div>
          <button
            onClick={() => {
              onOpenClientPortalPreview();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-emerald-300 bg-[#18C99A]/10 hover:bg-[#18C99A]/15 border border-[#18C99A]/20 transition-all text-left"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-[#18C99A]" />
              <div>
                <div className="font-bold text-white">Client Portal View</div>
                <div className="text-[10px] text-emerald-300/80">Simulate client sign-off</div>
              </div>
            </div>
          </button>
        </div>
      </nav>

      {/* Agency Footer Card */}
      <div className="p-3.5 mx-3.5 mb-5 rounded-xl bg-[#07244C] border border-[#0F3668]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#18C99A] animate-pulse" />
            <span className="text-xs font-bold text-slate-200">MapRank SEO Service</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
            v2.0
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
          SQLite Persistent Engine • Server scrypt auth & strict RLS parity active
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 h-screen sticky top-0 flex-shrink-0 z-20">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-full h-full shadow-2xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
