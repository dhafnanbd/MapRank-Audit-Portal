import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { DbService, initDatabase, verifyPassword } from './server/db.js';
import { runSecurityTestSuite } from './server/securityTests.js';

initDatabase();

const app = express();
app.use(express.json());

// In-memory admin tokens map for authenticated sessions
const activeAdminTokens = new Set<string>();

// Helper auth middleware for admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  next();
}

// ── ADMIN AUTH ────────────────────────────────────────────────────────
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Pre-configured admin check from DB or fallback
  if (email === 'admin@maprank.com' && password === 'admin123') {
    const token = `admin-token-${crypto.randomBytes(24).toString('hex')}`;
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      user: {
        id: 'admin-maprank-1',
        email: 'admin@maprank.com',
        name: 'MapRank Agency Lead',
        role: 'admin',
      },
    });
  }

  return res.status(401).json({ error: 'Invalid administrative credentials.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token && activeAdminTokens.has(token)) {
    return res.json({
      authenticated: true,
      user: {
        id: 'admin-maprank-1',
        email: 'admin@maprank.com',
        name: 'MapRank Agency Lead',
        role: 'admin',
      },
    });
  }
  return res.status(401).json({ authenticated: false });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token) activeAdminTokens.delete(token);
  return res.json({ success: true });
});

// ── CLIENTS ───────────────────────────────────────────────────────────
app.get('/api/clients', (req: Request, res: Response) => {
  const includeTest = req.query.includeTest !== 'false';
  const clients = DbService.getClients(includeTest);
  res.json(clients);
});

app.post('/api/clients', (req: Request, res: Response) => {
  try {
    const { companyName, contactPerson, email, phone, isTestRecord } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    const client = DbService.createClient({
      companyName,
      contactPerson: contactPerson || '',
      email: email || '',
      phone: phone || '',
      isTestRecord: Boolean(isTestRecord),
    });
    res.status(201).json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AUDITS ────────────────────────────────────────────────────────────
app.get('/api/audits', (req: Request, res: Response) => {
  const includeTest = req.query.includeTest !== 'false';
  const audits = DbService.getAudits(includeTest);
  res.json(audits);
});

app.get('/api/audits/:id', (req: Request, res: Response) => {
  const auditData = DbService.getAuditById(req.params.id);
  if (!auditData) {
    return res.status(404).json({ error: 'Audit not found' });
  }
  res.json(auditData);
});

app.post('/api/audits', (req: Request, res: Response) => {
  try {
    const { clientId, businessName, templateId, isTestRecord } = req.body;
    if (!clientId || !businessName) {
      return res.status(400).json({ error: 'Client ID and Business Name are required.' });
    }
    const auditData = DbService.createAudit({
      clientId,
      businessName,
      templateId,
      isTestRecord,
    });
    res.status(201).json(auditData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/audits/:id', (req: Request, res: Response) => {
  try {
    const updated = DbService.updateAudit(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audits/:id/history', (req: Request, res: Response) => {
  const history = DbService.getAuditHistory(req.params.id);
  res.json(history);
});

// ── TEMPLATES ─────────────────────────────────────────────────────────
app.get('/api/templates', (_req: Request, res: Response) => {
  const templates = DbService.getTemplates();
  res.json(templates);
});

// ── SHARE LINKS & REVIEW ACCESS ────────────────────────────────────────
app.post('/api/audits/:id/share-link', (req: Request, res: Response) => {
  try {
    const { password, expiresInHours } = req.body;
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }
    const hours = Number(expiresInHours) || 72;
    const link = DbService.createShareLink(req.params.id, password, hours);
    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/share-links/:id/revoke', (req: Request, res: Response) => {
  try {
    const result = DbService.revokeShareLink(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/audits/:auditId/entries/:entryId/permissions', (req: Request, res: Response) => {
  try {
    const result = DbService.adminUpdateEntryPermissions(
      req.params.auditId,
      req.params.entryId,
      req.body
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── CLIENT REVIEW WORKFLOW ENDPOINTS (Strict Server Validation) ───────

// 1. Client Authenticates using token + access password
app.post('/api/client/auth', (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Review token and password are required.' });
  }

  try {
    const session = DbService.authenticateClient(token, password);
    res.json(session);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Authentication failed.' });
  }
});

// 2. Client Loads Authorized Audit Data
app.get('/api/client/audit', (req: Request, res: Response) => {
  const sessionToken = (req.headers['x-session-token'] as string) || (req.query.sessionToken as string);
  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required.' });
  }

  try {
    const data = DbService.getClientAudit(sessionToken);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to load audit.' });
  }
});

// 3. Client Updates Entry (Autosave with confirmation & approval reset)
app.post('/api/client/entry/update', (req: Request, res: Response) => {
  const sessionToken = (req.headers['x-session-token'] as string) || req.body.sessionToken;
  const { auditId, entryId, newValue } = req.body;

  if (!sessionToken || !auditId || !entryId) {
    return res.status(400).json({ error: 'Missing sessionToken, auditId, or entryId.' });
  }

  try {
    const result = DbService.clientUpdateEntry(sessionToken, auditId, entryId, newValue);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Update failed.' });
  }
});

// 4. Client Reviews Entry (Approve / Request Changes)
app.post('/api/client/entry/review', (req: Request, res: Response) => {
  const sessionToken = (req.headers['x-session-token'] as string) || req.body.sessionToken;
  const { auditId, entryId, decision, comment } = req.body;

  if (!sessionToken || !auditId || !entryId || !decision) {
    return res.status(400).json({ error: 'Missing sessionToken, auditId, entryId, or decision.' });
  }

  try {
    const result = DbService.clientReviewEntry(sessionToken, auditId, entryId, decision, comment);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Review submission failed.' });
  }
});

// ── LIVE ACTIVITY & AUDIT LOG ─────────────────────────────────────────
app.get('/api/activity', (_req: Request, res: Response) => {
  const activity = DbService.getRecentActivity(20);
  res.json(activity);
});

// ── AUTOMATED SECURITY TEST SUITE ENDPOINT ────────────────────────────
app.get('/api/test/security-suite', async (_req: Request, res: Response) => {
  try {
    const testResults = await runSecurityTestSuite();
    const passedCount = testResults.filter((r) => r.passed).length;
    res.json({
      allPassed: passedCount === testResults.length,
      passedCount,
      totalCount: testResults.length,
      results: testResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── VITE DEV / PRODUCTION MIDDLEWARE ──────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MapRank GBP Audit Portal running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
