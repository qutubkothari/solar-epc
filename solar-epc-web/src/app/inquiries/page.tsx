"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/section-header";
import { InquiryForm } from "@/components/inquiry-form";
import { MediaForm } from "@/components/media-form";
import { ModalShell } from "@/components/modal-shell";

type Inquiry = {
  id: string;
  title: string;
  siteAddress: string | null;
  status: string;
  notes?: string | null;
  clientId?: string;
  client: {
    name: string;
  };
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);

  const fetchInquiries = async () => {
    try {
      const res = await fetch("/api/inquiries");
      const data = await res.json();
      setInquiries(data);
    } catch (error) {
      console.error("Failed to fetch inquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleExport = () => {
    const headers = ["Title", "Client", "Site", "Status"];
    const rows = inquiries.map((inquiry) => [
      inquiry.title,
      inquiry.client.name,
      inquiry.siteAddress || "",
      inquiry.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inquiries-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDeleteInquiry = async (id: string) => {
    const confirmDelete = window.confirm("Delete this inquiry and all related data?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchInquiries();
      if (viewInquiry?.id === id) setViewInquiry(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inquiry Management"
        subtitle="Capture new client requests and manage site media uploads."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowInquiryForm(true)}
              className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
            >
              New Inquiry
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search inquiries"
          />
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink"
            >
              Export List
            </button>
            <button
              onClick={() => setShowMediaForm(true)}
              className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink"
            >
              Upload Media
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-center text-sm text-solar-muted">Loading...</div>
        ) : inquiries.length === 0 ? (
          <div className="mt-6 text-center text-sm text-solar-muted">
            No inquiries yet. Create your first inquiry to get started.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-solar-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-solar-sand text-xs uppercase tracking-wider text-solar-muted">
                <tr>
                  <th className="px-4 py-3">Inquiry Title</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="border-t border-solar-border">
                    <td className="px-4 py-3 font-medium text-solar-ink">
                      {inquiry.title}
                    </td>
                    <td className="px-4 py-3 text-solar-muted">{inquiry.client.name}</td>
                    <td className="px-4 py-3 text-solar-muted">{inquiry.siteAddress || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setViewInquiry(inquiry)}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingInquiry(inquiry)}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteInquiry(inquiry.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInquiryForm && (
        <InquiryForm
          onClose={() => setShowInquiryForm(false)}
          onSuccess={() => {
            fetchInquiries();
            setShowInquiryForm(false);
          }}
        />
      )}

      {editingInquiry && (
        <InquiryForm
          inquiryId={editingInquiry.id}
          initialData={{
            clientId: editingInquiry.clientId || "",
            title: editingInquiry.title,
            notes: editingInquiry.notes || "",
            siteAddress: editingInquiry.siteAddress || "",
          }}
          onClose={() => setEditingInquiry(null)}
          onSuccess={() => {
            fetchInquiries();
            setEditingInquiry(null);
          }}
        />
      )}

      {showMediaForm && (
        <MediaForm
          onClose={() => setShowMediaForm(false)}
          onSuccess={() => setShowMediaForm(false)}
        />
      )}

      {viewInquiry && (
        <ModalShell
          title="Inquiry Details"
          subtitle={viewInquiry.title}
          onClose={() => setViewInquiry(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Client</span>
              <span className="font-semibold">{viewInquiry.client.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Site</span>
              <span className="font-semibold">{viewInquiry.siteAddress || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Status</span>
              <span className="font-semibold">{viewInquiry.status}</span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-solar-muted">Notes</p>
              <p className="text-sm text-solar-ink">{viewInquiry.notes || "—"}</p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
