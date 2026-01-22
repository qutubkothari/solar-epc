"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ExecutionForm } from "@/components/execution-form";

type Asset = {
  id: string;
  serialNo: string;
  assetType: string;
  inquiry?: {
    title: string;
  };
};

export default function ExecutionPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Execution & Serial Capture"
        subtitle="Capture panel and inverter serials via barcode scan or manual entry."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Add Serial
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
          <h3 className="text-lg font-semibold text-solar-ink">Quick Capture</h3>
          <p className="text-sm text-solar-muted mt-1">
            Use barcode scanners or manual entry to store assets.
          </p>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="Scan or enter serial number"
            />
            <div className="flex gap-2">
              {[
                "Panel",
                "Inverter",
                "Other",
              ].map((type) => (
                <button
                  key={type}
                  className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink"
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
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
                      {asset.assetType} • {asset.inquiry?.title || "Unassigned"}
                    </p>
                  </div>
                  <span className="rounded-full bg-solar-sky px-3 py-1 text-xs font-semibold text-solar-forest">
                    Captured
                  </span>
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
    </div>
  );
}
