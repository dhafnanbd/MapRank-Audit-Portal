import React, { useState } from 'react';
import { Search, UserPlus, FilePlus, Building2, Mail, Phone, Calendar } from 'lucide-react';
import { Client } from '../../types';

interface ClientListViewProps {
  clients: Client[];
  onSelectClientToAudit: (client: Client) => void;
  onOpenCreateClientModal: () => void;
}

export const ClientListView: React.FC<ClientListViewProps> = ({
  clients,
  onSelectClientToAudit,
  onOpenCreateClientModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, contact, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5] focus:outline-hidden"
          />
        </div>

        <button
          onClick={onOpenCreateClientModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8FAFC] text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Company Name</th>
                <th className="px-5 py-3 font-semibold">Primary Contact</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Audits</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#031630] flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0561D5]" />
                      <span>{client.companyName}</span>
                      {client.isTestRecord && (
                        <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Added {client.createdAt}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{client.contactPerson || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{client.email || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{client.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                      {client.activeAuditsCount} audit(s)
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onSelectClientToAudit(client)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#0561D5] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>Start Audit</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    No clients match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
