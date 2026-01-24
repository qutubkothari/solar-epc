"use client";

import { useEffect, useState, use } from "react";
import { SectionHeader } from "@/components/section-header";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  status?: string | null;
  lastContactDate?: string | null;
  nextFollowupDate?: string | null;
  followupNotes?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  taxId?: string | null;
  inquiries?: any[];
  quotations?: any[];
  technicalProposals?: any[];
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

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [followupDate, setFollowupDate] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");
  const [savingFollowup, setSavingFollowup] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const data = await res.json();
      setClient(data);
      setFollowupDate(data.nextFollowupDate?.split('T')[0] || "");
      setFollowupNotes(data.followupNotes || "");
    } catch (error) {
      console.error("Failed to fetch client:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFollowup = async () => {
    setSavingFollowup(true);
    try {
      await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactDate: new Date().toISOString(),
          nextFollowupDate: followupDate ? new Date(followupDate).toISOString() : null,
          followupNotes,
        }),
      });
      fetchClient();
    } catch (error) {
      console.error("Failed to update follow-up:", error);
    } finally {
      setSavingFollowup(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchClient();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center">Client not found</div>;
  }

  const inquiryCount = client.inquiries?.length || 0;
  const quotationCount = client.quotations?.length || 0;
  const proposalCount = client.technicalProposals?.length || 0;
  const isFollowupDue = client.nextFollowupDate && new Date(client.nextFollowupDate) <= new Date();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={client.name}
        subtitle={client.contactName || ""}
        action={
          <Link
            href="/clients"
            className="rounded-xl bg-solar-forest px-4 py-2 text-sm font-semibold text-white"
          >
            ← Back to Clients
          </Link>
        }
      />

      {/* Status & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-solar-border bg-white p-4 shadow-solar">
          <div className="text-xs text-solar-muted mb-1">Status</div>
          <select
            value={client.status || "Lead"}
            onChange={(e) => updateStatus(e.target.value)}
            className={`w-full text-sm font-semibold px-2 py-1 rounded ${
              STATUS_COLORS[client.status || "Lead"] || "bg-gray-100 text-gray-800"
            }`}
          >
            <option value="Lead">Lead</option>
            <option value="Qualified">Qualified</option>
            <option value="Quoted">Quoted</option>
            <option value="Approved">Approved</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
        <div className="rounded-xl border border-solar-border bg-white p-4 shadow-solar">
          <div className="text-xs text-solar-muted">Inquiries</div>
          <div className="text-2xl font-bold text-solar-ink">{inquiryCount}</div>
        </div>
        <div className="rounded-xl border border-solar-border bg-white p-4 shadow-solar">
          <div className="text-xs text-solar-muted">Quotations</div>
          <div className="text-2xl font-bold text-solar-ink">{quotationCount}</div>
        </div>
        <div className="rounded-xl border border-solar-border bg-white p-4 shadow-solar">
          <div className="text-xs text-solar-muted">Proposals</div>
          <div className="text-2xl font-bold text-solar-ink">{proposalCount}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Left Column - Activity */}
        <div className="space-y-6">
          {/* Inquiries */}
          {inquiryCount > 0 && (
            <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
              <h3 className="text-lg font-semibold text-solar-ink mb-4">📞 Inquiries ({inquiryCount})</h3>
              <div className="space-y-2">
                {client.inquiries?.map((inq: any) => (
                  <div key={inq.id} className="flex justify-between items-center p-3 rounded-lg bg-solar-sand hover:bg-solar-sky transition">
                    <div>
                      <div className="font-semibold text-sm">{inq.title}</div>
                      <div className="text-xs text-solar-muted">{inq.siteAddress || "No site address"}</div>
                    </div>
                    <div className="text-xs">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">{inq.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quotations */}
          {quotationCount > 0 && (
            <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
              <h3 className="text-lg font-semibold text-solar-ink mb-4">💰 Quotations ({quotationCount})</h3>
              <div className="space-y-3">
                {client.quotations?.map((quot: any) => {
                  const latestVersion = quot.versions?.[0];
                  return (
                    <div key={quot.id} className="rounded-lg border border-solar-border overflow-hidden">
                      <div className="flex justify-between items-center p-3 bg-solar-sand">
                        <div>
                          <div className="font-semibold text-sm text-solar-ink">{quot.title}</div>
                          <div className="text-xs text-solar-muted">
                            {quot.versions?.length || 0} version(s) • Status: {quot.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-solar-forest">
                            ₹{Number(latestVersion?.grandTotal || 0).toLocaleString()}
                          </div>
                          <Link
                            href="/quotations"
                            className="text-xs text-solar-amber hover:underline"
                          >
                            Open in Quotations →
                          </Link>
                        </div>
                      </div>
                      {/* Version list */}
                      {quot.versions?.length > 0 && (
                        <div className="p-2 bg-white">
                          {quot.versions.map((ver: any) => (
                            <div key={ver.id} className="flex justify-between items-center px-2 py-1 text-xs text-solar-muted">
                              <span>v{ver.version} {ver.isFinal ? "(Final)" : ""}</span>
                              <span>₹{Number(ver.grandTotal || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Proposals */}
          {proposalCount > 0 && (
            <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
              <h3 className="text-lg font-semibold text-solar-ink mb-4">📋 Technical Proposals ({proposalCount})</h3>
              <div className="space-y-2">
                {client.technicalProposals?.map((prop: any) => (
                  <div key={prop.id} className="flex justify-between items-center p-3 rounded-lg bg-solar-sand hover:bg-solar-sky transition">
                    <div>
                      <div className="font-semibold text-sm">{prop.proposalNumber}</div>
                      <div className="text-xs text-solar-muted">
                        {prop.systemCapacity} kWp | {prop.siteAddress}
                      </div>
                    </div>
                    <div className="text-xs text-green-800">
                      ₹{Number(prop.netCost || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inquiryCount === 0 && quotationCount === 0 && proposalCount === 0 && (
            <div className="rounded-2xl border border-solar-border bg-solar-sand p-8 text-center">
              <p className="text-solar-muted">No inquiries, quotations, or proposals yet.</p>
              <Link
                href={`/inquiries?clientId=${client.id}`}
                className="mt-4 inline-block rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
              >
                Create First Inquiry
              </Link>
            </div>
          )}
        </div>

        {/* Right Column - Contact & Follow-up */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
            <h3 className="text-lg font-semibold text-solar-ink mb-4">📞 Contact Info</h3>
            <div className="space-y-3 text-sm">
              {client.email && (
                <div>
                  <div className="text-xs text-solar-muted">Email</div>
                  <a href={`mailto:${client.email}`} className="text-solar-amber hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div>
                  <div className="text-xs text-solar-muted">Phone</div>
                  <a href={`tel:${client.phone}`} className="text-solar-amber hover:underline">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.mobile && (
                <div>
                  <div className="text-xs text-solar-muted">Mobile</div>
                  <a href={`tel:${client.mobile}`} className="text-solar-amber hover:underline">
                    {client.mobile}
                  </a>
                </div>
              )}
              {client.address && (
                <div>
                  <div className="text-xs text-solar-muted">Address</div>
                  <div className="text-solar-ink">
                    {client.address}
                    {client.city && `, ${client.city}`}
                    {client.state && `, ${client.state}`}
                  </div>
                </div>
              )}
              {client.taxId && (
                <div>
                  <div className="text-xs text-solar-muted">GST Number</div>
                  <div className="font-mono text-solar-ink">{client.taxId}</div>
                </div>
              )}
            </div>
          </div>

          {/* Follow-up */}
          <div className={`rounded-2xl border ${isFollowupDue ? 'border-red-500 bg-red-50' : 'border-solar-border bg-white'} p-6 shadow-solar`}>
            <h3 className="text-lg font-semibold text-solar-ink mb-4">
              🔔 Follow-up {isFollowupDue && <span className="text-xs text-red-600">(DUE!)</span>}
            </h3>
            
            {client.lastContactDate && (
              <div className="mb-4 text-xs text-solar-muted">
                Last Contact: {new Date(client.lastContactDate).toLocaleDateString()}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-solar-muted mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-solar-muted mb-1">
                  Follow-up Notes
                </label>
                <textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="Next action items, discussion points..."
                />
              </div>

              <button
                onClick={updateFollowup}
                disabled={savingFollowup}
                className="w-full rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingFollowup ? "Saving..." : "Update Follow-up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
