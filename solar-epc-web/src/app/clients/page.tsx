"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ClientForm } from "@/components/client-form";
import { ModalShell } from "@/components/modal-shell";
import Link from "next/link";

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
  lastContactDate?: string | null;
  nextFollowupDate?: string | null;
  followupNotes?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  Lead: "bg-blue-100 text-blue-800",
  Qualified: "bg-purple-100 text-purple-800",
  Quoted: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  "In Progress": "bg-orange-100 text-orange-800",
  Completed: "bg-teal-100 text-teal-800",
  Lost: "bg-red-100 text-red-800",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followupFilter, setFollowupFilter] = useState("all");
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
    let result = clients;
    
    // Text search
    if (search) {
      result = result.filter((client) => {
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
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((client) => client.status === statusFilter);
    }
    
    // Follow-up filter
    if (followupFilter === "due") {
      result = result.filter((client) => {
        if (!client.nextFollowupDate) return false;
        return new Date(client.nextFollowupDate) <= new Date();
      });
    } else if (followupFilter === "upcoming") {
      result = result.filter((client) => {
        if (!client.nextFollowupDate) return false;
        const followupDate = new Date(client.nextFollowupDate);
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return followupDate > today && followupDate <= weekFromNow;
      });
    }
    
    return result;
  }, [clients, query, statusFilter, followupFilter]);

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
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            className="flex-1 min-w-[200px] rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search clients..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="Lead">Lead</option>
            <option value="Qualified">Qualified</option>
            <option value="Quoted">Quoted</option>
            <option value="Approved">Approved</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Lost">Lost</option>
          </select>
          
          <select
            value={followupFilter}
            onChange={(e) => setFollowupFilter(e.target.value)}
            className="rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Follow-ups</option>
            <option value="due">Due Now</option>
            <option value="upcoming">This Week</option>
          </select>
          
          <div className="text-sm text-solar-muted">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </div>
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
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const isFollowupDue = client.nextFollowupDate && new Date(client.nextFollowupDate) <= new Date();
                  
                  return (
                    <tr key={client.id} className={`border-t border-solar-border ${isFollowupDue ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`} className="font-semibold text-solar-amber hover:underline">
                          {client.name}
                        </Link>
                        {client.contactName && (
                          <div className="text-xs text-solar-muted">{client.contactName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-solar-muted text-xs">
                        {client.email && <div>{client.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-solar-muted text-xs">
                        {client.mobile || client.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${STATUS_COLORS[client.status || 'Lead'] || 'bg-gray-100 text-gray-800'}`}>
                          {client.status || "Lead"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {client.nextFollowupDate ? (
                          <div className={`text-xs ${isFollowupDue ? 'text-red-600 font-semibold' : 'text-solar-muted'}`}>
                            {isFollowupDue && '🔔 '}
                            {new Date(client.nextFollowupDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs text-solar-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-xs text-solar-amber hover:underline"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setShowForm(true);
                            }}
                            className="text-xs text-solar-ink hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-xs text-red-600 hover:underline"
                        </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
