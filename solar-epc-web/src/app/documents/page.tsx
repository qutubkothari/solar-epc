"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { DocumentForm } from "@/components/document-form";
import { formatDate } from "@/lib/format";

type CompletionDoc = {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: string;
  inquiry?: {
    title: string;
  };
};

export default function DocumentsPage() {
  const [packs, setPacks] = useState<CompletionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/completion-docs");
      const data = await res.json();
      setPacks(data);
    } catch (error) {
      console.error("Failed to fetch completion docs:", error);
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
        title="Completion & Closure Pack"
        subtitle="Generate and bundle statutory PDFs for client handover."
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
        ) : packs.length === 0 ? (
          <div className="text-center text-sm text-solar-muted">
            No completion documents yet.
          </div>
        ) : (
          <div className="space-y-4">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">{pack.name}</p>
                  <p className="text-xs text-solar-muted">
                    Project: {pack.inquiry?.title || "Unassigned"} • Updated {formatDate(pack.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                    Ready
                  </span>
                  <button
                    onClick={() => window.open(pack.fileUrl, "_blank")}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    View Pack
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DocumentForm
          title="Add Completion Document"
          endpoint="/api/completion-docs"
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
