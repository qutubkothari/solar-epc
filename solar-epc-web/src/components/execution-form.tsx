"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  id: string;
  title: string;
};

type ExecutionFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function ExecutionForm({ onClose, onSuccess }: ExecutionFormProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    inquiryId: "",
    assetType: "PANEL",
    serialNo: "",
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
      const res = await fetch("/api/execution-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to capture serial");
      }
    } catch (error) {
      console.error(error);
      alert("Error capturing serial");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h2 className="text-xl font-semibold text-solar-ink">Add Serial</h2>
        <p className="mt-1 text-sm text-solar-muted">
          Record installation asset serial numbers.
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Asset Type</label>
              <select
                value={formData.assetType}
                onChange={(event) => setFormData({ ...formData, assetType: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option value="PANEL">Panel</option>
                <option value="INVERTER">Inverter</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Serial No</label>
              <input
                required
                value={formData.serialNo}
                onChange={(event) => setFormData({ ...formData, serialNo: event.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              />
            </div>
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
              {loading ? "Saving..." : "Save Serial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
