"use client";

import { useState } from "react";
import { ModalShell } from "@/components/modal-shell";

type ClientFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  initialData?: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    phoneAlt?: string | null;
    mobile?: string | null;
    website?: string | null;
    industry?: string | null;
    companyType?: string | null;
    taxId?: string | null;
    registrationNo?: string | null;
    address?: string | null;
    billingAddress?: string | null;
    shippingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    currency?: string | null;
    creditLimit?: number | null;
    paymentTerms?: string | null;
    accountManager?: string | null;
    status?: string | null;
    notes?: string | null;
  };
};

export function ClientForm({ onClose, onSuccess, clientId, initialData }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    contactName: initialData?.contactName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    phoneAlt: initialData?.phoneAlt || "",
    mobile: initialData?.mobile || "",
    website: initialData?.website || "",
    industry: initialData?.industry || "",
    companyType: initialData?.companyType || "",
    taxId: initialData?.taxId || "",
    registrationNo: initialData?.registrationNo || "",
    address: initialData?.address || "",
    billingAddress: initialData?.billingAddress || "",
    shippingAddress: initialData?.shippingAddress || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    country: initialData?.country || "",
    postalCode: initialData?.postalCode || "",
    currency: initialData?.currency || "INR",
    creditLimit: initialData?.creditLimit?.toString() || "",
    paymentTerms: initialData?.paymentTerms || "",
    accountManager: initialData?.accountManager || "",
    status: initialData?.status || "ACTIVE",
    notes: initialData?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(clientId ? `/api/clients/${clientId}` : "/api/clients", {
        method: clientId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          creditLimit: formData.creditLimit ? Number(formData.creditLimit) : null,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save client. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={clientId ? "Edit Client" : "Add New Client"}
      subtitle="Maintain enterprise client profiles, contacts, and billing info."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-solar-border bg-solar-sand/60 p-4">
            <h3 className="text-sm font-semibold text-solar-ink">Company Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Company Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="e.g., Meraas Holdings"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Company Type</label>
                <input
                  type="text"
                  value={formData.companyType}
                  onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="LLC, Government, Private"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Real Estate, Hospitality"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Tax/VAT ID</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Registration No.</label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-solar-border bg-solar-sand/60 p-4">
            <h3 className="text-sm font-semibold text-solar-ink">Primary Contact</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Alternate Phone</label>
                <input
                  type="tel"
                  value={formData.phoneAlt}
                  onChange={(e) => setFormData({ ...formData, phoneAlt: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Account Manager</label>
                <input
                  type="text"
                  value={formData.accountManager}
                  onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-solar-border bg-solar-sand/60 p-4">
            <h3 className="text-sm font-semibold text-solar-ink">Addresses</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Primary Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Billing Address</label>
                <textarea
                  rows={2}
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Shipping Address</label>
                <textarea
                  rows={2}
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-solar-ink">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-solar-ink">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-solar-ink">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-solar-ink">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-solar-border bg-solar-sand/60 p-4">
            <h3 className="text-sm font-semibold text-solar-ink">Financials & Terms</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Currency</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="INR"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Net 30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-solar-ink">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
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
              {loading ? "Saving..." : clientId ? "Save Client" : "Create Client"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
