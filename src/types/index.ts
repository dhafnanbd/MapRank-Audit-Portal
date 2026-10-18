export type AuditStatus = 'Draft' | 'In Progress' | 'In Review' | 'Completed' | 'Action Required';

export type ReviewStatus = 'Pending' | 'Approved' | 'Changes Requested';

export interface DayHours {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  is24Hours: boolean;
}

export interface SpecialHour {
  id: string;
  date: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  note: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price?: string;
  description: string;
}

export interface BusinessInfo {
  registeredName: string;
  primaryCategory: string;
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  primaryPhone: string;
  websiteUrl: string;
  latitude: string;
  longitude: string;
  isVerified: boolean;
  verificationMethod: 'Postcard' | 'Phone' | 'Email' | 'Video' | 'Instant' | 'Unverified';
}

export interface SocialProfiles {
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  xTwitterUrl: string;
  yelpUrl: string;
}

export interface ServiceAreas {
  hasPhysicalStorefront: boolean;
  servesCustomersAtLocation: boolean;
  areaType: 'Radius' | 'Cities' | 'Postal Codes';
  designatedAreas: string[];
}

export interface GBPAuditData {
  id: string;
  clientId: string;
  clientName: string;
  templateId?: string;
  templateSnapshot?: Record<string, any>;
  businessName: string;
  status: AuditStatus;
  completionScore: number; // 0 - 100
  isTestRecord: boolean;
  createdAt: string;
  updatedAt: string;

  // 7 Expandable Pillars
  businessInfo: BusinessInfo;
  socialProfiles: SocialProfiles;
  regularHours: DayHours[];
  specialHours: SpecialHour[];
  categories: {
    primary: string;
    additional: string[];
  };
  services: ServiceItem[];
  serviceAreas: ServiceAreas;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeAuditsCount: number;
  isTestRecord: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTemplate {
  id: string;
  title: string;
  industry: string;
  version: string;
  description: string;
  defaultSections: {
    requiredSections: string[];
    benchmarks: {
      minAdditionalCategories: number;
      minServices: number;
      requireVerifiedStatus: boolean;
    };
  };
}

export interface AuditReviewEntry {
  id: string;
  auditId: string;
  sectionKey: string;
  fieldKey: string;
  fieldLabel: string;
  fieldValue: any;
  isMandatory: boolean;
  clientCanEdit: boolean;
  clientCanApprove: boolean;
  reviewStatus: ReviewStatus;
  clientComment?: string;
  updatedByActor: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditShareLink {
  id: string;
  auditId: string;
  token: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
  shareUrl?: string;
}

export interface DetailedHistoryItem {
  id: string;
  auditId: string;
  entryId?: string;
  actor: string;
  actionType: string;
  fieldKey: string;
  previousValue: any;
  newValue: any;
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
  createdAt: string;
}

export interface SecurityTestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expectedStatus: number;
  actualStatus: number;
  message: string;
  timestamp: string;
}
