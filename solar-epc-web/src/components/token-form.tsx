"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type Client = {
  id: string;
  name: string;
};

type Inquiry = {
  id: string;
  title: string;
};

type TokenFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  tokenId?: string;
  initialData?: {
    clientId: string;
    inquiryId: string;
    expiresAt?: string | null;
    allowDownload?: boolean;
  };
};

export function TokenForm({ onClose, onSuccess, tokenId, initialData }: TokenFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: initialData?.clientId || "",
    inquiryId: initialData?.inquiryId || "",
    expiresAt: initialData?.expiresAt ? initialData.expiresAt.slice(0, 10) : "",
    allowDownload: initialData?.allowDownload ?? true,
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));

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
      const res = await fetch(tokenId ? `/api/tokens/${tokenId}` : "/api/tokens", {
        method: tokenId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save token. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={tokenId ? "Edit Token" : "Generate Token"}
      subtitle="Create secure access link for client documents."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Client</label>
            <select
              required
              value={formData.clientId}
              onChange={(event) => setFormData({ ...formData, clientId: event.target.value })}
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Expiry Date</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(event) => setFormData({ ...formData, expiresAt: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="allowDownload"
                type="checkbox"
                checked={formData.allowDownload}
                onChange={(event) => setFormData({ ...formData, allowDownload: event.target.checked })}
              />
              <label htmlFor="allowDownload" className="text-sm text-solar-ink">
                Allow download
              </label>
            </div>
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
              {loading ? "Saving..." : tokenId ? "Save Token" : "Generate Token"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
