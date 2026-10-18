import React, { useState } from 'react';
import { X, Lock, Key, Clock, ShieldCheck, Copy, Check, AlertCircle, Ban } from 'lucide-react';
import { AuditShareLink } from '../../types';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: string;
  businessName: string;
  existingLinks: AuditShareLink[];
  onCreateLink: (password: string, expiresInHours: number) => Promise<AuditShareLink>;
  onRevokeLink: (linkId: string) => Promise<void>;
  onPreviewClientView: (token: string) => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  auditId,
  businessName,
  existingLinks,
  onCreateLink,
  onRevokeLink,
  onPreviewClientView,
}) => {
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreateLink(password.trim(), expiresInHours);
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create share link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/?reviewToken=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-[#031630] text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Secure Client Review Share Link</h3>
            <p className="text-[11px] text-[#18C99A]">Cryptographic token + Server-verified password</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form to generate new link */}
          <form onSubmit={handleCreate} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-[#031630] uppercase tracking-wide">
              Generate New Review Link
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Access Password (Server-Verified) *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password for client (e.g. Apex2026!)"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Raw password is never stored or transmitted in plain text. It is scrypt-hashed on the server.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Expiration Window
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                  <option value={168}>7 Days</option>
                  <option value={720}>30 Days</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Share Link'}
                </button>
              </div>
            </div>
          </form>

          {/* Active / Existing Share Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#031630] uppercase tracking-wide">
              Active Share Links ({existingLinks.length})
            </h4>

            {existingLinks.map((link) => {
              const isExpired = new Date(link.expiresAt).getTime() < Date.now();
              const isCopied = copiedToken === link.token;

              return (
                <div
                  key={link.id}
                  className={`p-3.5 rounded-xl border transition ${
                    link.isRevoked
                      ? 'bg-slate-100 border-slate-300 opacity-60'
                      : isExpired
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          link.isRevoked
                            ? 'bg-slate-200 text-slate-700'
                            : isExpired
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {link.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active Link'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                        {link.token}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!link.isRevoked && !isExpired && (
                        <>
                          <button
                            onClick={() => copyLink(link.token)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0561D5] bg-blue-50 hover:bg-blue-100 rounded-md transition"
                            title="Copy review link to clipboard"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                          </button>

                          <button
                            onClick={() => {
                              onClose();
                              onPreviewClientView(link.token);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200"
                            title="Preview client review screen"
                          >
                            Preview
                          </button>

                          <button
                            onClick={() => onRevokeLink(link.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Revoke link immediately"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                    <span>Expires: {new Date(link.expiresAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}

            {existingLinks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No share links generated yet. Use the form above to invite the client for review.
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
