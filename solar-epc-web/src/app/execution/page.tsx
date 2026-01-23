"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ExecutionForm } from "@/components/execution-form";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ModalShell } from "@/components/modal-shell";

type Asset = {
  id: string;
  serialNo: string;
  assetType: string;
  inquiryId?: string;
  inquiry?: {
    title: string;
  };
};

type Inquiry = {
  id: string;
  title: string;
};

export default function ExecutionPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [quickSerial, setQuickSerial] = useState("");
  const [quickType, setQuickType] = useState("PANEL");
  const [quickInquiryId, setQuickInquiryId] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/execution-assets");
      const data = await res.json();
      setAssets(data);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetch("/api/inquiries")
      .then((res) => res.json())
      .then((data) => setInquiries(data))
      .catch(() => setInquiries([]));
  }, []);

  const handleQuickSave = async () => {
    if (!quickSerial || !quickInquiryId) return;
    const res = await fetch("/api/execution-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: quickInquiryId,
        assetType: quickType,
        serialNo: quickSerial,
      }),
    });
    if (res.ok) {
      setQuickSerial("");
      fetchAssets();
    }
  };

  const handleBarcodeScan = async (serialNumber: string) => {
    if (!quickInquiryId) {
      alert("Please select an inquiry first");
      return;
    }
    const res = await fetch("/api/execution-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: quickInquiryId,
        assetType: quickType,
        serialNo: serialNumber,
      }),
    });
    if (res.ok) {
      setScanCount((prev) => prev + 1);
      fetchAssets();
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const confirmDelete = window.confirm("Delete this captured serial?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/execution-assets/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchAssets();
      if (viewAsset?.id === id) setViewAsset(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Execution & Serial Capture"
        subtitle="Capture panel and inverter serials via barcode scan or manual entry."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="rounded-xl border border-solar-amber bg-white px-4 py-2 text-sm font-semibold text-solar-amber"
            >
              📷 Scan Barcode
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
            >
              Add Serial
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Quick Capture</h3>
          <p className="text-sm text-solar-muted mt-1">
            Use barcode scanners or manual entry to store assets.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={quickInquiryId}
              onChange={(event) => setQuickInquiryId(event.target.value)}
              className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            >
              <option value="">Select inquiry</option>
              {inquiries.map((inquiry) => (
                <option key={inquiry.id} value={inquiry.id}>
                  {inquiry.title}
                </option>
              ))}
            </select>
            <input
              value={quickSerial}
              onChange={(event) => setQuickSerial(event.target.value)}
              className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="Scan or enter serial number"
            />
            <div className="flex gap-2">
              {[
                { label: "Panel", value: "PANEL" },
                { label: "Inverter", value: "INVERTER" },
                { label: "Other", value: "OTHER" },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setQuickType(type.value)}
                  className={`flex-1 rounded-xl border border-solar-border py-2 text-xs font-semibold ${
                    quickType === type.value
                      ? "bg-solar-amber text-white"
                      : "bg-white text-solar-ink"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleQuickSave}
              className="w-full rounded-xl bg-solar-forest py-2 text-sm font-semibold text-white"
            >
              Save Serial
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Recent Captures</h3>
          {loading ? (
            <div className="mt-4 text-center text-sm text-solar-muted">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="mt-4 text-center text-sm text-solar-muted">
              No serials captured yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-solar-ink">
                      {asset.serialNo}
                    </p>
                    <p className="text-xs text-solar-muted">
                      {asset.assetType}  {asset.inquiry?.title || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                      Captured
                    </span>
                    <button
                      onClick={() => setViewAsset(asset)}
                      className="rounded-xl border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="rounded-xl border border-solar-border bg-white px-3 py-1 text-xs font-semibold text-solar-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ExecutionForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchAssets();
            setShowForm(false);
          }}
        />
      )}

      {editingAsset && (
        <ExecutionForm
          assetId={editingAsset.id}
          initialData={{
            inquiryId: editingAsset.inquiryId || "",
            assetType: editingAsset.assetType,
            serialNo: editingAsset.serialNo,
          }}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            fetchAssets();
            setEditingAsset(null);
          }}
        />
      )}

      {viewAsset && (
        <ModalShell
          title="Asset Details"
          subtitle={viewAsset.serialNo}
          onClose={() => setViewAsset(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Type</span>
              <span className="font-semibold">{viewAsset.assetType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Project</span>
              <span className="font-semibold">{viewAsset.inquiry?.title || "Unassigned"}</span>
            </div>
          </div>
        </ModalShell>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => {
            setShowScanner(false);
            setScanCount(0);
          }}
        />
      )}
    </div>
  );
}
