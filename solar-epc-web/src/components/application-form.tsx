"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
};

type Inquiry = {
  id: string;
  title: string;
};

type ApplicationFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function ApplicationForm({ onClose, onSuccess }: ApplicationFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    inquiryId: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    applicantAddress: "",
    consumerNumber: "",
    meterNumber: "",
    sanctionedLoad: "",
    connectionType: "RESIDENTIAL",
    roofType: "RCC",
    roofArea: "",
    systemCapacity: "",
    panelCount: "",
    inverterCapacity: "",
    notes: "",
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
      const res = await fetch("/api/application-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          inquiryId: formData.inquiryId || null,
          data: {
            applicantName: formData.applicantName,
            applicantEmail: formData.applicantEmail,
            applicantPhone: formData.applicantPhone,
            applicantAddress: formData.applicantAddress,
            consumerNumber: formData.consumerNumber,
            meterNumber: formData.meterNumber,
            sanctionedLoad: formData.sanctionedLoad,
            connectionType: formData.connectionType,
            roofType: formData.roofType,
            roofArea: formData.roofArea,
            systemCapacity: formData.systemCapacity,
            panelCount: formData.panelCount,
            inverterCapacity: formData.inverterCapacity,
            notes: formData.notes,
          },
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save application data. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar mx-4">
        <h2 className="text-xl font-semibold text-solar-ink">Application Data Entry</h2>
        <p className="mt-1 text-sm text-solar-muted">
          Enter customer application details for statutory document generation.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2">
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
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Inquiry/Project</label>
              <select
                value={formData.inquiryId}
                onChange={(e) => setFormData({ ...formData, inquiryId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              >
                <option value="">Select inquiry (optional)</option>
                {inquiries.map((inq) => (
                  <option key={inq.id} value={inq.id}>{inq.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-solar-border pt-4">
            <h3 className="text-sm font-semibold text-solar-ink mb-3">Applicant Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Full Name</label>
                <input
                  required
                  value={formData.applicantName}
                  onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Email</label>
                <input
                  type="email"
                  value={formData.applicantEmail}
                  onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Phone</label>
                <input
                  value={formData.applicantPhone}
                  onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Address</label>
                <input
                  value={formData.applicantAddress}
                  onChange={(e) => setFormData({ ...formData, applicantAddress: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="Villa 123, Al Qudra"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-solar-border pt-4">
            <h3 className="text-sm font-semibold text-solar-ink mb-3">Connection Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Consumer Number</label>
                <input
                  value={formData.consumerNumber}
                  onChange={(e) => setFormData({ ...formData, consumerNumber: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Meter Number</label>
                <input
                  value={formData.meterNumber}
                  onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="MTR-001234"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Sanctioned Load (kW)</label>
                <input
                  value={formData.sanctionedLoad}
                  onChange={(e) => setFormData({ ...formData, sanctionedLoad: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Connection Type</label>
                <select
                  value={formData.connectionType}
                  onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="INDUSTRIAL">Industrial</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-solar-border pt-4">
            <h3 className="text-sm font-semibold text-solar-ink mb-3">Site & System Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Roof Type</label>
                <select
                  value={formData.roofType}
                  onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                >
                  <option value="RCC">RCC</option>
                  <option value="METAL">Metal Sheet</option>
                  <option value="TILE">Tile</option>
                  <option value="GROUND">Ground Mount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Available Roof Area (sq ft)</label>
                <input
                  value={formData.roofArea}
                  onChange={(e) => setFormData({ ...formData, roofArea: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">System Capacity (kW)</label>
                <input
                  value={formData.systemCapacity}
                  onChange={(e) => setFormData({ ...formData, systemCapacity: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-solar-muted">Panel Count</label>
                <input
                  value={formData.panelCount}
                  onChange={(e) => setFormData({ ...formData, panelCount: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="24"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-solar-muted">Inverter Capacity (kW)</label>
                <input
                  value={formData.inverterCapacity}
                  onChange={(e) => setFormData({ ...formData, inverterCapacity: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-solar-muted">Notes/Remarks</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="Any additional notes..."
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
              {loading ? "Saving..." : "Save Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
