"use client";

import { SectionHeader } from "@/components/section-header";

export default function SettingsPage() {
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
            {[
              "Quotation Template",
              "DG NOC",
              "Agreement",
              "Completion Pack",
            ].map((template) => (
              <div
                key={template}
                className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <p className="text-sm font-semibold text-solar-ink">{template}</p>
                <label className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink cursor-pointer">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={() => alert("Template uploaded. Mapping will be configured next.")}
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
            {[
              { label: "Email Notifications", enabled: true },
              { label: "WhatsApp (Provider TBD)", enabled: false },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <p className="text-sm font-semibold text-solar-ink">{item.label}</p>
                <span className="text-xs font-semibold text-solar-forest">
                  {item.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
