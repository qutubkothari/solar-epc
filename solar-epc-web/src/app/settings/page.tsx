"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ModalShell } from "@/components/modal-shell";

const TEMPLATE_KEYS = ["Quotation Template", "DG NOC", "Agreement", "Completion Pack"] as const;

type TemplateState = Record<(typeof TEMPLATE_KEYS)[number], string>;
const DEFAULT_TEMPLATES = TEMPLATE_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: "" }),
  {} as TemplateState
);
const DEFAULT_NOTIFICATIONS = { email: true, whatsapp: false };

type QuotationTemplate = {
  id: string;
  name: string;
  sourceSheet: string;
  data: Record<string, unknown>;
  createdAt: string;
};

type TechnicalDataset = {
  id: string;
  sourceSheet: string;
  rowIndex: number;
  data: Record<string, unknown>;
  createdAt: string;
};

type QuotationWriteup = {
  id: string;
  key: string;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [templates, setTemplates] = useState<TemplateState>(() => {
    if (typeof window === "undefined") return DEFAULT_TEMPLATES;
    const storedTemplates = window.localStorage.getItem("solar.epc.templates");
    if (!storedTemplates) return DEFAULT_TEMPLATES;
    try {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(storedTemplates) } as TemplateState;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_NOTIFICATIONS;
    const storedNotifications = window.localStorage.getItem("solar.epc.notifications");
    if (!storedNotifications) return DEFAULT_NOTIFICATIONS;
    try {
      return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(storedNotifications) };
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });
  const [templatesData, setTemplatesData] = useState<QuotationTemplate[]>([]);
  const [technicalData, setTechnicalData] = useState<TechnicalDataset[]>([]);
  const [quotationWriteups, setQuotationWriteups] = useState<QuotationWriteup[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [templatePreview, setTemplatePreview] = useState<QuotationTemplate | null>(null);
  const [technicalPreviewSheet, setTechnicalPreviewSheet] = useState<string | null>(null);
  const [savingWriteups, setSavingWriteups] = useState(false);
  const [writeupStatus, setWriteupStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchImportedData = async () => {
      try {
        const [templateRes, techRes, writeupRes] = await Promise.all([
          fetch("/api/quotation-templates"),
          fetch("/api/technical-datasets"),
          fetch("/api/quotation-writeups"),
        ]);
        const [templateJson, techJson, writeupJson] = await Promise.all([
          templateRes.json(),
          techRes.json(),
          writeupRes.json(),
        ]);
        setTemplatesData(Array.isArray(templateJson) ? templateJson : []);
        setTechnicalData(Array.isArray(techJson) ? techJson : []);
        setQuotationWriteups(Array.isArray(writeupJson) ? writeupJson : []);
      } catch (error) {
        console.error("Failed to fetch imported data:", error);
      } finally {
        setLoadingImports(false);
      }
    };

    fetchImportedData();
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

  const templateRows = (template: QuotationTemplate) => {
    const data = template.data as { rows?: unknown[] };
    return Array.isArray(data?.rows) ? data.rows : [];
  };

  const templateHeaders = (template: QuotationTemplate) => {
    const data = template.data as { headers?: string[]; rows?: unknown[] };
    if (Array.isArray(data?.headers) && data.headers.length > 0) return data.headers;
    const rows = templateRows(template);
    const firstRow = rows[0];
    if (!firstRow) return [];
    if (Array.isArray(firstRow)) return firstRow.map((_, index) => `Column ${index + 1}`);
    if (typeof firstRow === "object" && firstRow) return Object.keys(firstRow as object);
    return [];
  };

  const technicalGroups = useMemo(() => {
    return technicalData.reduce<Record<string, TechnicalDataset[]>>((acc, row) => {
      const key = row.sourceSheet || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [technicalData]);

  const technicalSheets = useMemo(
    () =>
      Object.entries(technicalGroups).map(([sheet, rows]) => ({
        sheet,
        count: rows.length,
      })),
    [technicalGroups]
  );

  const technicalPreviewRows = technicalPreviewSheet
    ? technicalGroups[technicalPreviewSheet] || []
    : [];

  const technicalHeaders = (row: TechnicalDataset) => {
    const data = row.data as { headers?: string[]; values?: Record<string, unknown> };
    if (Array.isArray(data?.headers) && data.headers.length > 0) return data.headers;
    return data?.values ? Object.keys(data.values) : [];
  };

  const technicalValue = (row: TechnicalDataset, header: string) => {
    const data = row.data as { values?: Record<string, unknown> };
    const value = data?.values?.[header];
    return value === null || value === undefined || value === "" ? "—" : String(value);
  };

  const updateWriteup = (key: string, patch: Partial<QuotationWriteup>) => {
    setQuotationWriteups((prev) =>
      prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
    );
  };

  const saveWriteups = async () => {
    setSavingWriteups(true);
    setWriteupStatus(null);

    try {
      const response = await fetch("/api/quotation-writeups", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          quotationWriteups.map((entry) => ({
            key: entry.key,
            title: entry.title,
            content: entry.content,
            sortOrder: entry.sortOrder,
            isActive: entry.isActive,
          }))
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save quotation writeups");
      }

      setQuotationWriteups(Array.isArray(data) ? data : []);
      setWriteupStatus("Quotation writeups saved.");
    } catch (error) {
      setWriteupStatus(error instanceof Error ? error.message : "Failed to save quotation writeups");
    } finally {
      setSavingWriteups(false);
    }
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Imported Quotation Templates</h3>
          <p className="text-sm text-solar-muted mt-1">
            Templates loaded from EPC.xlsx for quick quoting.
          </p>
          {loadingImports ? (
            <div className="mt-4 text-sm text-solar-muted">Loading templates...</div>
          ) : templatesData.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-solar-border bg-solar-sand px-4 py-6 text-sm text-solar-muted">
              No quotation templates found.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {templatesData.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-solar-ink">{template.name}</p>
                    <p className="text-xs text-solar-muted">
                      Sheet: {template.sourceSheet} • Rows: {templateRows(template).length}
                    </p>
                  </div>
                  <button
                    onClick={() => setTemplatePreview(template)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Preview
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Technical Dataset</h3>
          <p className="text-sm text-solar-muted mt-1">
            Production and sizing reference values loaded from EPC.xlsx.
          </p>
          {loadingImports ? (
            <div className="mt-4 text-sm text-solar-muted">Loading technical data...</div>
          ) : technicalSheets.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-solar-border bg-solar-sand px-4 py-6 text-sm text-solar-muted">
              No technical rows found.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {technicalSheets.map((sheet) => (
                <div
                  key={sheet.sheet}
                  className="flex items-center justify-between gap-4 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-solar-ink">{sheet.sheet}</p>
                    <p className="text-xs text-solar-muted">Rows: {sheet.count}</p>
                  </div>
                  <button
                    onClick={() => setTechnicalPreviewSheet(sheet.sheet)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Preview
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-solar-ink">Quotation Writeups Master</h3>
            <p className="mt-1 text-sm text-solar-muted">
              Maintain the standard writeup sections copied into quotation PDFs.
            </p>
          </div>
          <button
            onClick={saveWriteups}
            disabled={savingWriteups || loadingImports}
            className="rounded-xl border border-solar-border bg-solar-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingWriteups ? "Saving..." : "Save Writeups"}
          </button>
        </div>

        {writeupStatus && (
          <div className="mt-4 rounded-xl border border-solar-border bg-solar-sand px-4 py-3 text-sm text-solar-ink">
            {writeupStatus}
          </div>
        )}

        {loadingImports ? (
          <div className="mt-4 text-sm text-solar-muted">Loading writeups...</div>
        ) : quotationWriteups.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-solar-border bg-solar-sand px-4 py-6 text-sm text-solar-muted">
            No quotation writeups found.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {quotationWriteups.map((writeup) => (
              <div key={writeup.key} className="rounded-xl border border-solar-border bg-solar-sand p-4">
                <div className="grid gap-4 md:grid-cols-[1fr,140px,140px]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-solar-muted">
                      Title
                    </label>
                    <input
                      type="text"
                      value={writeup.title}
                      onChange={(event) => updateWriteup(writeup.key, { title: event.target.value })}
                      className="w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm text-solar-ink"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-solar-muted">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={writeup.sortOrder}
                      onChange={(event) => updateWriteup(writeup.key, { sortOrder: Number(event.target.value || 0) })}
                      className="w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm text-solar-ink"
                    />
                  </div>
                  <label className="flex items-end gap-3 rounded-xl border border-solar-border bg-white px-3 py-2 text-sm font-medium text-solar-ink">
                    <input
                      type="checkbox"
                      checked={writeup.isActive}
                      onChange={(event) => updateWriteup(writeup.key, { isActive: event.target.checked })}
                    />
                    Include In PDF
                  </label>
                </div>

                <div className="mt-4">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-solar-muted">
                    {writeup.key}
                  </div>
                  <textarea
                    value={writeup.content}
                    onChange={(event) => updateWriteup(writeup.key, { content: event.target.value })}
                    rows={Math.max(8, Math.min(20, writeup.content.split("\n").length + 2))}
                    className="min-h-[180px] w-full rounded-xl border border-solar-border bg-white px-3 py-3 text-sm text-solar-ink"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {templatePreview && (
        <ModalShell
          title="Quotation Template Preview"
          subtitle={`${templatePreview.name} • ${templatePreview.sourceSheet}`}
          onClose={() => setTemplatePreview(null)}
          size="2xl"
        >
          {templateRows(templatePreview).length === 0 ? (
            <div className="text-sm text-solar-muted">No rows available.</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-solar-border">
              <table className="min-w-full text-xs">
                <thead className="bg-solar-sand text-solar-ink">
                  <tr>
                    {templateHeaders(templatePreview).map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templateRows(templatePreview)
                    .slice(0, 10)
                    .map((row, index) => (
                      <tr key={index} className="border-t border-solar-border">
                        {Array.isArray(row)
                          ? row.map((value, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2">
                                {value === null || value === undefined || value === ""
                                  ? "—"
                                  : String(value)}
                              </td>
                            ))
                          : templateHeaders(templatePreview).map((header) => (
                              <td key={header} className="px-3 py-2">
                                {row && typeof row === "object"
                                  ? String((row as Record<string, unknown>)[header] ?? "—")
                                  : "—"}
                              </td>
                            ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {templateRows(templatePreview).length > 10 && (
            <p className="mt-3 text-xs text-solar-muted">
              Showing first 10 rows of {templateRows(templatePreview).length}.
            </p>
          )}
        </ModalShell>
      )}

      {technicalPreviewSheet && (
        <ModalShell
          title="Technical Dataset Preview"
          subtitle={`${technicalPreviewSheet} • ${technicalPreviewRows.length} rows`}
          onClose={() => setTechnicalPreviewSheet(null)}
          size="2xl"
        >
          {technicalPreviewRows.length === 0 ? (
            <div className="text-sm text-solar-muted">No rows available.</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-solar-border">
              <table className="min-w-full text-xs">
                <thead className="bg-solar-sand text-solar-ink">
                  <tr>
                    {technicalHeaders(technicalPreviewRows[0]).map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {technicalPreviewRows.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-t border-solar-border">
                      {technicalHeaders(row).map((header) => (
                        <td key={header} className="px-3 py-2">
                          {technicalValue(row, header)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {technicalPreviewRows.length > 10 && (
            <p className="mt-3 text-xs text-solar-muted">
              Showing first 10 rows of {technicalPreviewRows.length}.
            </p>
          )}
        </ModalShell>
      )}
    </div>
  );
}
