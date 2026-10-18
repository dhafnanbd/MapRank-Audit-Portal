import React, { useState } from 'react';
import { X, Layers, Building, AlertCircle } from 'lucide-react';
import { Client, AuditTemplate } from '../../types';

interface CreateAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  templates: AuditTemplate[];
  preselectedClientId?: string;
  onSave: (auditData: {
    clientId: string;
    businessName: string;
    templateId: string;
    isTestRecord: boolean;
  }) => Promise<void>;
}

export const CreateAuditModal: React.FC<CreateAuditModalProps> = ({
  isOpen,
  onClose,
  clients,
  templates,
  preselectedClientId,
  onSave,
}) => {
  const [clientId, setClientId] = useState(preselectedClientId || (clients[0]?.id || ''));
  const [businessName, setBusinessName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [isTestRecord, setIsTestRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === templateId) || templates[0];
  const selectedClient = clients.find((c) => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client account.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMsg('Business listing name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave({
        clientId,
        businessName: businessName.trim(),
        templateId,
        isTestRecord,
      });
      setBusinessName('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create audit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-[#031630] text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Start New GBP Audit Worksheet</h3>
            <p className="text-[11px] text-[#18C99A]">Freezes immutable template snapshot</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Client */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Client Account *
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                const cl = clients.find((c) => c.id === e.target.value);
                if (cl && !businessName) {
                  setBusinessName(`${cl.companyName} - Main Location`);
                }
              }}
              required
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.activeAuditsCount} existing audits) {c.isTestRecord ? '• [Sample]' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              One client can have multiple independent audits for different branches or quarters.
            </p>
          </div>

          {/* Business Listing Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Listing / Location Business Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Roofing Solutions - North Austin Branch"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
            />
          </div>

          {/* Select Master Template for Snapshot */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Audit Blueprint Template (Snapshot Frozen) *
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.industry}) • v{t.version}
                </option>
              ))}
            </select>

            {selectedTemplate && (
              <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs space-y-1">
                <div className="font-bold text-[#0561D5] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Snapshot Guarantee:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {selectedTemplate.description} Future changes to master templates will never alter this audit&apos;s benchmarks.
                </p>
              </div>
            )}
          </div>

          {/* Demo Flag */}
          <div className="pt-1">
            <label className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isTestRecord}
                onChange={(e) => setIsTestRecord(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="text-xs font-bold text-amber-900">
                Mark as Sample / Demo Audit (clearly tagged with [Sample Data])
              </span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Audit Snapshot...' : 'Create & Open Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
