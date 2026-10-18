import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'maprank_portal.db');
const db = new DatabaseSync(DB_PATH);

// Helper for crypto hashing
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password.trim(), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const testHash = crypto.scryptSync(password.trim(), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
}

export function generateCryptoToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Initialize tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      token TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_test_record INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      industry TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      description TEXT NOT NULL,
      default_sections TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      template_id TEXT,
      template_snapshot TEXT NOT NULL,
      business_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      completion_score INTEGER NOT NULL DEFAULT 0,
      is_test_record INTEGER NOT NULL DEFAULT 0,
      business_info TEXT NOT NULL,
      social_profiles TEXT NOT NULL,
      regular_hours TEXT NOT NULL,
      special_hours TEXT NOT NULL,
      categories TEXT NOT NULL,
      services TEXT NOT NULL,
      service_areas TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_entries (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      section_key TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_value TEXT NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      client_can_edit INTEGER NOT NULL DEFAULT 1,
      client_can_approve INTEGER NOT NULL DEFAULT 1,
      review_status TEXT NOT NULL DEFAULT 'Pending',
      client_comment TEXT,
      updated_by_actor TEXT NOT NULL DEFAULT 'Admin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(audit_id, field_key),
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_share_links (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS client_sessions (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      share_link_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
      FOREIGN KEY (share_link_id) REFERENCES audit_share_links(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_history (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      entry_id TEXT,
      actor TEXT NOT NULL,
      action_type TEXT NOT NULL,
      field_key TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      previous_status TEXT,
      new_status TEXT,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // 1. Admin User
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get('admin@maprank.com');
  if (!existingAdmin) {
    const { salt, hash } = hashPassword('admin123');
    const adminId = 'admin-maprank-1';
    db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, password_salt, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin@maprank.com',
      hash,
      salt,
      'MapRank Agency Lead',
      'admin',
      new Date().toISOString()
    );
  }

  // 2. Templates
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM audit_templates').get() as { count: number };
  if (templateCount.count === 0) {
    const templates = [
      {
        id: 'tmpl-local-service',
        title: 'Standard Local Service Business Template',
        industry: 'Home & Professional Services',
        version: '1.0',
        description: '7-pillar GBP benchmark covering NAP consistency, service radius, and customer-facing hours.',
        defaultSections: {
          requiredSections: ['businessInfo', 'socialProfiles', 'regularHours', 'specialHours', 'categories', 'services', 'serviceAreas'],
          benchmarks: {
            minAdditionalCategories: 3,
            minServices: 5,
            requireVerifiedStatus: true,
          },
        },
      },
      {
        id: 'tmpl-medical-dental',
        title: 'Healthcare & Dental Practice GBP Template',
        industry: 'Medical & Dental',
        version: '1.2',
        description: 'Specialized healthcare taxonomy, practitioner credentials, emergency hours, and appointment links.',
        defaultSections: {
          requiredSections: ['businessInfo', 'socialProfiles', 'regularHours', 'categories', 'services'],
          benchmarks: {
            minAdditionalCategories: 4,
            minServices: 8,
            requireVerifiedStatus: true,
          },
        },
      },
      {
        id: 'tmpl-multi-location',
        title: 'Multi-Location Retail / Franchise Template',
        industry: 'Retail & Franchises',
        version: '2.0',
        description: 'Optimized for storefront listings with store codes, department hours, and regional brand signals.',
        defaultSections: {
          requiredSections: ['businessInfo', 'regularHours', 'specialHours', 'categories', 'serviceAreas'],
          benchmarks: {
            minAdditionalCategories: 2,
            minServices: 4,
            requireVerifiedStatus: true,
          },
        },
      },
    ];

    for (const t of templates) {
      db.prepare(`
        INSERT INTO audit_templates (id, title, industry, version, description, default_sections)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(t.id, t.title, t.industry, t.version, t.description, JSON.stringify(t.defaultSections));
    }
  }

  // 3. Seed Clients (Sample and Real records)
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
  if (clientCount.count === 0) {
    const clients = [
      {
        id: 'c-demo-1',
        company_name: 'Apex Roofing & Waterproofing',
        contact_person: 'Marcus Vance',
        email: 'marcus@apexroofing.example',
        phone: '+1 (555) 234-8901',
        is_test_record: 1, // Explicitly labeled as test/demo sample
        created_at: '2026-09-12',
        updated_at: '2026-10-10',
      },
      {
        id: 'c-demo-2',
        company_name: 'Lakeside Family Dental',
        contact_person: 'Dr. Sarah Lin',
        email: 'dr.lin@lakesidedental.example',
        phone: '+1 (555) 890-1234',
        is_test_record: 1, // Explicitly labeled as test/demo sample
        created_at: '2026-09-28',
        updated_at: '2026-10-05',
      },
      {
        id: 'c-demo-3',
        company_name: 'Austin Metro Plumbing & Gas',
        contact_person: 'Carlos Mendez',
        email: 'carlos@austinmetroplumb.example',
        phone: '+1 (555) 345-6789',
        is_test_record: 0, // Real agency client record
        created_at: '2026-10-02',
        updated_at: '2026-10-14',
      },
    ];

    for (const c of clients) {
      db.prepare(`
        INSERT INTO clients (id, company_name, contact_person, email, phone, is_test_record, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(c.id, c.company_name, c.contact_person, c.email, c.phone, c.is_test_record, c.created_at, c.updated_at);
    }

    // 4. Seed Audits
    const sampleAudits = [
      {
        id: 'audit-demo-1',
        client_id: 'c-demo-1',
        template_id: 'tmpl-local-service',
        template_snapshot: JSON.stringify({
          templateId: 'tmpl-local-service',
          title: 'Standard Local Service Business Template',
          snapshotDate: '2026-09-15',
          benchmarks: { minServices: 5, requireVerifiedStatus: true },
        }),
        business_name: 'Apex Roofing Solutions - Austin HQ',
        status: 'In Progress',
        completion_score: 72,
        is_test_record: 1,
        business_info: JSON.stringify({
          registeredName: 'Apex Roofing Solutions LLC',
          primaryCategory: 'Roofing contractor',
          streetAddress: '1042 West Industrial Blvd',
          city: 'Austin',
          stateProvince: 'TX',
          postalCode: '78704',
          country: 'United States',
          primaryPhone: '+1 (555) 234-8901',
          websiteUrl: 'https://apexroofing.example',
          latitude: '30.2458',
          longitude: '-97.7654',
          isVerified: true,
          verificationMethod: 'Video',
        }),
        social_profiles: JSON.stringify({
          facebookUrl: 'https://facebook.com/apexroofingexample',
          instagramUrl: 'https://instagram.com/apexroofingexample',
          linkedinUrl: 'https://linkedin.com/company/apex-roofing-example',
          youtubeUrl: 'https://youtube.com/@apexroofingexample',
          xTwitterUrl: 'https://x.com/apexroofing',
          yelpUrl: 'https://yelp.com/biz/apex-roofing-austin',
        }),
        regular_hours: JSON.stringify([
          { day: 'Monday', isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
          { day: 'Tuesday', isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
          { day: 'Wednesday', isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
          { day: 'Thursday', isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
          { day: 'Friday', isOpen: true, openTime: '08:00', closeTime: '17:00', is24Hours: false },
          { day: 'Saturday', isOpen: false, openTime: '09:00', closeTime: '13:00', is24Hours: false },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00', is24Hours: false },
        ]),
        special_hours: JSON.stringify([
          { id: 'sh-1', date: '2026-11-26', isOpen: false, note: 'Thanksgiving Holiday Closure' },
          { id: 'sh-2', date: '2026-12-25', isOpen: false, note: 'Christmas Day' },
        ]),
        categories: JSON.stringify({
          primary: 'Roofing contractor',
          additional: ['Gutter cleaning service', 'Waterproofing company', 'Siding contractor', 'General contractor'],
        }),
        services: JSON.stringify([
          { id: 's-1', name: 'Residential Roof Inspection', category: 'Roofing', price: 'Free', description: 'Complete 25-point visual and drone attic/roof condition inspection.' },
          { id: 's-2', name: 'Emergency Storm Tarping', category: 'Emergency Repairs', price: '$250', description: 'Same-day water intrusion mitigation and temporary tarping.' },
          { id: 's-3', name: 'Seamless Gutter Installation', category: 'Gutters', price: '$850+', description: 'Custom-fit extruded aluminum gutter systems with leaf protection.' },
        ]),
        service_areas: JSON.stringify({
          hasPhysicalStorefront: true,
          servesCustomersAtLocation: true,
          areaType: 'Cities',
          designatedAreas: ['Austin, TX', 'Round Rock, TX', 'Buda, TX', 'Cedar Park, TX', 'Lakeway, TX'],
        }),
        created_at: '2026-09-15',
        updated_at: '2026-10-16',
      },
      {
        id: 'audit-demo-2',
        client_id: 'c-demo-2',
        template_id: 'tmpl-medical-dental',
        template_snapshot: JSON.stringify({
          templateId: 'tmpl-medical-dental',
          title: 'Healthcare & Dental Practice GBP Template',
          snapshotDate: '2026-09-28',
          benchmarks: { minServices: 8, requireVerifiedStatus: true },
        }),
        business_name: 'Lakeside Family Dental - Downtown Clinic',
        status: 'Completed',
        completion_score: 100,
        is_test_record: 1,
        business_info: JSON.stringify({
          registeredName: 'Lakeside Dental Care PLLC',
          primaryCategory: 'Dentist',
          streetAddress: '782 Lakeview Pkwy Suite 200',
          city: 'Minneapolis',
          stateProvince: 'MN',
          postalCode: '55401',
          country: 'United States',
          primaryPhone: '+1 (555) 890-1234',
          websiteUrl: 'https://lakesidedental.example',
          latitude: '44.9778',
          longitude: '-93.2650',
          isVerified: true,
          verificationMethod: 'Postcard',
        }),
        social_profiles: JSON.stringify({
          facebookUrl: 'https://facebook.com/lakesidedentalexample',
          instagramUrl: 'https://instagram.com/lakesidedentalexample',
          linkedinUrl: 'https://linkedin.com/company/lakeside-dental',
          youtubeUrl: '',
          xTwitterUrl: '',
          yelpUrl: 'https://yelp.com/biz/lakeside-family-dental-minneapolis',
        }),
        regular_hours: JSON.stringify([
          { day: 'Monday', isOpen: true, openTime: '08:30', closeTime: '16:30', is24Hours: false },
          { day: 'Tuesday', isOpen: true, openTime: '08:30', closeTime: '16:30', is24Hours: false },
          { day: 'Wednesday', isOpen: true, openTime: '08:30', closeTime: '16:30', is24Hours: false },
          { day: 'Thursday', isOpen: true, openTime: '08:30', closeTime: '16:30', is24Hours: false },
          { day: 'Friday', isOpen: true, openTime: '08:00', closeTime: '13:00', is24Hours: false },
          { day: 'Saturday', isOpen: false, openTime: '00:00', closeTime: '00:00', is24Hours: false },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00', is24Hours: false },
        ]),
        special_hours: JSON.stringify([]),
        categories: JSON.stringify({
          primary: 'Dentist',
          additional: ['Cosmetic dentist', 'Teeth whitening service', 'Pediatric dentist', 'Dental clinic'],
        }),
        services: JSON.stringify([
          { id: 's-4', name: 'Comprehensive Oral Exam', category: 'General', price: '$120', description: 'Full digital x-rays, periodontal evaluation, and oral cancer screening.' },
          { id: 's-5', name: 'In-Office Laser Teeth Whitening', category: 'Cosmetic', price: '$350', description: 'Single-session 60-minute shade lift treatment.' },
        ]),
        service_areas: JSON.stringify({
          hasPhysicalStorefront: true,
          servesCustomersAtLocation: false,
          areaType: 'Cities',
          designatedAreas: ['Minneapolis, MN', 'Saint Paul, MN', 'Edina, MN'],
        }),
        created_at: '2026-09-28',
        updated_at: '2026-10-18',
      },
    ];

    for (const a of sampleAudits) {
      db.prepare(`
        INSERT INTO audits (
          id, client_id, template_id, template_snapshot, business_name, status,
          completion_score, is_test_record, business_info, social_profiles,
          regular_hours, special_hours, categories, services, service_areas,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        a.id, a.client_id, a.template_id, a.template_snapshot, a.business_name, a.status,
        a.completion_score, a.is_test_record, a.business_info, a.social_profiles,
        a.regular_hours, a.special_hours, a.categories, a.services, a.service_areas,
        a.created_at, a.updated_at
      );

      // Populate review entries for each audit
      syncAuditReviewEntries(a.id);
    }

    // 5. Create a pre-configured share link for audit-demo-1 with password 'client123'
    const { salt: linkSalt, hash: linkHash } = hashPassword('client123');
    const demoToken = 'demo-client-token-apex-78704';
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO audit_share_links (id, audit_id, token, password_hash, password_salt, expires_at, is_revoked, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('link-demo-apex', 'audit-demo-1', demoToken, linkHash, linkSalt, expires, 0, new Date().toISOString());

    // 6. Seed initial audit history
    db.prepare(`
      INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'hist-1',
      'audit-demo-1',
      null,
      'Admin (admin@maprank.com)',
      'AUDIT_CREATED',
      'audit',
      null,
      null,
      null,
      'Draft',
      'Audit initialized from Standard Local Service Business Template snapshot',
      '2026-09-15 10:00:00'
    );

    db.prepare(`
      INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'hist-2',
      'audit-demo-1',
      null,
      'Client (Marcus Vance)',
      'STATUS_APPROVED',
      'businessInfo.registeredName',
      JSON.stringify('Apex Roofing'),
      JSON.stringify('Apex Roofing Solutions LLC'),
      'Pending',
      'Approved',
      'Confirmed full legal registered LLC name for Google verification compliance',
      '2026-10-10 14:22:00'
    );
  }
}

// Synchronize Audit JSON into granular audit_entries
export function syncAuditReviewEntries(auditId: string) {
  const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(auditId) as any;
  if (!audit) return;

  const biz = JSON.parse(audit.business_info || '{}');
  const socials = JSON.parse(audit.social_profiles || '{}');
  const hours = JSON.parse(audit.regular_hours || '[]');
  const specials = JSON.parse(audit.special_hours || '[]');
  const cats = JSON.parse(audit.categories || '{"primary":"", "additional":[]}');
  const svcs = JSON.parse(audit.services || '[]');
  const areas = JSON.parse(audit.service_areas || '{"designatedAreas":[]}');

  const defaultEntries = [
    { section: 'businessInfo', key: 'businessInfo.registeredName', label: 'Official Business Name', val: biz.registeredName || audit.business_name, mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'businessInfo', key: 'businessInfo.primaryCategory', label: 'Primary GBP Category', val: biz.primaryCategory || '', mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'businessInfo', key: 'businessInfo.streetAddress', label: 'Street Address', val: biz.streetAddress || '', mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'businessInfo', key: 'businessInfo.city', label: 'City', val: biz.city || '', mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'businessInfo', key: 'businessInfo.primaryPhone', label: 'Contact Phone', val: biz.primaryPhone || '', mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'businessInfo', key: 'businessInfo.websiteUrl', label: 'Website Link', val: biz.websiteUrl || '', mandatory: 0, canEdit: 1, canApprove: 1 },
    { section: 'hours', key: 'regularHours', label: 'Weekly Hours Schedule', val: hours, mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'specialHours', key: 'specialHours', label: 'Special / Holiday Hours', val: specials, mandatory: 0, canEdit: 1, canApprove: 1 },
    { section: 'categories', key: 'categories.additional', label: 'Additional Secondary Categories', val: cats.additional || [], mandatory: 0, canEdit: 1, canApprove: 1 },
    { section: 'services', key: 'services', label: 'Services & Pricing Catalog', val: svcs, mandatory: 0, canEdit: 1, canApprove: 1 },
    { section: 'serviceAreas', key: 'serviceAreas.designatedAreas', label: 'Designated Service Areas', val: areas.designatedAreas || [], mandatory: 1, canEdit: 1, canApprove: 1 },
    { section: 'socialProfiles', key: 'socialProfiles', label: 'Connected Social Profiles', val: socials, mandatory: 0, canEdit: 1, canApprove: 1 },
  ];

  const now = new Date().toISOString();
  for (const item of defaultEntries) {
    const existing = db.prepare('SELECT id FROM audit_entries WHERE audit_id = ? AND field_key = ?').get(auditId, item.key);
    if (!existing) {
      const entryId = `entry-${crypto.randomBytes(8).toString('hex')}`;
      db.prepare(`
        INSERT INTO audit_entries (
          id, audit_id, section_key, field_key, field_label, field_value,
          is_mandatory, client_can_edit, client_can_approve, review_status,
          updated_by_actor, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entryId,
        auditId,
        item.section,
        item.key,
        item.label,
        JSON.stringify(item.val),
        item.mandatory,
        item.canEdit,
        item.canApprove,
        'Pending',
        'System',
        now,
        now
      );
    }
  }
}

// Database Service operations
export const DbService = {
  // Clients
  getClients(includeTestRecords = true) {
    let sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM audits a WHERE a.client_id = c.id) as active_audits_count
      FROM clients c
    `;
    if (!includeTestRecords) {
      sql += ' WHERE c.is_test_record = 0';
    }
    sql += ' ORDER BY c.created_at DESC';
    const rows = db.prepare(sql).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      companyName: r.company_name,
      contactPerson: r.contact_person,
      email: r.email,
      phone: r.phone,
      isTestRecord: Boolean(r.is_test_record),
      activeAuditsCount: r.active_audits_count || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  createClient(data: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    isTestRecord: boolean;
  }) {
    const id = `client-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO clients (id, company_name, contact_person, email, phone, is_test_record, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyName.trim(),
      data.contactPerson.trim(),
      data.email.trim(),
      data.phone.trim(),
      data.isTestRecord ? 1 : 0,
      now,
      now
    );

    return {
      id,
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      isTestRecord: data.isTestRecord,
      activeAuditsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  // Audits
  getAudits(includeTestRecords = true) {
    let sql = `
      SELECT a.*, c.company_name as client_name
      FROM audits a
      JOIN clients c ON a.client_id = c.id
    `;
    if (!includeTestRecords) {
      sql += ' WHERE a.is_test_record = 0';
    }
    sql += ' ORDER BY a.updated_at DESC';
    const rows = db.prepare(sql).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      clientId: r.client_id,
      clientName: r.client_name,
      templateId: r.template_id,
      templateSnapshot: JSON.parse(r.template_snapshot || '{}'),
      businessName: r.business_name,
      status: r.status,
      completionScore: r.completion_score,
      isTestRecord: Boolean(r.is_test_record),
      businessInfo: JSON.parse(r.business_info || '{}'),
      socialProfiles: JSON.parse(r.social_profiles || '{}'),
      regularHours: JSON.parse(r.regular_hours || '[]'),
      specialHours: JSON.parse(r.special_hours || '[]'),
      categories: JSON.parse(r.categories || '{"primary":"", "additional":[]}'),
      services: JSON.parse(r.services || '[]'),
      serviceAreas: JSON.parse(r.service_areas || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  getAuditById(id: string) {
    const row = db.prepare(`
      SELECT a.*, c.company_name as client_name
      FROM audits a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!row) return null;

    // Load review entries
    const entries = db.prepare(`
      SELECT * FROM audit_entries WHERE audit_id = ? ORDER BY section_key, field_key
    `).all(id) as any[];

    // Load active share links (excluding sensitive password hash/salt!)
    const links = db.prepare(`
      SELECT id, audit_id, token, expires_at, is_revoked, created_at
      FROM audit_share_links
      WHERE audit_id = ?
      ORDER BY created_at DESC
    `).all(id) as any[];

    return {
      audit: {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        templateId: row.template_id,
        templateSnapshot: JSON.parse(row.template_snapshot || '{}'),
        businessName: row.business_name,
        status: row.status,
        completionScore: row.completion_score,
        isTestRecord: Boolean(row.is_test_record),
        businessInfo: JSON.parse(row.business_info || '{}'),
        socialProfiles: JSON.parse(row.social_profiles || '{}'),
        regularHours: JSON.parse(row.regular_hours || '[]'),
        specialHours: JSON.parse(row.special_hours || '[]'),
        categories: JSON.parse(row.categories || '{"primary":"", "additional":[]}'),
        services: JSON.parse(row.services || '[]'),
        serviceAreas: JSON.parse(row.service_areas || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      entries: entries.map((e) => ({
        id: e.id,
        auditId: e.audit_id,
        sectionKey: e.section_key,
        fieldKey: e.field_key,
        fieldLabel: e.field_label,
        fieldValue: JSON.parse(e.field_value || 'null'),
        isMandatory: Boolean(e.is_mandatory),
        clientCanEdit: Boolean(e.client_can_edit),
        clientCanApprove: Boolean(e.client_can_approve),
        reviewStatus: e.review_status,
        clientComment: e.client_comment,
        updatedByActor: e.updated_by_actor,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
      shareLinks: links.map((l) => ({
        id: l.id,
        auditId: l.audit_id,
        token: l.token,
        expiresAt: l.expires_at,
        isRevoked: Boolean(l.is_revoked),
        createdAt: l.created_at,
      })),
    };
  },

  createAudit(data: {
    clientId: string;
    businessName: string;
    templateId?: string;
    isTestRecord?: boolean;
  }) {
    const client = db.prepare('SELECT id, company_name, is_test_record FROM clients WHERE id = ?').get(data.clientId) as any;
    if (!client) throw new Error('Client not found');

    const auditId = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString().split('T')[0];

    // Snapshot selected template or default
    let template = data.templateId
      ? (db.prepare('SELECT * FROM audit_templates WHERE id = ?').get(data.templateId) as any)
      : (db.prepare('SELECT * FROM audit_templates LIMIT 1').get() as any);

    const templateSnapshot = template
      ? {
          templateId: template.id,
          title: template.title,
          industry: template.industry,
          version: template.version,
          snapshotCreatedAt: new Date().toISOString(),
          defaultSections: JSON.parse(template.default_sections || '{}'),
        }
      : {
          templateId: 'custom-default',
          title: 'Default GBP Audit Snapshot',
          snapshotCreatedAt: new Date().toISOString(),
        };

    const initialHours = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ].map((day, idx) => ({
      day,
      isOpen: idx < 5,
      openTime: '09:00',
      closeTime: '17:00',
      is24Hours: false,
    }));

    const isTest = data.isTestRecord !== undefined ? (data.isTestRecord ? 1 : 0) : client.is_test_record;

    db.prepare(`
      INSERT INTO audits (
        id, client_id, template_id, template_snapshot, business_name, status,
        completion_score, is_test_record, business_info, social_profiles,
        regular_hours, special_hours, categories, services, service_areas,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditId,
      data.clientId,
      template?.id || null,
      JSON.stringify(templateSnapshot),
      data.businessName.trim(),
      'Draft',
      15,
      isTest,
      JSON.stringify({
        registeredName: data.businessName.trim(),
        primaryCategory: '',
        streetAddress: '',
        city: '',
        stateProvince: '',
        postalCode: '',
        country: 'United States',
        primaryPhone: '',
        websiteUrl: '',
        latitude: '',
        longitude: '',
        isVerified: false,
        verificationMethod: 'Unverified',
      }),
      JSON.stringify({
        facebookUrl: '',
        instagramUrl: '',
        linkedinUrl: '',
        youtubeUrl: '',
        xTwitterUrl: '',
        yelpUrl: '',
      }),
      JSON.stringify(initialHours),
      JSON.stringify([]),
      JSON.stringify({ primary: '', additional: [] }),
      JSON.stringify([]),
      JSON.stringify({
        hasPhysicalStorefront: true,
        servesCustomersAtLocation: false,
        areaType: 'Cities',
        designatedAreas: [],
      }),
      now,
      now
    );

    // Synchronize review entries
    syncAuditReviewEntries(auditId);

    // Record creation history
    db.prepare(`
      INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      auditId,
      null,
      'Admin',
      'AUDIT_CREATED',
      'audit',
      null,
      null,
      null,
      'Draft',
      `Audit created with frozen template snapshot: "${templateSnapshot.title}"`,
      new Date().toISOString()
    );

    return DbService.getAuditById(auditId);
  },

  updateAudit(id: string, payload: any) {
    const existing = db.prepare('SELECT * FROM audits WHERE id = ?').get(id) as any;
    if (!existing) throw new Error('Audit not found');

    const now = new Date().toISOString().split('T')[0];

    // Calculate score
    let score = 20;
    if (payload.businessInfo?.primaryCategory) score += 15;
    if (payload.businessInfo?.streetAddress) score += 10;
    if (payload.businessInfo?.primaryPhone) score += 10;
    if (payload.businessInfo?.websiteUrl) score += 10;
    if (payload.services?.length > 0) score += 15;
    if (payload.serviceAreas?.designatedAreas?.length > 0) score += 10;
    if (payload.businessInfo?.isVerified) score += 10;
    score = Math.min(100, score);

    db.prepare(`
      UPDATE audits SET
        business_name = ?,
        status = ?,
        completion_score = ?,
        is_test_record = ?,
        business_info = ?,
        social_profiles = ?,
        regular_hours = ?,
        special_hours = ?,
        categories = ?,
        services = ?,
        service_areas = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      payload.businessName || existing.business_name,
      payload.status || existing.status,
      score,
      payload.isTestRecord !== undefined ? (payload.isTestRecord ? 1 : 0) : existing.is_test_record,
      JSON.stringify(payload.businessInfo || {}),
      JSON.stringify(payload.socialProfiles || {}),
      JSON.stringify(payload.regularHours || []),
      JSON.stringify(payload.specialHours || []),
      JSON.stringify(payload.categories || { primary: '', additional: [] }),
      JSON.stringify(payload.services || []),
      JSON.stringify(payload.serviceAreas || {}),
      now,
      id
    );

    // Sync review entries with updated values
    syncAuditReviewEntries(id);

    // Log history
    if (payload.status && payload.status !== existing.status) {
      db.prepare(`
        INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        id,
        null,
        'Admin',
        'STATUS_CHANGED',
        'status',
        existing.status,
        payload.status,
        existing.status,
        payload.status,
        `Admin transitioned audit status from ${existing.status} to ${payload.status}`,
        new Date().toISOString()
      );
    }

    return DbService.getAuditById(id);
  },

  // Share Links
  createShareLink(auditId: string, password: string, expiresInHours = 72) {
    if (!password || password.trim().length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    const audit = db.prepare('SELECT id FROM audits WHERE id = ?').get(auditId);
    if (!audit) throw new Error('Audit not found');

    // Revoke previous links for this audit to keep one primary active link
    db.prepare('UPDATE audit_share_links SET is_revoked = 1 WHERE audit_id = ?').run(auditId);

    const token = generateCryptoToken();
    const { salt, hash } = hashPassword(password);
    const id = `link-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_share_links (id, audit_id, token, password_hash, password_salt, expires_at, is_revoked, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, auditId, token, hash, salt, expiresAt, 0, now);

    return {
      id,
      auditId,
      token,
      expiresAt,
      isRevoked: false,
      createdAt: now,
    };
  },

  revokeShareLink(linkId: string) {
    const link = db.prepare('SELECT id, audit_id FROM audit_share_links WHERE id = ?').get(linkId) as any;
    if (!link) throw new Error('Share link not found');

    db.prepare('UPDATE audit_share_links SET is_revoked = 1 WHERE id = ?').run(linkId);
    // Invalidate any active sessions created from this link
    db.prepare('DELETE FROM client_sessions WHERE share_link_id = ?').run(linkId);

    return { success: true };
  },

  // Client Authentication via Share Token + Password
  authenticateClient(token: string, password: string) {
    const link = db.prepare('SELECT * FROM audit_share_links WHERE token = ?').get(token.trim()) as any;
    if (!link) {
      throw { status: 401, message: 'Invalid or nonexistent review link token.' };
    }

    if (link.is_revoked) {
      throw { status: 403, message: 'This review link has been revoked by the agency administrator.' };
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      throw { status: 403, message: 'This review link has expired. Please request a refreshed link from MapRank.' };
    }

    const isValid = verifyPassword(password, link.password_salt, link.password_hash);
    if (!isValid) {
      throw { status: 401, message: 'Incorrect access password. Access denied.' };
    }

    // Generate secure session token bound strictly to this single audit
    const sessionToken = generateCryptoToken();
    const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO client_sessions (id, audit_id, share_link_id, session_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, link.audit_id, link.id, sessionToken, expiresAt, now);

    return {
      sessionToken,
      auditId: link.audit_id,
      expiresAt,
    };
  },

  // Validate Client Session strictly for a specific audit
  validateClientSession(sessionToken: string, targetAuditId?: string) {
    if (!sessionToken) {
      throw { status: 401, message: 'Missing client session token.' };
    }

    const session = db.prepare(`
      SELECT s.*, l.is_revoked, l.expires_at as link_expires_at
      FROM client_sessions s
      JOIN audit_share_links l ON s.share_link_id = l.id
      WHERE s.session_token = ?
    `).get(sessionToken.trim()) as any;

    if (!session) {
      throw { status: 401, message: 'Session expired or not found. Please re-authenticate.' };
    }

    if (session.is_revoked) {
      throw { status: 403, message: 'The parent review link was revoked. Session terminated.' };
    }

    if (new Date(session.expires_at).getTime() < Date.now() || new Date(session.link_expires_at).getTime() < Date.now()) {
      throw { status: 403, message: 'Client session or review link has expired.' };
    }

    // Cross-audit tampering check!
    if (targetAuditId && session.audit_id !== targetAuditId) {
      throw { status: 403, message: 'FORBIDDEN: Session does not authorize access to this audit.' };
    }

    return session;
  },

  // Client loads their single authorized audit
  getClientAudit(sessionToken: string) {
    const session = DbService.validateClientSession(sessionToken);
    const auditData = DbService.getAuditById(session.audit_id);
    if (!auditData) throw { status: 404, message: 'Audit not found.' };

    return {
      audit: {
        id: auditData.audit.id,
        businessName: auditData.audit.businessName,
        status: auditData.audit.status,
        completionScore: auditData.audit.completionScore,
        isTestRecord: auditData.audit.isTestRecord,
        updatedAt: auditData.audit.updatedAt,
      },
      entries: auditData.entries,
    };
  },

  // Client updates field value with server-side validation & approval reset
  clientUpdateEntry(sessionToken: string, auditId: string, entryId: string, newValue: any) {
    // 1. Verify session strictly bound to this audit
    DbService.validateClientSession(sessionToken, auditId);

    // 2. Fetch entry
    const entry = db.prepare('SELECT * FROM audit_entries WHERE id = ? AND audit_id = ?').get(entryId, auditId) as any;
    if (!entry) throw { status: 404, message: 'Entry not found.' };

    // 3. Check client edit permission
    if (!entry.client_can_edit) {
      throw { status: 403, message: 'FORBIDDEN: Client is not permitted to edit this field.' };
    }

    // 4. Check mandatory requirement
    if (entry.is_mandatory) {
      const isEmpty = newValue === null || newValue === undefined || (typeof newValue === 'string' && newValue.trim() === '') || (Array.isArray(newValue) && newValue.length === 0);
      if (isEmpty) {
        throw { status: 400, message: `Field "${entry.field_label}" is mandatory and cannot be saved empty.` };
      }
    }

    // 5. Check if previously Approved -> if so, reset status to Pending and record!
    let nextStatus = entry.review_status;
    let isApprovalReset = false;
    if (entry.review_status === 'Approved') {
      nextStatus = 'Pending';
      isApprovalReset = true;
    }

    const now = new Date().toISOString();
    const prevVal = JSON.parse(entry.field_value || 'null');

    // 6. Write to database
    db.prepare(`
      UPDATE audit_entries SET
        field_value = ?,
        review_status = ?,
        updated_by_actor = 'Client',
        updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(newValue), nextStatus, now, entryId);

    // 7. Write history entry
    db.prepare(`
      INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      auditId,
      entryId,
      'Client (Review Link)',
      isApprovalReset ? 'VALUE_EDITED_APPROVAL_RESET' : 'VALUE_EDITED',
      entry.field_key,
      JSON.stringify(prevVal),
      JSON.stringify(newValue),
      entry.review_status,
      nextStatus,
      isApprovalReset ? 'Previously approved value was edited by client; status reset to Pending' : 'Client autosaved updated value',
      now
    );

    // Sync back to main audit JSON if top-level field
    syncEntryBackToAuditJson(auditId, entry.field_key, newValue);

    return {
      success: true,
      entryId,
      reviewStatus: nextStatus,
      savedAt: now,
    };
  },

  // Client reviews entry (Approve or Request Changes)
  clientReviewEntry(sessionToken: string, auditId: string, entryId: string, decision: 'Approved' | 'Changes Requested', comment?: string) {
    DbService.validateClientSession(sessionToken, auditId);

    if (decision !== 'Approved' && decision !== 'Changes Requested') {
      throw { status: 400, message: 'Decision must be "Approved" or "Changes Requested"' };
    }

    const entry = db.prepare('SELECT * FROM audit_entries WHERE id = ? AND audit_id = ?').get(entryId, auditId) as any;
    if (!entry) throw { status: 404, message: 'Entry not found.' };

    // Check approval permission
    if (!entry.client_can_approve) {
      throw { status: 403, message: 'FORBIDDEN: Client is not authorized to approve or review this field.' };
    }

    // If changes requested, comment is required!
    if (decision === 'Changes Requested' && (!comment || comment.trim().length === 0)) {
      throw { status: 400, message: 'A specific feedback comment is required when requesting changes.' };
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE audit_entries SET
        review_status = ?,
        client_comment = ?,
        updated_by_actor = 'Client',
        updated_at = ?
      WHERE id = ?
    `).run(decision, comment ? comment.trim() : null, now, entryId);

    // Write history log
    db.prepare(`
      INSERT INTO audit_history (id, audit_id, entry_id, actor, action_type, field_key, previous_value, new_value, previous_status, new_status, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      auditId,
      entryId,
      'Client (Review Link)',
      decision === 'Approved' ? 'STATUS_APPROVED' : 'CHANGES_REQUESTED',
      entry.field_key,
      entry.field_value,
      entry.field_value,
      entry.review_status,
      decision,
      comment ? comment.trim() : 'Client marked item as Approved',
      now
    );

    return {
      success: true,
      entryId,
      reviewStatus: decision,
      comment: comment ? comment.trim() : null,
      savedAt: now,
    };
  },

  // Admin updates entry permissions
  adminUpdateEntryPermissions(auditId: string, entryId: string, permissions: { isMandatory?: boolean; clientCanEdit?: boolean; clientCanApprove?: boolean }) {
    const entry = db.prepare('SELECT * FROM audit_entries WHERE id = ? AND audit_id = ?').get(entryId, auditId) as any;
    if (!entry) throw new Error('Entry not found');

    const isMandatory = permissions.isMandatory !== undefined ? (permissions.isMandatory ? 1 : 0) : entry.is_mandatory;
    const clientCanEdit = permissions.clientCanEdit !== undefined ? (permissions.clientCanEdit ? 1 : 0) : entry.client_can_edit;
    const clientCanApprove = permissions.clientCanApprove !== undefined ? (permissions.clientCanApprove ? 1 : 0) : entry.client_can_approve;

    db.prepare(`
      UPDATE audit_entries SET
        is_mandatory = ?,
        client_can_edit = ?,
        client_can_approve = ?,
        updated_at = ?
      WHERE id = ?
    `).run(isMandatory, clientCanEdit, clientCanApprove, new Date().toISOString(), entryId);

    return { success: true };
  },

  // Audit History Log
  getAuditHistory(auditId: string) {
    const rows = db.prepare(`
      SELECT * FROM audit_history
      WHERE audit_id = ?
      ORDER BY created_at DESC
    `).all(auditId) as any[];

    return rows.map((r) => ({
      id: r.id,
      auditId: r.audit_id,
      entryId: r.entry_id,
      actor: r.actor,
      actionType: r.action_type,
      fieldKey: r.field_key,
      previousValue: r.previous_value ? JSON.parse(r.previous_value) : null,
      newValue: r.new_value ? JSON.parse(r.new_value) : null,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      comment: r.comment,
      createdAt: r.created_at,
    }));
  },

  // Live Activity Feed across all audits for Dashboard
  getRecentActivity(limit = 15) {
    const rows = db.prepare(`
      SELECT h.*, a.business_name
      FROM audit_history h
      JOIN audits a ON h.audit_id = a.id
      ORDER BY h.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      auditId: r.audit_id,
      businessName: r.business_name,
      actor: r.actor,
      actionType: r.action_type,
      fieldKey: r.field_key,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      comment: r.comment,
      createdAt: r.created_at,
    }));
  },

  // Master Templates
  getTemplates() {
    const rows = db.prepare('SELECT * FROM audit_templates').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      industry: r.industry,
      version: r.version,
      description: r.description,
      defaultSections: JSON.parse(r.default_sections || '{}'),
    }));
  },
};

function syncEntryBackToAuditJson(auditId: string, fieldKey: string, newValue: any) {
  const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(auditId) as any;
  if (!audit) return;

  const now = new Date().toISOString().split('T')[0];
  if (fieldKey.startsWith('businessInfo.')) {
    const sub = fieldKey.replace('businessInfo.', '');
    const biz = JSON.parse(audit.business_info || '{}');
    biz[sub] = newValue;
    db.prepare('UPDATE audits SET business_info = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(biz), now, auditId);
  } else if (fieldKey === 'regularHours') {
    db.prepare('UPDATE audits SET regular_hours = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(newValue), now, auditId);
  } else if (fieldKey === 'specialHours') {
    db.prepare('UPDATE audits SET special_hours = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(newValue), now, auditId);
  } else if (fieldKey === 'services') {
    db.prepare('UPDATE audits SET services = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(newValue), now, auditId);
  } else if (fieldKey === 'categories.additional') {
    const cats = JSON.parse(audit.categories || '{"primary":"", "additional":[]}');
    cats.additional = newValue;
    db.prepare('UPDATE audits SET categories = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(cats), now, auditId);
  } else if (fieldKey === 'serviceAreas.designatedAreas') {
    const areas = JSON.parse(audit.service_areas || '{}');
    areas.designatedAreas = newValue;
    db.prepare('UPDATE audits SET service_areas = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(areas), now, auditId);
  }
}
