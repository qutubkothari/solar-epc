"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ApplicationForm } from "@/components/application-form";
import { ModalShell } from "@/components/modal-shell";

type ApplicationData = {
  id: string;
  clientId: string;
  data: {
    applicantName?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    applicantAddress?: string;
    consumerNumber?: string;
    meterNumber?: string;
    sanctionedLoad?: string;
    connectionType?: string;
    roofType?: string;
    roofArea?: string;
    systemCapacity?: string;
    panelCount?: string;
    inverterCapacity?: string;
  };
  client?: {
    name: string;
  };
  inquiry?: {
    id: string;
    title: string;
  };
  createdAt: string;
};

type Inquiry = {
  id: string;
  title: string;
};

type Template = {
  id: string;
  title: string;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [statutoryTemplates, setStatutoryTemplates] = useState<Template[]>([]);
  const [completionTemplates, setCompletionTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewApp, setViewApp] = useState<ApplicationData | null>(null);
  const [editingApp, setEditingApp] = useState<ApplicationData | null>(null);

  const fetchData = async () => {
    try {
      const [appRes, inqRes, statRes, compRes] = await Promise.all([
        fetch("/api/application-data"),
        fetch("/api/inquiries"),
        fetch("/api/statutory-docs/generate"),
        fetch("/api/completion-docs/generate"),
      ]);
      const [appData, inqData, statData, compData] = await Promise.all([
        appRes.json(),
        inqRes.json(),
        statRes.json(),
        compRes.json(),
      ]);
      setApplications(appData);
      setInquiries(inqData);
      setStatutoryTemplates(statData.templates || []);
      setCompletionTemplates(compData.templates || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateStatutoryDoc = async (templateType: string) => {
    if (!selectedInquiryId) return;
    setGenerating(templateType);
    try {
      const res = await fetch("/api/statutory-docs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: selectedInquiryId, templateType }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${templateType}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to generate document:", error);
    } finally {
      setGenerating(null);
    }
  };

  const generateCompletionDoc = async (templateType: string) => {
    if (!selectedInquiryId) return;
    setGenerating(templateType);
    try {
      const res = await fetch("/api/completion-docs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: selectedInquiryId, templateType }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${templateType}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to generate document:", error);
    } finally {
      setGenerating(null);
    }
  };

  const downloadClosurePack = async () => {
    if (!selectedInquiryId) return;
    setGenerating("closure-pack");
    try {
      const res = await fetch(`/api/closure-pack/${selectedInquiryId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Closure_Pack.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        // Send notification
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger: "CLOSURE_PACK_READY", inquiryId: selectedInquiryId }),
        });
      }
    } catch (error) {
      console.error("Failed to download closure pack:", error);
    } finally {
      setGenerating(null);
    }
  };

  const selectedApp = applications.find((a) => a.inquiry?.id === selectedInquiryId);

  const handleDeleteApplication = async (id: string) => {
    const confirmDelete = window.confirm("Delete this application data?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/application-data/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
      if (viewApp?.id === id) setViewApp(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Applications & Document Generation"
        subtitle="Enter application data and generate statutory/completion documents."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            New Application
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
            <h3 className="text-lg font-semibold text-solar-ink">Select Client Inquiry</h3>
            <p className="text-xs text-solar-muted mt-1 mb-3">
              Choose the client inquiry/project for document generation
            </p>
            <select
              value={selectedInquiryId}
              onChange={(e) => setSelectedInquiryId(e.target.value)}
              className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            >
              <option value="">Choose a client inquiry...</option>
              {inquiries.map((inq) => (
                <option key={inq.id} value={inq.id}>{inq.title}</option>
              ))}
            </select>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-900">📋 How to Use:</p>
              <ol className="text-xs text-amber-800 mt-2 space-y-1 ml-4 list-decimal">
                <li>Select a client inquiry from dropdown</li>
                <li>Add application data (consumer details, system specs)</li>
                <li>Generate statutory documents (DG NOC, Net Metering)</li>
                <li>Generate completion docs (commissioning certificates)</li>
              </ol>
            </div>
          </div>

          {selectedApp && (
            <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
              <h3 className="text-lg font-semibold text-solar-ink">Application Data</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-solar-muted">Applicant:</span><span className="font-semibold">{selectedApp.data.applicantName || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-solar-muted">Consumer No:</span><span className="font-semibold">{selectedApp.data.consumerNumber || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-solar-muted">System:</span><span className="font-semibold">{selectedApp.data.systemCapacity || "N/A"} kW</span></div>
                <div className="flex justify-between"><span className="text-solar-muted">Panels:</span><span className="font-semibold">{selectedApp.data.panelCount || "N/A"}</span></div>
              </div>
            </div>
          )}

          {!selectedApp && selectedInquiryId && (
            <div className="rounded-2xl border border-solar-border bg-solar-sand p-6">
              <p className="text-sm text-solar-muted">No application data for this project.</p>
              <button onClick={() => setShowForm(true)} className="mt-3 rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">Add Application Data</button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
            <h3 className="text-lg font-semibold text-solar-ink">Statutory Documents</h3>
            <p className="text-sm text-solar-muted mt-1">Generate compliant documents from templates.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {statutoryTemplates.map((t) => (
                <button key={t.id} onClick={() => generateStatutoryDoc(t.id)} disabled={!selectedInquiryId || generating === t.id} className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3 text-left text-sm font-semibold text-solar-ink transition hover:bg-solar-sky disabled:opacity-50">
                  {generating === t.id ? "Generating..." : t.title}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
            <h3 className="text-lg font-semibold text-solar-ink">Completion Documents</h3>
            <p className="text-sm text-solar-muted mt-1">Generate certificates and warranties.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {completionTemplates.map((t) => (
                <button key={t.id} onClick={() => generateCompletionDoc(t.id)} disabled={!selectedInquiryId || generating === t.id} className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3 text-left text-sm font-semibold text-solar-ink transition hover:bg-solar-sky disabled:opacity-50">
                  {generating === t.id ? "Generating..." : t.title}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-solar-forest bg-solar-forest/10 p-6">
            <h3 className="text-lg font-semibold text-solar-forest">Closure Pack</h3>
            <p className="text-sm text-solar-forest/80 mt-1">Download all documents as ZIP for client handover.</p>
            <button onClick={downloadClosurePack} disabled={!selectedInquiryId || generating === "closure-pack"} className="mt-4 w-full rounded-xl bg-solar-forest py-3 text-sm font-semibold text-white disabled:opacity-50">
              {generating === "closure-pack" ? "Preparing..." : "Download Closure Pack (ZIP)"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h3 className="text-lg font-semibold text-solar-ink">Recent Applications</h3>
        {loading ? (
          <div className="mt-4 text-center text-sm text-solar-muted">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="mt-4 text-center text-sm text-solar-muted">No applications yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-solar-border text-left text-solar-muted"><th className="pb-2 font-semibold">Project</th><th className="pb-2 font-semibold">Applicant</th><th className="pb-2 font-semibold">System</th><th className="pb-2 font-semibold">Created</th><th className="pb-2 font-semibold">Actions</th></tr></thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-solar-border/50">
                    <td className="py-3">{app.inquiry?.title || "Unassigned"}</td>
                    <td className="py-3">{app.data.applicantName || "N/A"}</td>
                    <td className="py-3">{app.data.systemCapacity || "N/A"} kW</td>
                    <td className="py-3 text-solar-muted">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setViewApp(app)}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingApp(app)}
                          className="rounded-lg border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
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
        <ApplicationForm onClose={() => setShowForm(false)} onSuccess={() => { fetchData(); setShowForm(false); }} />
      )}

      {editingApp && (
        <ApplicationForm
          applicationId={editingApp.id}
          initialData={{
            clientId: editingApp.clientId,
            inquiryId: editingApp.inquiry?.id || "",
            data: editingApp.data,
          }}
          onClose={() => setEditingApp(null)}
          onSuccess={() => {
            fetchData();
            setEditingApp(null);
          }}
        />
      )}

      {viewApp && (
        <ModalShell
          title="Application Details"
          subtitle={viewApp.inquiry?.title || "Unassigned"}
          onClose={() => setViewApp(null)}
          size="lg"
        >
          <div className="grid gap-2 text-sm text-solar-ink">
            <div className="flex justify-between"><span className="text-solar-muted">Applicant</span><span className="font-semibold">{viewApp.data.applicantName || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Email</span><span className="font-semibold">{viewApp.data.applicantEmail || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Phone</span><span className="font-semibold">{viewApp.data.applicantPhone || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Consumer No.</span><span className="font-semibold">{viewApp.data.consumerNumber || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Meter No.</span><span className="font-semibold">{viewApp.data.meterNumber || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">System Capacity</span><span className="font-semibold">{viewApp.data.systemCapacity || "N/A"} kW</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Panels</span><span className="font-semibold">{viewApp.data.panelCount || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-solar-muted">Inverter</span><span className="font-semibold">{viewApp.data.inverterCapacity || "N/A"} kW</span></div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
