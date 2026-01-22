"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
};

type QuotationFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function QuotationForm({ onClose, onSuccess }: QuotationFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to create quotation");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h2 className="text-xl font-semibold text-solar-ink">New Quotation</h2>
        <p className="mt-1 text-sm text-solar-muted">
          Start a new quotation version for the selected client.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <label className="block text-sm font-semibold text-solar-ink">Title</label>
            <input
              required
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Al Qudra Villas Quotation"
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
              {loading ? "Creating..." : "Create Quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
