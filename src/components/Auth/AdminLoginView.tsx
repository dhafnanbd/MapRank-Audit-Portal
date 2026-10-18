import React, { useState } from 'react';
import { Lock, Mail, Shield, AlertCircle } from 'lucide-react';
import { ApiService } from '../../services/api';

interface AdminLoginViewProps {
  onLoginSuccess: (user: any) => void;
  onOpenClientMode: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onOpenClientMode,
}) => {
  const [email, setEmail] = useState('admin@maprank.com');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const data = await ApiService.adminLogin(email.trim(), password.trim());
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid administrative credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-[#031630] p-6 text-center text-white">
          <div className="w-12 h-12 rounded-xl bg-[#0561D5] mx-auto flex items-center justify-center text-xl font-black mb-3 ring-2 ring-white/10">
            M
          </div>
          <h1 className="text-base font-bold">MapRank GBP Audit Portal</h1>
          <p className="text-xs text-[#18C99A] font-semibold mt-0.5">Admin Security Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maprank.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Preset hint banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-[#0561D5] block">Default Admin Credentials:</span>
            <div className="text-slate-600 text-[11px] font-mono">
              admin@maprank.com / admin123
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-[#0561D5] hover:bg-[#044db0] text-white font-bold rounded-lg text-xs shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}
          </button>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onOpenClientMode}
              className="text-[#0561D5] hover:underline font-bold"
            >
              Client Review Portal →
            </button>
            <span className="text-[11px] text-slate-400">MapRank SEO Service</span>
          </div>
        </form>
      </div>
    </div>
  );
};
