"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { DocumentForm } from "@/components/document-form";
import { formatDate } from "@/lib/format";

type CompletionDoc = {
  id: string;
  inquiryId: string;
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
  const [editingPack, setEditingPack] = useState<CompletionDoc | null>(null);

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

  const handleDeleteDoc = async (id: string) => {
    const confirmDelete = window.confirm("Delete this completion document?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/completion-docs/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchDocs();
    }
  };

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
                  <button
                    onClick={() => setEditingPack(pack)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(pack.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    Delete
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

      {editingPack && (
        <DocumentForm
          title="Edit Completion Document"
          endpoint="/api/completion-docs"
          docId={editingPack.id}
          initialData={{
            inquiryId: editingPack.inquiryId,
            name: editingPack.name,
            fileUrl: editingPack.fileUrl,
          }}
          onClose={() => setEditingPack(null)}
          onSuccess={() => {
            fetchDocs();
            setEditingPack(null);
          }}
        />
      )}
    </div>
  );
}
