"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";

const TEMPLATE_KEYS = ["Quotation Template", "DG NOC", "Agreement", "Completion Pack"] as const;

type TemplateState = Record<(typeof TEMPLATE_KEYS)[number], string>;

export default function SettingsPage() {
  const [templates, setTemplates] = useState<TemplateState>(() =>
    TEMPLATE_KEYS.reduce((acc, key) => ({ ...acc, [key]: "" }), {} as TemplateState)
  );
  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: false,
  });

  useEffect(() => {
    const storedTemplates = window.localStorage.getItem("solar.epc.templates");
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates));
    }
    const storedNotifications = window.localStorage.getItem("solar.epc.notifications");
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    }
  }, []);

  const handleTemplateUpload = (key: (typeof TEMPLATE_KEYS)[number], file: File | null) => {
    if (!file) return;
    const updated = { ...templates, [key]: file.name };
    setTemplates(updated);
    window.localStorage.setItem("solar.epc.templates", JSON.stringify(updated));
  };

  const toggleNotifications = (type: "email" | "whatsapp") => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    window.localStorage.setItem("solar.epc.notifications", JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Configure templates, tax rules, and notification channels."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Document Templates</h3>
          <p className="text-sm text-solar-muted mt-1">
            Upload the client-provided PDF templates and map required fields.
          </p>
          <div className="mt-4 space-y-3">
            {TEMPLATE_KEYS.map((template) => (
              <div
                key={template}
                className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">{template}</p>
                  <p className="text-xs text-solar-muted">
                    {templates[template] ? `Uploaded: ${templates[template]}` : "No file uploaded"}
                  </p>
                </div>
                <label className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink cursor-pointer">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      handleTemplateUpload(template, event.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Notifications</h3>
          <p className="text-sm text-solar-muted mt-1">
            Enable email and WhatsApp reminders.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3">
              <p className="text-sm font-semibold text-solar-ink">Email Notifications</p>
              <button
                onClick={() => toggleNotifications("email")}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-solar-forest"
              >
                {notifications.email ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3">
              <p className="text-sm font-semibold text-solar-ink">WhatsApp Notifications</p>
              <button
                onClick={() => toggleNotifications("whatsapp")}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-solar-forest"
              >
                {notifications.whatsapp ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
