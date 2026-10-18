import {
  Client,
  GBPAuditData,
  AuditTemplate,
  AuditReviewEntry,
  AuditShareLink,
  DetailedHistoryItem,
  SecurityTestResult,
} from '../types';

const API_BASE = '/api';

export const ApiService = {
  // Auth
  async adminLogin(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('maprank_admin_token', data.token);
    return data;
  },

  async checkAdminAuth() {
    const token = localStorage.getItem('maprank_admin_token');
    if (!token) return { authenticated: false };

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  async adminLogout() {
    const token = localStorage.getItem('maprank_admin_token');
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('maprank_admin_token');
  },

  // Clients
  async getClients(includeTest = true): Promise<Client[]> {
    const res = await fetch(`${API_BASE}/clients?includeTest=${includeTest}`);
    if (!res.ok) throw new Error('Failed to load clients');
    return res.json();
  },

  async createClient(data: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    isTestRecord: boolean;
  }): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create client');
    }
    return res.json();
  },

  // Audits
  async getAudits(includeTest = true): Promise<GBPAuditData[]> {
    const res = await fetch(`${API_BASE}/audits?includeTest=${includeTest}`);
    if (!res.ok) throw new Error('Failed to load audits');
    return res.json();
  },

  async getAuditById(id: string): Promise<{
    audit: GBPAuditData;
    entries: AuditReviewEntry[];
    shareLinks: AuditShareLink[];
  }> {
    const res = await fetch(`${API_BASE}/audits/${id}`);
    if (!res.ok) throw new Error('Failed to load audit');
    return res.json();
  },

  async createAudit(data: {
    clientId: string;
    businessName: string;
    templateId?: string;
    isTestRecord?: boolean;
  }): Promise<{
    audit: GBPAuditData;
    entries: AuditReviewEntry[];
    shareLinks: AuditShareLink[];
  }> {
    const res = await fetch(`${API_BASE}/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create audit');
    }
    return res.json();
  },

  async updateAudit(id: string, payload: Partial<GBPAuditData>): Promise<{
    audit: GBPAuditData;
    entries: AuditReviewEntry[];
    shareLinks: AuditShareLink[];
  }> {
    const res = await fetch(`${API_BASE}/audits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save audit');
    }
    return res.json();
  },

  async getAuditHistory(id: string): Promise<DetailedHistoryItem[]> {
    const res = await fetch(`${API_BASE}/audits/${id}/history`);
    if (!res.ok) throw new Error('Failed to load audit history');
    return res.json();
  },

  // Templates
  async getTemplates(): Promise<AuditTemplate[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Failed to load templates');
    return res.json();
  },

  // Share Links & Entry Permissions
  async createShareLink(auditId: string, password: string, expiresInHours = 72): Promise<AuditShareLink> {
    const res = await fetch(`${API_BASE}/audits/${auditId}/share-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, expiresInHours }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate review link');
    }
    return res.json();
  },

  async revokeShareLink(linkId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/share-links/${linkId}/revoke`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to revoke review link');
    }
    return res.json();
  },

  async updateEntryPermissions(
    auditId: string,
    entryId: string,
    permissions: { isMandatory?: boolean; clientCanEdit?: boolean; clientCanApprove?: boolean }
  ) {
    const res = await fetch(`${API_BASE}/audits/${auditId}/entries/${entryId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissions),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update entry permissions');
    }
    return res.json();
  },

  // Client Review Workflow (Direct Server Calls)
  async clientAuthenticate(token: string, password: string): Promise<{
    sessionToken: string;
    auditId: string;
    expiresAt: string;
  }> {
    const res = await fetch(`${API_BASE}/client/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Authentication denied');
    }
    return res.json();
  },

  async clientGetAudit(sessionToken: string): Promise<{
    audit: {
      id: string;
      businessName: string;
      status: string;
      completionScore: number;
      isTestRecord: boolean;
      updatedAt: string;
    };
    entries: AuditReviewEntry[];
  }> {
    const res = await fetch(`${API_BASE}/client/audit`, {
      headers: { 'x-session-token': sessionToken },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retrieve client audit');
    }
    return res.json();
  },

  async clientUpdateEntry(
    sessionToken: string,
    auditId: string,
    entryId: string,
    newValue: any
  ): Promise<{
    success: boolean;
    entryId: string;
    reviewStatus: string;
    savedAt: string;
  }> {
    const res = await fetch(`${API_BASE}/client/entry/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': sessionToken,
      },
      body: JSON.stringify({ auditId, entryId, newValue }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Server rejected entry update');
    }
    return res.json();
  },

  async clientReviewEntry(
    sessionToken: string,
    auditId: string,
    entryId: string,
    decision: 'Approved' | 'Changes Requested',
    comment?: string
  ): Promise<{
    success: boolean;
    entryId: string;
    reviewStatus: string;
    comment: string | null;
    savedAt: string;
  }> {
    const res = await fetch(`${API_BASE}/client/entry/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': sessionToken,
      },
      body: JSON.stringify({ auditId, entryId, decision, comment }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Server rejected review decision');
    }
    return res.json();
  },

  // Live Activity Feed
  async getRecentActivity(): Promise<Array<{
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
  }>> {
    const res = await fetch(`${API_BASE}/activity`);
    if (!res.ok) throw new Error('Failed to load activity');
    return res.json();
  },

  // Security Test Suite
  async runSecuritySuite(): Promise<{
    allPassed: boolean;
    passedCount: number;
    totalCount: number;
    results: SecurityTestResult[];
  }> {
    const res = await fetch(`${API_BASE}/test/security-suite`);
    if (!res.ok) throw new Error('Failed to execute security tests');
    return res.json();
  },
};
