"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ClientForm } from "@/components/client-form";
import { ModalShell } from "@/components/modal-shell";

type Client = {
  id: string;
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) => {
      return [
        client.name,
        client.contactName,
        client.email,
        client.phone,
        client.mobile,
        client.companyType,
        client.industry,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [clients, query]);

  const handleDeleteClient = async (id: string) => {
    const confirmDelete = window.confirm("Delete this client?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchClients();
      if (viewClient?.id === id) setViewClient(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Client Management"
        subtitle="Maintain enterprise client profiles, billing data, and contacts."
        action={
          <button
            onClick={() => {
              setEditingClient(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Add Client
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search clients"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="mt-6 text-center text-sm text-solar-muted">Loading...</div>
        ) : filteredClients.length === 0 ? (
          <div className="mt-6 text-center text-sm text-solar-muted">
            No clients found.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-solar-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-solar-sand text-xs uppercase tracking-wider text-solar-muted">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Primary Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t border-solar-border">
                    <td className="px-4 py-3 font-medium text-solar-ink">
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-solar-muted">
                      {client.contactName || "—"}
                    </td>
                    <td className="px-4 py-3 text-solar-muted">
                      {client.mobile || client.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-solar-muted">
                      {client.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                        {client.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setViewClient(client)}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setShowForm(true);
                          }}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ClientForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchClients();
            setShowForm(false);
          }}
          clientId={editingClient?.id}
          initialData={editingClient ?? undefined}
        />
      )}

      {viewClient && (
        <ModalShell
          title="Client Details"
          subtitle={viewClient.name}
          onClose={() => setViewClient(null)}
          size="lg"
        >
          <div className="grid gap-3 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Contact</span>
              <span className="font-semibold">{viewClient.contactName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Email</span>
              <span className="font-semibold">{viewClient.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Phone</span>
              <span className="font-semibold">{viewClient.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Mobile</span>
              <span className="font-semibold">{viewClient.mobile || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Industry</span>
              <span className="font-semibold">{viewClient.industry || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Website</span>
              <span className="font-semibold">{viewClient.website || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">GST Number</span>
              <span className="font-semibold">{viewClient.taxId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Registration No.</span>
              <span className="font-semibold">{viewClient.registrationNo || "—"}</span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-solar-muted">Addresses</p>
              <p className="text-sm text-solar-ink">{viewClient.address || "—"}</p>
              <p className="text-sm text-solar-ink">Billing: {viewClient.billingAddress || "—"}</p>
              <p className="text-sm text-solar-ink">Shipping: {viewClient.shippingAddress || "—"}</p>
            </div>
            <div className="pt-2">
              <p className="text-xs text-solar-muted">Notes</p>
              <p className="text-sm text-solar-ink">{viewClient.notes || "—"}</p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
