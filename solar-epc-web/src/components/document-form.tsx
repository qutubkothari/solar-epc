"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  id: string;
  title: string;
};

type DocumentFormProps = {
  title: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DocumentForm({ title, endpoint, onClose, onSuccess }: DocumentFormProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    inquiryId: "",
    name: "",
    fileUrl: "",
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

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to create document");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h2 className="text-xl font-semibold text-solar-ink">{title}</h2>
        <p className="mt-1 text-sm text-solar-muted">
          Register generated documents for this project.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              {loading ? "Saving..." : "Save Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
