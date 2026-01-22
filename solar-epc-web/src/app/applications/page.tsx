"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { DocumentForm } from "@/components/document-form";

type StatutoryDoc = {
  id: string;
  name: string;
  fileUrl: string;
  inquiry?: {
    title: string;
  };
};

export default function ApplicationsPage() {
  const [docs, setDocs] = useState<StatutoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/statutory-docs");
      const data = await res.json();
      setDocs(data);
    } catch (error) {
      console.error("Failed to fetch statutory docs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Applications & Statutory Docs"
        subtitle="Auto-fill client templates and generate compliant PDFs."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Generate Pack
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        {loading ? (
          <div className="text-center text-sm text-solar-muted">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-center text-sm text-solar-muted">
            No statutory documents yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-solar-border bg-solar-sand p-4"
              >
                <p className="text-sm font-semibold text-solar-ink">{doc.name}</p>
                <p className="text-xs text-solar-muted mt-2">
                  Project: {doc.inquiry?.title || "Unassigned"}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                  Generated
                </span>
                <button
                  onClick={() => window.open(doc.fileUrl, "_blank")}
                  className="mt-4 w-full rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink"
                >
                  View PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DocumentForm
          title="Add Statutory Document"
          endpoint="/api/statutory-docs"
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchDocs();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
