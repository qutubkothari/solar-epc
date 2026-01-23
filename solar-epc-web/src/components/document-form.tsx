"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type Inquiry = {
  id: string;
  title: string;
};

type DocumentFormProps = {
  title: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: () => void;
  docId?: string;
  initialData?: {
    inquiryId: string;
    name: string;
    fileUrl: string;
  };
};

export function DocumentForm({ title, endpoint, onClose, onSuccess, docId, initialData }: DocumentFormProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    inquiryId: initialData?.inquiryId || "",
    name: initialData?.name || "",
    fileUrl: initialData?.fileUrl || "",
  });

  useEffect(() => {
    fetch("/api/inquiries")
      .then((res) => res.json())
      .then((data) => setInquiries(data))
      .catch(() => setInquiries([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(docId ? `${endpoint}/${docId}` : endpoint, {
        method: docId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save document. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={docId ? `Edit ${title}` : title}
      subtitle="Register generated documents for this project."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Inquiry</label>
            <select
              required
              value={formData.inquiryId}
              onChange={(event) => setFormData({ ...formData, inquiryId: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            >
              <option value="">Select inquiry</option>
              {inquiries.map((inquiry) => (
                <option key={inquiry.id} value={inquiry.id}>
                  {inquiry.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Document Name</label>
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., DG NOC"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">File URL</label>
            <input
              required
              value={formData.fileUrl}
              onChange={(event) => setFormData({ ...formData, fileUrl: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="https://..."
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-solar-amber py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : docId ? "Save Document" : "Save Document"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
