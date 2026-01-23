"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/modal-shell";

type Client = {
  id: string;
  name: string;
};

type InquiryFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  inquiryId?: string;
  initialData?: {
    clientId: string;
    title: string;
    notes?: string | null;
    siteAddress?: string | null;
  };
};

export function InquiryForm({ onClose, onSuccess, inquiryId, initialData }: InquiryFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: initialData?.clientId || "",
    title: initialData?.title || "",
    notes: initialData?.notes || "",
    siteAddress: initialData?.siteAddress || "",
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(inquiryId ? `/api/inquiries/${inquiryId}` : "/api/inquiries", {
        method: inquiryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save inquiry. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the inquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={inquiryId ? "Edit Inquiry" : "Create New Inquiry"}
      subtitle="Capture client request and site details."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Client</label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Al Qudra Villas Solar Installation"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Site Address</label>
            <input
              type="text"
              value={formData.siteAddress}
              onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Al Qudra, Dubai"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="Additional remarks..."
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
              {loading ? "Saving..." : inquiryId ? "Save Inquiry" : "Create Inquiry"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
