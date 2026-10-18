import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Save,
  CheckCircle,
  ChevronDown,
  Plus,
  Trash2,
  Lock,
  Layers,
  History,
  Shield,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  GBPAuditData,
  AuditReviewEntry,
  AuditShareLink,
  DetailedHistoryItem,
  DayHours,
  SpecialHour,
  ServiceItem,
} from '../../types';
import { ShareLinkModal } from './ShareLinkModal';

interface AuditDetailViewProps {
  audit: GBPAuditData;
  entries: AuditReviewEntry[];
  shareLinks: AuditShareLink[];
  history: DetailedHistoryItem[];
  onSaveAudit: (updated: Partial<GBPAuditData>) => Promise<void>;
  onUpdateEntryPermissions: (
    entryId: string,
    permissions: { isMandatory?: boolean; clientCanEdit?: boolean; clientCanApprove?: boolean }
  ) => Promise<void>;
  onCreateShareLink: (password: string, expiresInHours: number) => Promise<AuditShareLink>;
  onRevokeShareLink: (linkId: string) => Promise<void>;
  onBack: () => void;
  onPreviewClientView: (token: string) => void;
}

export const AuditDetailView: React.FC<AuditDetailViewProps> = ({
  audit,
  entries,
  shareLinks,
  history,
  onSaveAudit,
  onUpdateEntryPermissions,
  onCreateShareLink,
  onRevokeShareLink,
  onBack,
  onPreviewClientView,
}) => {
  const [formData, setFormData] = useState<GBPAuditData>(audit);
  const [currentTab, setCurrentTab] = useState<'form' | 'permissions' | 'history' | 'snapshot'>('form');
  const [openSection, setOpenSection] = useState<string>('biz-info');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Field change helpers
  const handleBizInfoChange = (field: keyof typeof audit.businessInfo, val: any) => {
    setFormData((prev) => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, [field]: val },
    }));
  };

  const handleSocialChange = (field: keyof typeof audit.socialProfiles, val: string) => {
    setFormData((prev) => ({
      ...prev,
      socialProfiles: { ...prev.socialProfiles, [field]: val },
    }));
  };

  const handleHourToggle = (dayIndex: number) => {
    const updated = [...formData.regularHours];
    updated[dayIndex].isOpen = !updated[dayIndex].isOpen;
    setFormData((prev) => ({ ...prev, regularHours: updated }));
  };

  const handleHourTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', val: string) => {
    const updated = [...formData.regularHours];
    updated[dayIndex][field] = val;
    setFormData((prev) => ({ ...prev, regularHours: updated }));
  };

  // Special Hours (Unlimited)
  const addSpecialHour = () => {
    const newSh: SpecialHour = {
      id: `sh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      isOpen: false,
      note: 'Holiday Closure',
    };
    setFormData((prev) => ({ ...prev, specialHours: [...prev.specialHours, newSh] }));
  };

  const removeSpecialHour = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      specialHours: prev.specialHours.filter((item) => item.id !== id),
    }));
  };

  // Services Catalog (Unlimited)
  const addService = () => {
    const newSvc: ServiceItem = {
      id: `svc-${Date.now()}`,
      name: '',
      category: formData.categories.primary || 'General',
      price: '',
      description: '',
    };
    setFormData((prev) => ({ ...prev, services: [...prev.services, newSvc] }));
  };

  const removeService = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((item) => item.id !== id),
    }));
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveAudit(formData);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'biz-info', title: '1. Business Information & Core N.A.P.', subtitle: 'Official Registered Name, Category, Address, Phone, Geolocation & Verification' },
    { id: 'social', title: '2. Social Profiles & Citations', subtitle: 'Connected brand signals across Google, Meta, LinkedIn, and Yelp' },
    { id: 'hours', title: '3. Regular Opening Hours', subtitle: 'Weekly operational customer-facing hours' },
    { id: 'special-hours', title: '4. Special & Holiday Hours', subtitle: 'Scheduled holiday exceptions and seasonal adjustments' },
    { id: 'categories', title: '5. Primary & Additional Categories', subtitle: 'Google algorithm category targeting' },
    { id: 'services', title: '6. Services & Pricing Catalog', subtitle: 'Search & Maps services listing catalog' },
    { id: 'service-areas', title: '7. Service Areas & Storefront Settings', subtitle: 'Coverage radius, cities served, hybrid storefront settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Return to audit catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#031630]">{formData.businessName}</h2>
              {formData.isTestRecord && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                  Sample Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <span className="font-semibold text-slate-700">{formData.clientName}</span> • Updated:{' '}
              <span>{formData.updatedAt}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {saveToast && (
            <span className="text-xs font-bold text-[#18C99A] animate-fade-in flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Saved to database
            </span>
          )}

          {/* Status Dropdown */}
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-[#0561D5]"
          >
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
            <option value="Action Required">Action Required</option>
          </select>

          {/* Share Link Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-[#0561D5]" />
            <span>Share Link ({shareLinks.filter((l) => !l.isRevoked).length})</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Audit'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-xs overflow-x-auto">
        <button
          onClick={() => setCurrentTab('form')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-xs font-bold transition ${
            currentTab === 'form' ? 'bg-[#031630] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          7-Pillar GBP Form
        </button>
        <button
          onClick={() => setCurrentTab('permissions')}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            currentTab === 'permissions' ? 'bg-[#031630] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#18C99A]" />
          <span>Review Permissions ({entries.length})</span>
        </button>
        <button
          onClick={() => setCurrentTab('history')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            currentTab === 'history' ? 'bg-[#031630] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit History ({history.length})</span>
        </button>
        <button
          onClick={() => setCurrentTab('snapshot')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            currentTab === 'snapshot' ? 'bg-[#031630] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Template Snapshot</span>
        </button>
      </div>

      {/* TAB 1: 7-Pillar GBP Form */}
      {currentTab === 'form' && (
        <div className="space-y-4">
          {/* Health Score Banner */}
          <div className="bg-[#031630] text-white p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#18C99A] flex items-center justify-center text-lg font-black text-white shadow-sm">
                {formData.completionScore}%
              </div>
              <div>
                <h4 className="text-sm font-bold">Optimization Health Score</h4>
                <p className="text-xs text-slate-300">
                  Calculated automatically based on category precision, address completeness, services catalog, and verification.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
              7 Expandable Pillars • Unlimited Repeatable Items Supported
            </div>
          </div>

          {/* Accordions */}
          <div className="space-y-3">
            {sections.map((sec) => {
              const isOpen = openSection === sec.id;
              return (
                <div key={sec.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-slate-50/80 transition text-left"
                  >
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#031630]">{sec.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sec.subtitle}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="p-6 border-t border-slate-200 bg-[#FAFCFE] space-y-5 text-xs">
                      {/* Section 1: Business Info */}
                      {sec.id === 'biz-info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Official GBP Business Name *
                            </label>
                            <input
                              type="text"
                              value={formData.businessInfo.registeredName}
                              onChange={(e) => handleBizInfoChange('registeredName', e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Primary GBP Category *
                            </label>
                            <input
                              type="text"
                              value={formData.businessInfo.primaryCategory}
                              onChange={(e) => handleBizInfoChange('primaryCategory', e.target.value)}
                              placeholder="e.g. Roofing contractor"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0561D5]"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={formData.businessInfo.streetAddress}
                              onChange={(e) => handleBizInfoChange('streetAddress', e.target.value)}
                              placeholder="123 Commerce Way"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">City</label>
                            <input
                              type="text"
                              value={formData.businessInfo.city}
                              onChange={(e) => handleBizInfoChange('city', e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-bold text-slate-700 uppercase mb-1">State / Province</label>
                              <input
                                type="text"
                                value={formData.businessInfo.stateProvince}
                                onChange={(e) => handleBizInfoChange('stateProvince', e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 uppercase mb-1">Postal Code</label>
                              <input
                                type="text"
                                value={formData.businessInfo.postalCode}
                                onChange={(e) => handleBizInfoChange('postalCode', e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">Primary Phone</label>
                            <input
                              type="text"
                              value={formData.businessInfo.primaryPhone}
                              onChange={(e) => handleBizInfoChange('primaryPhone', e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">Website URL</label>
                            <input
                              type="url"
                              value={formData.businessInfo.websiteUrl}
                              onChange={(e) => handleBizInfoChange('websiteUrl', e.target.value)}
                              placeholder="https://..."
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-bold text-slate-700 uppercase mb-1">Map Latitude</label>
                              <input
                                type="text"
                                value={formData.businessInfo.latitude}
                                onChange={(e) => handleBizInfoChange('latitude', e.target.value)}
                                placeholder="30.2458"
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 uppercase mb-1">Map Longitude</label>
                              <input
                                type="text"
                                value={formData.businessInfo.longitude}
                                onChange={(e) => handleBizInfoChange('longitude', e.target.value)}
                                placeholder="-97.7654"
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.businessInfo.isVerified}
                                onChange={(e) => handleBizInfoChange('isVerified', e.target.checked)}
                                className="w-4 h-4 text-[#0561D5] rounded"
                              />
                              <span className="font-bold text-slate-700">Verified Listing on Google</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-semibold">Verification Method:</span>
                              <select
                                value={formData.businessInfo.verificationMethod}
                                onChange={(e) => handleBizInfoChange('verificationMethod', e.target.value)}
                                className="border border-slate-300 rounded-lg px-2 py-1 bg-white"
                              >
                                <option value="Unverified">Unverified</option>
                                <option value="Postcard">Postcard</option>
                                <option value="Phone">Phone</option>
                                <option value="Email">Email</option>
                                <option value="Video">Live / Recorded Video</option>
                                <option value="Instant">Instant Verification</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 2: Socials */}
                      {sec.id === 'social' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.keys(formData.socialProfiles).map((key) => {
                            const field = key as keyof typeof formData.socialProfiles;
                            const label = field.replace('Url', '').toUpperCase();
                            return (
                              <div key={field}>
                                <label className="block font-bold text-slate-700 mb-1">{label} Profile Link</label>
                                <input
                                  type="url"
                                  value={formData.socialProfiles[field]}
                                  onChange={(e) => handleSocialChange(field, e.target.value)}
                                  placeholder={`https://${field.replace('Url', '').toLowerCase()}.com/...`}
                                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Section 3: Regular Hours */}
                      {sec.id === 'hours' && (
                        <div className="space-y-3">
                          {formData.regularHours.map((h, idx) => (
                            <div
                              key={h.day}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                            >
                              <div className="w-32 font-bold text-[#031630]">{h.day}</div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={h.isOpen}
                                    onChange={() => handleHourToggle(idx)}
                                    className="w-4 h-4 text-[#0561D5]"
                                  />
                                  <span className={h.isOpen ? 'text-[#18C99A] font-bold' : 'text-slate-400'}>
                                    {h.isOpen ? 'Open' : 'Closed'}
                                  </span>
                                </label>

                                {h.isOpen && (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={h.openTime}
                                      onChange={(e) => handleHourTimeChange(idx, 'openTime', e.target.value)}
                                      className="p-1.5 border border-slate-300 rounded-md"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <input
                                      type="time"
                                      value={h.closeTime}
                                      onChange={(e) => handleHourTimeChange(idx, 'closeTime', e.target.value)}
                                      className="p-1.5 border border-slate-300 rounded-md"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section 4: Special Hours */}
                      {sec.id === 'special-hours' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-500">Record holiday adjustments, seasonal closures, or emergency hours.</p>
                            <button
                              type="button"
                              onClick={addSpecialHour}
                              className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg transition"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Holiday Date
                            </button>
                          </div>

                          {formData.specialHours.map((sh, idx) => (
                            <div key={sh.id} className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-3">
                              <input
                                type="date"
                                value={sh.date}
                                onChange={(e) => {
                                  const list = [...formData.specialHours];
                                  list[idx].date = e.target.value;
                                  setFormData({ ...formData, specialHours: list });
                                }}
                                className="p-1.5 border border-slate-300 rounded-md"
                              />
                              <input
                                type="text"
                                value={sh.note}
                                placeholder="Reason (e.g. Memorial Day)"
                                onChange={(e) => {
                                  const list = [...formData.specialHours];
                                  list[idx].note = e.target.value;
                                  setFormData({ ...formData, specialHours: list });
                                }}
                                className="p-1.5 border border-slate-300 rounded-md flex-1 min-w-[140px]"
                              />
                              <button
                                type="button"
                                onClick={() => removeSpecialHour(sh.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Remove special date"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                          {formData.specialHours.length === 0 && (
                            <p className="py-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                              No special holiday hours recorded.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section 5: Categories */}
                      {sec.id === 'categories' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Primary GBP Category
                            </label>
                            <input
                              type="text"
                              value={formData.categories.primary}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  categories: { ...formData.categories, primary: e.target.value },
                                })
                              }
                              placeholder="e.g. Roofing contractor"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Secondary Categories (Unlimited, Comma-Separated)
                            </label>
                            <textarea
                              rows={3}
                              value={formData.categories.additional.join(', ')}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  categories: {
                                    ...formData.categories,
                                    additional: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                  },
                                })
                              }
                              placeholder="e.g. Gutter cleaning service, Waterproofing company, Siding contractor"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                              No fixed item limit. Enter all relevant Google business taxonomy categories separated by commas.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Section 6: Services Catalog */}
                      {sec.id === 'services' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-500">Add services displayed directly in Google Search and Maps.</p>
                            <button
                              type="button"
                              onClick={addService}
                              className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg transition"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Service
                            </button>
                          </div>

                          {formData.services.map((svc, idx) => (
                            <div key={svc.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={svc.name}
                                  placeholder="Service Title"
                                  onChange={(e) => {
                                    const list = [...formData.services];
                                    list[idx].name = e.target.value;
                                    setFormData({ ...formData, services: list });
                                  }}
                                  className="p-2 border border-slate-300 rounded-md"
                                />
                                <input
                                  type="text"
                                  value={svc.category}
                                  placeholder="Category"
                                  onChange={(e) => {
                                    const list = [...formData.services];
                                    list[idx].category = e.target.value;
                                    setFormData({ ...formData, services: list });
                                  }}
                                  className="p-2 border border-slate-300 rounded-md"
                                />
                                <input
                                  type="text"
                                  value={svc.price || ''}
                                  placeholder="Price (e.g. $150 or Free)"
                                  onChange={(e) => {
                                    const list = [...formData.services];
                                    list[idx].price = e.target.value;
                                    setFormData({ ...formData, services: list });
                                  }}
                                  className="p-2 border border-slate-300 rounded-md"
                                />
                              </div>

                              <textarea
                                rows={2}
                                value={svc.description}
                                placeholder="Service description and scope shown to users"
                                onChange={(e) => {
                                  const list = [...formData.services];
                                  list[idx].description = e.target.value;
                                  setFormData({ ...formData, services: list });
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md"
                              />

                              <div className="text-right">
                                <button
                                  type="button"
                                  onClick={() => removeService(svc.id)}
                                  className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                                >
                                  Delete Service Item
                                </button>
                              </div>
                            </div>
                          ))}

                          {formData.services.length === 0 && (
                            <p className="py-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                              No catalog services added. Click &quot;+ Add Service&quot; above.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section 7: Service Areas */}
                      {sec.id === 'service-areas' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.serviceAreas.hasPhysicalStorefront}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    serviceAreas: { ...formData.serviceAreas, hasPhysicalStorefront: e.target.checked },
                                  })
                                }
                                className="w-4 h-4 text-[#0561D5]"
                              />
                              <span className="font-bold text-slate-700">
                                Customers visit this business at its physical street address (Storefront)
                              </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.serviceAreas.servesCustomersAtLocation}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    serviceAreas: { ...formData.serviceAreas, servesCustomersAtLocation: e.target.checked },
                                  })
                                }
                                className="w-4 h-4 text-[#0561D5]"
                              />
                              <span className="font-bold text-slate-700">
                                Business delivers goods or visits customers at their location (Service Area Business - SAB)
                              </span>
                            </label>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase mb-1">
                              Designated Cities / Postal Codes (Unlimited, Comma-Separated)
                            </label>
                            <textarea
                              rows={3}
                              value={formData.serviceAreas.designatedAreas.join(', ')}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  serviceAreas: {
                                    ...formData.serviceAreas,
                                    designatedAreas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                  },
                                })
                              }
                              placeholder="e.g. Austin TX, Round Rock TX, West Lake Hills TX, 78704, 78746"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                              Google allows up to 20 distinct service area cities or postal codes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Review Permissions & Granular Field Settings */}
      {currentTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#031630]">
                Granular Audit Item Permissions & Review Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each field possesses independent permission controls enforced strictly on the backend.
              </p>
            </div>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0561D5] hover:bg-[#044db0] rounded-lg shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Manage Client Link</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Checklist Item</th>
                  <th className="px-4 py-3 font-semibold text-center">Mandatory</th>
                  <th className="px-4 py-3 font-semibold text-center">Client Can Edit</th>
                  <th className="px-4 py-3 font-semibold text-center">Client Can Approve</th>
                  <th className="px-4 py-3 font-semibold">Review Status</th>
                  <th className="px-4 py-3 font-semibold">Client Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#031630]">{entry.fieldLabel}</div>
                      <div className="font-mono text-[10px] text-slate-400">{entry.fieldKey}</div>
                    </td>

                    {/* Mandatory Toggle */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={entry.isMandatory}
                        onChange={(e) =>
                          onUpdateEntryPermissions(entry.id, { isMandatory: e.target.checked })
                        }
                        className="w-4 h-4 text-[#0561D5] rounded"
                      />
                    </td>

                    {/* Client Can Edit Toggle */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={entry.clientCanEdit}
                        onChange={(e) =>
                          onUpdateEntryPermissions(entry.id, { clientCanEdit: e.target.checked })
                        }
                        className="w-4 h-4 text-[#0561D5] rounded"
                      />
                    </td>

                    {/* Client Can Approve Toggle */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={entry.clientCanApprove}
                        onChange={(e) =>
                          onUpdateEntryPermissions(entry.id, { clientCanApprove: e.target.checked })
                        }
                        className="w-4 h-4 text-[#0561D5] rounded"
                      />
                    </td>

                    {/* Review Status Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.reviewStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.reviewStatus === 'Changes Requested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.reviewStatus}
                      </span>
                    </td>

                    {/* Client Comment */}
                    <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs">
                      {entry.clientComment ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-1.5 rounded text-[11px] italic">
                          &quot;{entry.clientComment}&quot;
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit History & Change Log */}
      {currentTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#031630]">
              Audit History & Cryptographic Event Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks all administrative saves, client edits, status approvals, and approval resets.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="py-3.5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#031630]">{h.actor}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {h.actionType}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600">
                  Target Field: <span className="font-mono text-slate-800">{h.fieldKey}</span>
                  {h.previousStatus && h.newStatus && (
                    <span className="ml-2 font-semibold">
                      Status: <span className="line-through text-slate-400">{h.previousStatus}</span> →{' '}
                      <span className="text-[#0561D5]">{h.newStatus}</span>
                    </span>
                  )}
                </div>

                {h.comment && (
                  <p className="p-2 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-200 text-[11px]">
                    &quot;{h.comment}&quot;
                  </p>
                )}
              </div>
            ))}

            {history.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">
                No history entries recorded yet for this audit.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Template Snapshot Details */}
      {currentTab === 'snapshot' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#031630]">
              Frozen Audit Template Snapshot
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              An immutable copy was created when this audit was initialized. Master template changes will not mutate this historical record.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-2 overflow-x-auto">
            <pre className="text-slate-700 text-[11px] whitespace-pre-wrap">
              {JSON.stringify(audit.templateSnapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        auditId={audit.id}
        businessName={audit.businessName}
        existingLinks={shareLinks}
        onCreateLink={onCreateShareLink}
        onRevokeLink={onRevokeShareLink}
        onPreviewClientView={onPreviewClientView}
      />
    </div>
  );
};
