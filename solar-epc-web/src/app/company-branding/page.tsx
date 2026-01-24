"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";

type CompanySettings = {
  companyName: string;
  companyTagline?: string | null;
  companyLogo?: string | null;
  companyFavicon?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  website?: string | null;
  taxId?: string | null;
  footerText?: string | null;
  loginBgImage?: string | null;
  loginLogo?: string | null;
};

export default function CompanyBrandingPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/company-settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage("Settings saved successfully! Refresh to see changes.");
        // Update favicon and title
        if (settings?.companyFavicon) {
          const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (link) link.href = settings.companyFavicon;
        }
        if (settings?.companyName) {
          document.title = settings.companyName;
        }
      }
    } catch (error) {
      setMessage("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field: keyof CompanySettings, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings!, [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-center">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Company Branding"
        subtitle="Customize your company logo, colors, and information"
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar space-y-6">
        {/* Company Info */}
        <div>
          <h3 className="text-lg font-semibold text-solar-ink mb-4">Company Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Hi-Tech Solar"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Tagline
              </label>
              <input
                value={settings.companyTagline || ""}
                onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Powering Tomorrow, Today"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="info@hitechsolar.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Contact Phone
              </label>
              <input
                value={settings.contactPhone || ""}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="+971 XX XXX XXXX"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Address
              </label>
              <input
                value={settings.contactAddress || ""}
                onChange={(e) => setSettings({ ...settings, contactAddress: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="123 Solar Street, Dubai, UAE"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Website
              </label>
              <input
                value={settings.website || ""}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="https://hitechsolar.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Tax ID / GST Number
              </label>
              <input
                value={settings.taxId || ""}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="border-t border-solar-border pt-6">
          <h3 className="text-lg font-semibold text-solar-ink mb-4">Branding & Logo</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Company Logo (for documents, headers)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("companyLogo", e.target.files[0])}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
              {settings.companyLogo && (
                <img
                  src={settings.companyLogo}
                  alt="Company Logo"
                  className="mt-2 h-16 object-contain rounded border border-solar-border p-2 bg-white"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Favicon (browser tab icon)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("companyFavicon", e.target.files[0])}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
              {settings.companyFavicon && (
                <img
                  src={settings.companyFavicon}
                  alt="Favicon"
                  className="mt-2 h-8 w-8 object-contain rounded border border-solar-border p-1 bg-white"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Login Page Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("loginLogo", e.target.files[0])}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
              {settings.loginLogo && (
                <img
                  src={settings.loginLogo}
                  alt="Login Logo"
                  className="mt-2 h-16 object-contain rounded border border-solar-border p-2 bg-white"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Login Background Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("loginBgImage", e.target.files[0])}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
              {settings.loginBgImage && (
                <img
                  src={settings.loginBgImage}
                  alt="Login Background"
                  className="mt-2 h-24 w-full object-cover rounded border border-solar-border"
                />
              )}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="border-t border-solar-border pt-6">
          <h3 className="text-lg font-semibold text-solar-ink mb-4">Brand Colors</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded border border-solar-border"
                />
                <input
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none font-mono"
                  placeholder="#F59E0B"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="h-10 w-20 rounded border border-solar-border"
                />
                <input
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none font-mono"
                  placeholder="#059669"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-muted mb-1">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="h-10 w-20 rounded border border-solar-border"
                />
                <input
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none font-mono"
                  placeholder="#0F172A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-solar-border pt-6">
          <h3 className="text-lg font-semibold text-solar-ink mb-4">Footer Text</h3>
          <input
            value={settings.footerText || ""}
            onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
            className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="© 2026 Hi-Tech Solar. All rights reserved."
          />
        </div>

        {/* Save Button */}
        <div className="border-t border-solar-border pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-solar-amber px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && (
            <p className={`mt-3 text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
