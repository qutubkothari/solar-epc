"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/section-header";
import { InquiryForm } from "@/components/inquiry-form";
import { ClientForm } from "@/components/client-form";

type Inquiry = {
  id: string;
  title: string;
  siteAddress: string | null;
  status: string;
  client: {
    name: string;
  };
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inquiry Management"
        subtitle="Capture new client requests and manage site media uploads."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowClientForm(true)}
              className="rounded-xl border border-solar-border bg-white px-4 py-2 text-sm font-semibold text-solar-ink"
            >
              Add Client
            </button>
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
              onClick={() => alert("PDF export will be available after template upload.")}
              className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink"
            >
              Export PDF
            </button>
            <button
              onClick={() => alert("Media upload will be enabled in the next phase.")}
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

      {showClientForm && (
        <ClientForm
          onClose={() => setShowClientForm(false)}
          onSuccess={() => setShowClientForm(false)}
        />
      )}
    </div>
  );
}
