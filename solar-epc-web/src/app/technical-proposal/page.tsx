"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { formatDate } from "@/lib/format";

type ProposalTemplate = {
  id: string;
  name: string;
  sourceSheet: string;
  data: { rows?: unknown[] };
  createdAt: string;
};

type Row = string[];

const normalizeCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  return String(value).trim();
};

const getRows = (template: ProposalTemplate | null): Row[] => {
  if (!template?.data?.rows) return [];
  return template.data.rows
    .filter((row) => Array.isArray(row))
    .map((row) => (row as unknown[]).slice(0, 11).map(normalizeCell));
};

const findRowIndex = (rows: Row[], predicate: (row: Row) => boolean) =>
  rows.findIndex(predicate);

const rowContains = (row: Row, text: string) =>
  row.some((cell) => cell.toLowerCase().includes(text.toLowerCase()));

export default function TechnicalProposalPage() {
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch("/api/quotation-templates");
        const data = await res.json();
        const match = (Array.isArray(data) ? data : []).find(
          (entry: ProposalTemplate) => entry.sourceSheet === "QUOTATION"
        );
        setTemplate(match || null);
      } catch (error) {
        console.error("Failed to fetch proposal template:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, []);

  const rows = useMemo(() => getRows(template), [template]);

  const headerTitle = useMemo(() => {
    const titleRow = rows.find((row) => rowContains(row, "Techno-Commercial Proposal"));
    return titleRow?.[0] || "Detailed Techno-Commercial Proposal";
  }, [rows]);

  const companyLine = useMemo(() => {
    const row = rows.find((entry) => entry[0]?.toLowerCase().includes("hi - tech"));
    return row?.[0] || "Hi-Tech Solar Solutions";
  }, [rows]);

  const getValueForLabel = (label: string) => {
    const row = rows.find((entry) => entry[1]?.toLowerCase().includes(label.toLowerCase()));
    if (!row) return "";
    return row[4] || row[3] || row[2] || "";
  };

  const contacts = useMemo(() => {
    const startIndex = findRowIndex(rows, (row) => row[1]?.includes("HTSS Contact"));
    if (startIndex < 0) return [] as string[];
    const collected: string[] = [];
    for (let i = startIndex; i < startIndex + 6 && i < rows.length; i += 1) {
      const entry = rows[i];
      const name = entry[4];
      const phoneA = entry[7];
      const phoneB = entry[8];
      const detail = [name, phoneA, phoneB].filter(Boolean).join(" • ");
      if (detail) collected.push(detail);
    }
    return collected;
  }, [rows]);

  const executiveSummary = useMemo(() => {
    const start = findRowIndex(rows, (row) => rowContains(row, "Executive Summary"));
    if (start < 0) return [] as string[];
    const end = findRowIndex(rows, (row) => rowContains(row, "Description of Services"));
    return rows
      .slice(start + 1, end > 0 ? end : start + 8)
      .map((row) => row[0])
      .filter((text) => text && text.length > 0);
  }, [rows]);

  const servicesSummary = useMemo(() => {
    const start = findRowIndex(rows, (row) => rowContains(row, "Description of Services"));
    const end = findRowIndex(rows, (row) => rowContains(row, "Technical Proposal"));
    if (start < 0) return [] as string[];
    return rows
      .slice(start + 1, end > 0 ? end : start + 10)
      .map((row) => row[0])
      .filter((text) => text && text.length > 0);
  }, [rows]);

  const technicalTable = useMemo(() => {
    const headerIndex = findRowIndex(rows, (row) => rowContains(row, "Parameter"));
    const endIndex = findRowIndex(rows, (row) => rowContains(row, "Billing of Quantities"));
    if (headerIndex < 0) return [] as Row[];
    return rows
      .slice(headerIndex + 1, endIndex > 0 ? endIndex : headerIndex + 30)
      .filter((row) => row.slice(0, 8).some((cell) => cell));
  }, [rows]);

  const boqTable = useMemo(() => {
    const headerIndex = findRowIndex(rows, (row) => rowContains(row, "Item Name"));
    if (headerIndex < 0) return [] as Row[];
    const tableRows: Row[] = [];
    let emptyCount = 0;
    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i];
      const hasContent = row.slice(0, 10).some((cell) => cell);
      if (!hasContent) {
        emptyCount += 1;
        if (emptyCount >= 2) break;
        continue;
      }
      emptyCount = 0;
      tableRows.push(row);
    }
    return tableRows;
  }, [rows]);

  if (loading) {
    return <div className="text-sm text-solar-muted">Loading technical proposal...</div>;
  }

  if (!template) {
    return (
      <div className="rounded-2xl border border-dashed border-solar-border bg-solar-sand p-6 text-sm text-solar-muted">
        Technical proposal template not found. Please import the QUOTATION sheet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Technical Proposal"
        subtitle="Professional techno-commercial proposal prepared for the client."
        action={
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-solar-border bg-white px-4 py-2 text-sm font-semibold text-solar-ink"
          >
            Print Proposal
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-8 shadow-solar space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-solar-muted">{companyLine}</p>
          <h1 className="text-2xl font-semibold text-solar-ink">{headerTitle}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Client Name", value: getValueForLabel("Client Name") },
            { label: "Prepared for", value: getValueForLabel("Prepared for") },
            { label: "Customer Contact Person", value: getValueForLabel("Customer Contact") },
            { label: "Type of Consumer", value: getValueForLabel("Type of Consumer") },
            { label: "Consumer Number", value: getValueForLabel("Consumer Number") },
            { label: "Prepared by", value: getValueForLabel("Prepared by") },
            { label: "Date of Issue", value: getValueForLabel("Date of Issue") },
            { label: "Valid Till Date", value: getValueForLabel("Valid Till Date") },
          ]
            .filter((entry) => entry.value)
            .map((entry) => (
              <div
                key={entry.label}
                className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-solar-muted">{entry.label}</p>
                <p className="text-sm font-semibold text-solar-ink">{entry.value}</p>
              </div>
            ))}
        </div>

        {contacts.length > 0 && (
          <div className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-solar-muted">
              HTSS Contact Persons
            </p>
            <div className="mt-2 space-y-1 text-sm text-solar-ink">
              {contacts.map((contact) => (
                <p key={contact}>{contact}</p>
              ))}
            </div>
          </div>
        )}

        {executiveSummary.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-solar-ink">Executive Summary</h2>
            {executiveSummary.map((text) => (
              <p key={text} className="text-sm text-solar-muted leading-relaxed">
                {text}
              </p>
            ))}
          </section>
        )}

        {servicesSummary.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-solar-ink">Description of Services</h2>
            {servicesSummary.map((text) => (
              <p key={text} className="text-sm text-solar-muted leading-relaxed">
                {text}
              </p>
            ))}
          </section>
        )}

        {technicalTable.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-solar-ink">Technical Proposal</h2>
            <div className="overflow-auto rounded-xl border border-solar-border">
              <table className="min-w-full text-xs">
                <thead className="bg-solar-sand text-solar-ink">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Sr No</th>
                    <th className="px-3 py-2 text-left font-semibold">Parameter</th>
                    <th className="px-3 py-2 text-left font-semibold">Description</th>
                    <th className="px-3 py-2 text-left font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {technicalTable.map((row, index) => (
                    <tr key={index} className="border-t border-solar-border">
                      <td className="px-3 py-2 text-solar-muted">{row[0] || ""}</td>
                      <td className="px-3 py-2 text-solar-ink">{row[1] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[4] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[7] || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {boqTable.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-solar-ink">Bill of Quantities</h2>
            <div className="overflow-auto rounded-xl border border-solar-border">
              <table className="min-w-full text-xs">
                <thead className="bg-solar-sand text-solar-ink">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Sr No</th>
                    <th className="px-3 py-2 text-left font-semibold">Item Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Make</th>
                    <th className="px-3 py-2 text-left font-semibold">Description</th>
                    <th className="px-3 py-2 text-left font-semibold">Unit</th>
                    <th className="px-3 py-2 text-left font-semibold">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {boqTable.map((row, index) => (
                    <tr key={index} className="border-t border-solar-border">
                      <td className="px-3 py-2 text-solar-muted">{row[0] || ""}</td>
                      <td className="px-3 py-2 text-solar-ink">{row[1] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[3] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[5] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[8] || ""}</td>
                      <td className="px-3 py-2 text-solar-muted">{row[9] || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
