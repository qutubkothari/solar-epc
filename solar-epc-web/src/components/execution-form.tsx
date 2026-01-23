"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type Inquiry = {
  id: string;
  title: string;
};

type ExecutionFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  assetId?: string;
  initialData?: {
    inquiryId: string;
    assetType: string;
    serialNo: string;
  };
};

export function ExecutionForm({ onClose, onSuccess, assetId, initialData }: ExecutionFormProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    inquiryId: initialData?.inquiryId || "",
    assetType: initialData?.assetType || "PANEL",
    serialNo: initialData?.serialNo || "",
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
      const res = await fetch(assetId ? `/api/execution-assets/${assetId}` : "/api/execution-assets", {
        method: assetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save serial. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the serial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={assetId ? "Edit Serial" : "Add Serial"}
      subtitle="Record installation asset serial numbers."
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
              {loading ? "Saving..." : assetId ? "Save Serial" : "Save Serial"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
