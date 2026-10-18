import { DbService, initDatabase } from './db.js';
import { SecurityTestResult } from '../src/types/index.js';

export async function runSecurityTestSuite(): Promise<SecurityTestResult[]> {
  initDatabase();
  const results: SecurityTestResult[] = [];

  // Helper to get or create test audits
  const clients = DbService.getClients(true);
  const clientA = clients[0] || DbService.createClient({
    companyName: 'Test Agency Client A',
    contactPerson: 'Alice',
    email: 'alice@test.example',
    phone: '555-001',
    isTestRecord: true,
  });

  const clientB = clients[1] || DbService.createClient({
    companyName: 'Test Agency Client B',
    contactPerson: 'Bob',
    email: 'bob@test.example',
    phone: '555-002',
    isTestRecord: true,
  });

  const auditAData = DbService.createAudit({
    clientId: clientA.id,
    businessName: 'Security Test Audit A',
    isTestRecord: true,
  });
  const auditA = auditAData?.audit;

  const auditBData = DbService.createAudit({
    clientId: clientB.id,
    businessName: 'Security Test Audit B',
    isTestRecord: true,
  });
  const auditB = auditBData?.audit;

  if (!auditA || !auditB) {
    throw new Error('Test audits could not be initialized');
  }

  const testPassword = 'CorrectPassword99!';

  // ── TEST 1: Wrong Password Rejection ─────────────────────────────────
  try {
    const link = DbService.createShareLink(auditA.id, testPassword, 24);
    try {
      DbService.authenticateClient(link.token, 'WrongPassword123');
      results.push({
        id: 'test-1-wrong-password',
        name: 'Wrong Password Protection',
        description: 'Server rejects incorrect access password with 401 Unauthorized',
        passed: false,
        expectedStatus: 401,
        actualStatus: 200,
        message: 'Security vulnerability: Invalid password was accepted!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is401 = err.status === 401;
      results.push({
        id: 'test-1-wrong-password',
        name: 'Wrong Password Protection',
        description: 'Server rejects incorrect access password with 401 Unauthorized',
        passed: is401,
        expectedStatus: 401,
        actualStatus: err.status || 500,
        message: is401 ? 'Pass: Server denied access with 401 on wrong password.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-1-wrong-password',
      name: 'Wrong Password Protection',
      description: 'Server rejects incorrect access password with 401 Unauthorized',
      passed: false,
      expectedStatus: 401,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 2: Expired Link Rejection ───────────────────────────────────
  try {
    const expiredLink = DbService.createShareLink(auditA.id, testPassword, -5); // 5 hours in past
    try {
      DbService.authenticateClient(expiredLink.token, testPassword);
      results.push({
        id: 'test-2-expired-link',
        name: 'Expired Link Invalidation',
        description: 'Server rejects expired share links with 403 Forbidden',
        passed: false,
        expectedStatus: 403,
        actualStatus: 200,
        message: 'Security vulnerability: Expired link allowed client authentication!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is403 = err.status === 403;
      results.push({
        id: 'test-2-expired-link',
        name: 'Expired Link Invalidation',
        description: 'Server rejects expired share links with 403 Forbidden',
        passed: is403,
        expectedStatus: 403,
        actualStatus: err.status || 500,
        message: is403 ? 'Pass: Server rejected expired share link with 403.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-2-expired-link',
      name: 'Expired Link Invalidation',
      description: 'Server rejects expired share links with 403 Forbidden',
      passed: false,
      expectedStatus: 403,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 3: Revoked Link Rejection ───────────────────────────────────
  try {
    const linkToRevoke = DbService.createShareLink(auditA.id, testPassword, 48);
    DbService.revokeShareLink(linkToRevoke.id);
    try {
      DbService.authenticateClient(linkToRevoke.token, testPassword);
      results.push({
        id: 'test-3-revoked-link',
        name: 'Manual Link Revocation',
        description: 'Server immediately denies access to revoked links with 403',
        passed: false,
        expectedStatus: 403,
        actualStatus: 200,
        message: 'Security vulnerability: Revoked link allowed client authentication!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is403 = err.status === 403;
      results.push({
        id: 'test-3-revoked-link',
        name: 'Manual Link Revocation',
        description: 'Server immediately denies access to revoked links with 403',
        passed: is403,
        expectedStatus: 403,
        actualStatus: err.status || 500,
        message: is403 ? 'Pass: Server blocked revoked share link with 403.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-3-revoked-link',
      name: 'Manual Link Revocation',
      description: 'Server immediately denies access to revoked links with 403',
      passed: false,
      expectedStatus: 403,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 4: Unauthorized Edit Rejection ──────────────────────────────
  try {
    const activeLink = DbService.createShareLink(auditA.id, testPassword, 24);
    const authSession = DbService.authenticateClient(activeLink.token, testPassword);
    const auditDetails = DbService.getAuditById(auditA.id);
    const entryToLock = auditDetails!.entries[0];

    // Explicitly lock editing for this entry on server
    DbService.adminUpdateEntryPermissions(auditA.id, entryToLock.id, { clientCanEdit: false });

    try {
      DbService.clientUpdateEntry(authSession.sessionToken, auditA.id, entryToLock.id, 'Hacked Value');
      results.push({
        id: 'test-4-unauthorized-edit',
        name: 'Unauthorized Edit Prevention',
        description: 'Server rejects edits to entries where client_can_edit is false',
        passed: false,
        expectedStatus: 403,
        actualStatus: 200,
        message: 'Security vulnerability: Client edited a locked field!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is403 = err.status === 403;
      results.push({
        id: 'test-4-unauthorized-edit',
        name: 'Unauthorized Edit Prevention',
        description: 'Server rejects edits to entries where client_can_edit is false',
        passed: is403,
        expectedStatus: 403,
        actualStatus: err.status || 500,
        message: is403 ? 'Pass: Server denied edit to locked entry with 403.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-4-unauthorized-edit',
      name: 'Unauthorized Edit Prevention',
      description: 'Server rejects edits to entries where client_can_edit is false',
      passed: false,
      expectedStatus: 403,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 5: Unauthorized Approval Rejection ──────────────────────────
  try {
    const activeLink = DbService.createShareLink(auditA.id, testPassword, 24);
    const authSession = DbService.authenticateClient(activeLink.token, testPassword);
    const auditDetails = DbService.getAuditById(auditA.id);
    const entryToLock = auditDetails!.entries[1];

    // Explicitly lock approval for this entry on server
    DbService.adminUpdateEntryPermissions(auditA.id, entryToLock.id, { clientCanApprove: false });

    try {
      DbService.clientReviewEntry(authSession.sessionToken, auditA.id, entryToLock.id, 'Approved');
      results.push({
        id: 'test-5-unauthorized-approval',
        name: 'Unauthorized Approval Prevention',
        description: 'Server rejects approvals when client_can_approve is false',
        passed: false,
        expectedStatus: 403,
        actualStatus: 200,
        message: 'Security vulnerability: Client approved a field without permission!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is403 = err.status === 403;
      results.push({
        id: 'test-5-unauthorized-approval',
        name: 'Unauthorized Approval Prevention',
        description: 'Server rejects approvals when client_can_approve is false',
        passed: is403,
        expectedStatus: 403,
        actualStatus: err.status || 500,
        message: is403 ? 'Pass: Server blocked unauthorized approval with 403.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-5-unauthorized-approval',
      name: 'Unauthorized Approval Prevention',
      description: 'Server rejects approvals when client_can_approve is false',
      passed: false,
      expectedStatus: 403,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 6: Cross-Audit Access Prevention ────────────────────────────
  try {
    const linkA = DbService.createShareLink(auditA.id, testPassword, 24);
    const sessionA = DbService.authenticateClient(linkA.token, testPassword);

    try {
      // Session A attempts to modify an entry belonging to Audit B!
      const auditBDetails = DbService.getAuditById(auditB.id);
      const entryB = auditBDetails!.entries[0];

      DbService.clientUpdateEntry(sessionA.sessionToken, auditB.id, entryB.id, 'Malicious Cross-Tenant Value');
      results.push({
        id: 'test-6-cross-audit-tampering',
        name: 'Cross-Audit Isolation',
        description: 'Server prevents a client session for Audit A from accessing or mutating Audit B',
        passed: false,
        expectedStatus: 403,
        actualStatus: 200,
        message: 'CRITICAL SECURITY BREACH: Cross-audit session leakage allowed!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is403 = err.status === 403;
      results.push({
        id: 'test-6-cross-audit-tampering',
        name: 'Cross-Audit Isolation',
        description: 'Server prevents a client session for Audit A from accessing or mutating Audit B',
        passed: is403,
        expectedStatus: 403,
        actualStatus: err.status || 500,
        message: is403 ? 'Pass: Cross-audit tampering intercepted and blocked with 403.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-6-cross-audit-tampering',
      name: 'Cross-Audit Isolation',
      description: 'Server prevents a client session for Audit A from accessing or mutating Audit B',
      passed: false,
      expectedStatus: 403,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 7: Mandatory Field Blanking Rejection ────────────────────────
  try {
    const linkA = DbService.createShareLink(auditA.id, testPassword, 24);
    const sessionA = DbService.authenticateClient(linkA.token, testPassword);
    const auditDetails = DbService.getAuditById(auditA.id);
    const mandatoryEntry = auditDetails!.entries.find((e) => e.isMandatory) || auditDetails!.entries[0];

    DbService.adminUpdateEntryPermissions(auditA.id, mandatoryEntry.id, { isMandatory: true, clientCanEdit: true });

    try {
      DbService.clientUpdateEntry(sessionA.sessionToken, auditA.id, mandatoryEntry.id, '');
      results.push({
        id: 'test-7-mandatory-blanking',
        name: 'Mandatory Field Enforcement',
        description: 'Server rejects clearing required/mandatory fields with 400 Bad Request',
        passed: false,
        expectedStatus: 400,
        actualStatus: 200,
        message: 'Failed: Server allowed emptying a mandatory field!',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const is400 = err.status === 400;
      results.push({
        id: 'test-7-mandatory-blanking',
        name: 'Mandatory Field Enforcement',
        description: 'Server rejects clearing required/mandatory fields with 400 Bad Request',
        passed: is400,
        expectedStatus: 400,
        actualStatus: err.status || 500,
        message: is400 ? 'Pass: Server rejected empty mandatory field with 400.' : `Fail: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    results.push({
      id: 'test-7-mandatory-blanking',
      name: 'Mandatory Field Enforcement',
      description: 'Server rejects clearing required/mandatory fields with 400 Bad Request',
      passed: false,
      expectedStatus: 400,
      actualStatus: 500,
      message: `Setup error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── TEST 8: Approved Status Auto-Reset On Edit ────────────────────────
  try {
    const linkA = DbService.createShareLink(auditA.id, testPassword, 24);
    const sessionA = DbService.authenticateClient(linkA.token, testPassword);
    const auditDetails = DbService.getAuditById(auditA.id);
    const targetEntry = auditDetails!.entries[2];

    // Ensure permissions
    DbService.adminUpdateEntryPermissions(auditA.id, targetEntry.id, { clientCanEdit: true, clientCanApprove: true });

    // Step 1: Approve the entry
    DbService.clientReviewEntry(sessionA.sessionToken, auditA.id, targetEntry.id, 'Approved');

    // Step 2: Edit the entry
    const res = DbService.clientUpdateEntry(sessionA.sessionToken, auditA.id, targetEntry.id, 'Updated Post Approval 123');

    // Step 3: Verify entry review_status is reset to Pending
    const updatedAudit = DbService.getAuditById(auditA.id);
    const freshEntry = updatedAudit!.entries.find((e) => e.id === targetEntry.id);
    const isReset = freshEntry?.reviewStatus === 'Pending';

    // Step 4: Verify history record
    const history = DbService.getAuditHistory(auditA.id);
    const resetLog = history.find((h) => h.actionType === 'VALUE_EDITED_APPROVAL_RESET' && h.entryId === targetEntry.id);

    const passed = isReset && Boolean(resetLog);
    results.push({
      id: 'test-8-approval-reset-on-edit',
      name: 'Approved Value Modification Auto-Reset',
      description: 'Editing an approved entry automatically resets status to Pending and records audit trail',
      passed,
      expectedStatus: 200,
      actualStatus: 200,
      message: passed
        ? 'Pass: Approved item successfully reset to Pending on edit and logged in audit history.'
        : `Fail: Status was "${freshEntry?.reviewStatus}", history log present: ${Boolean(resetLog)}`,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    results.push({
      id: 'test-8-approval-reset-on-edit',
      name: 'Approved Value Modification Auto-Reset',
      description: 'Editing an approved entry automatically resets status to Pending and records audit trail',
      passed: false,
      expectedStatus: 200,
      actualStatus: 500,
      message: `Execution error: ${e.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return results;
}
