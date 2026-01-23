"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { TechnicalProposalForm } from "@/components/technical-proposal-form";
import { ProposalCharts } from "@/components/proposal-charts";
import { formatCurrency, formatDate } from "@/lib/format";

type Client = {
  id: string;
  name: string;
};

type TechnicalProposalItem = {
  id: string;
  category: string | null;
  description: string | null;
  specifications: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: string | null;
  brand: string | null;
  model: string | null;
  item: {
    id: string;
    name: string;
    description: string | null;
  };
};

type TechnicalProposal = {
  id: string;
  proposalNumber: string;
  clientId: string;
  inquiryId: string | null;
  status: string;
  validFrom: string;
  validUntil: string | null;
  preparedBy: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  siteAddress: string | null;
  consumerNumber: string | null;
  consumerType: string | null;
  sanctionedLoad: number | null;
  contractDemand: number | null;
  avgMonthlyUnits: number | null;
  avgMonthlyBill: number | null;
  currentTariff: number | null;
  systemCapacity: number | null;
  annualGeneration: number | null;
  performanceRatio: number | null;
  degradationRate: number | null;
  systemLifespan: number | null;
  panelSpec: { brand: string; model: string; wattage: string; quantity: string; warranty: string } | null;
  inverterSpec: { brand: string; model: string; capacity: string; quantity: string; warranty: string } | null;
  systemCost: number | null;
  subsidyAmount: number | null;
  netCost: number | null;
  paybackPeriod: number | null;
  roi: number | null;
  savingsYear1: number | null;
  savings25Year: number | null;
  executiveNote: string | null;
  termsConditions: string | null;
  specialNotes: string | null;
  createdAt: string;
  client: Client;
  items: TechnicalProposalItem[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function TechnicalProposalPage() {
  const [proposals, setProposals] = useState<TechnicalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<TechnicalProposal | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/technical-proposals");
      const data = await res.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleView = (proposal: TechnicalProposal) => {
    setSelectedProposal(proposal);
    setViewMode("detail");
  };

  const handleEdit = (proposal: TechnicalProposal) => {
    setSelectedProposal(proposal);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this proposal?")) return;
    try {
      await fetch(`/api/technical-proposals/${id}`, { method: "DELETE" });
      fetchProposals();
      if (selectedProposal?.id === id) {
        setViewMode("list");
        setSelectedProposal(null);
      }
    } catch (error) {
      console.error("Failed to delete proposal:", error);
    }
  };

  const renderList = () => (
    <div className="space-y-4">
      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-solar-border bg-solar-sand p-8 text-center">
          <p className="text-solar-muted mb-4">No technical proposals yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Create Your First Proposal
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-solar-ink">
                      {proposal.proposalNumber}
                    </h3>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[proposal.status]}`}>
                      {proposal.status}
                    </span>
                  </div>
                  <p className="text-solar-muted text-sm mb-1">
                    Client: <span className="text-solar-ink font-medium">{proposal.client.name}</span>
                  </p>
                  {proposal.systemCapacity && (
                    <p className="text-solar-muted text-sm">
                      System: <span className="text-solar-ink font-medium">{proposal.systemCapacity} kWp</span>
                      {proposal.netCost && (
                        <span className="ml-3">
                          Investment: <span className="text-solar-ink font-medium">{formatCurrency(Number(proposal.netCost))}</span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(proposal)}
                    className="rounded-lg border border-solar-border bg-white px-3 py-1.5 text-sm font-medium text-solar-ink hover:bg-solar-sand"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(proposal)}
                    className="rounded-lg bg-solar-amber px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(proposal.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-solar-border flex gap-6 text-xs text-solar-muted">
                <span>Created: {formatDate(new Date(proposal.createdAt))}</span>
                {proposal.validUntil && (
                  <span>Valid Until: {formatDate(new Date(proposal.validUntil))}</span>
                )}
                {proposal.preparedBy && <span>By: {proposal.preparedBy}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selectedProposal) return null;
    const p = selectedProposal;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewMode("list")}
          className="text-sm text-solar-muted hover:text-solar-ink flex items-center gap-1"
        >
          ← Back to List
        </button>

        {/* Printable Proposal */}
        <div className="rounded-2xl border border-solar-border bg-white p-8 shadow-solar space-y-8 print:shadow-none print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-solar-border pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-solar-muted">Hi-Tech Solar Solutions</p>
              <h1 className="text-2xl font-bold text-solar-ink mt-1">Detailed Techno-Commercial Proposal</h1>
              <p className="text-lg text-solar-amber font-medium mt-2">{p.proposalNumber}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${STATUS_COLORS[p.status]}`}>
                {p.status}
              </span>
              <p className="text-sm text-solar-muted mt-2">
                Date: {formatDate(new Date(p.createdAt))}
              </p>
              {p.validUntil && (
                <p className="text-sm text-solar-muted">
                  Valid Until: {formatDate(new Date(p.validUntil))}
                </p>
              )}
            </div>
          </div>

          {/* Client & Site Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-solar-sand p-4">
              <h3 className="text-xs uppercase tracking-wide text-solar-muted mb-2">Client Details</h3>
              <p className="font-semibold text-solar-ink">{p.client.name}</p>
              {p.siteAddress && <p className="text-sm text-solar-muted mt-1">{p.siteAddress}</p>}
              {p.consumerNumber && (
                <p className="text-sm text-solar-muted">Consumer No: {p.consumerNumber}</p>
              )}
              {p.consumerType && (
                <p className="text-sm text-solar-muted">Type: {p.consumerType}</p>
              )}
            </div>
            <div className="rounded-xl bg-solar-sand p-4">
              <h3 className="text-xs uppercase tracking-wide text-solar-muted mb-2">Contact Information</h3>
              {p.preparedBy && <p className="text-sm">Prepared By: <span className="font-medium">{p.preparedBy}</span></p>}
              {p.contactPerson && <p className="text-sm">Contact: <span className="font-medium">{p.contactPerson}</span></p>}
              {p.contactPhone && <p className="text-sm">Phone: <span className="font-medium">{p.contactPhone}</span></p>}
              {p.contactEmail && <p className="text-sm">Email: <span className="font-medium">{p.contactEmail}</span></p>}
            </div>
          </div>

          {/* Executive Summary */}
          {p.executiveNote && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-2">Executive Summary</h3>
              <p className="text-sm text-solar-muted whitespace-pre-wrap">{p.executiveNote}</p>
            </div>
          )}

          {/* Existing Usage */}
          {(p.sanctionedLoad || p.avgMonthlyUnits || p.avgMonthlyBill) && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-3">Existing Electricity Usage</h3>
              <div className="grid gap-3 md:grid-cols-5">
                {p.sanctionedLoad && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Sanctioned Load</p>
                    <p className="text-lg font-bold text-solar-ink">{p.sanctionedLoad} kW</p>
                  </div>
                )}
                {p.contractDemand && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Contract Demand</p>
                    <p className="text-lg font-bold text-solar-ink">{p.contractDemand} kVA</p>
                  </div>
                )}
                {p.avgMonthlyUnits && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Monthly Units</p>
                    <p className="text-lg font-bold text-solar-ink">{Number(p.avgMonthlyUnits).toLocaleString()} kWh</p>
                  </div>
                )}
                {p.avgMonthlyBill && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Monthly Bill</p>
                    <p className="text-lg font-bold text-solar-ink">{formatCurrency(Number(p.avgMonthlyBill))}</p>
                  </div>
                )}
                {p.currentTariff && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Tariff Rate</p>
                    <p className="text-lg font-bold text-solar-ink">₹{p.currentTariff}/kWh</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Specifications */}
          {p.systemCapacity && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-3">Proposed System Specifications</h3>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-solar-amber/10 border border-solar-amber/30 p-3 text-center">
                  <p className="text-xs text-solar-muted">System Capacity</p>
                  <p className="text-2xl font-bold text-solar-amber">{p.systemCapacity} kWp</p>
                </div>
                {p.annualGeneration && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Annual Generation</p>
                    <p className="text-lg font-bold text-solar-ink">{Number(p.annualGeneration).toLocaleString()} kWh</p>
                  </div>
                )}
                {p.performanceRatio && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">Performance Ratio</p>
                    <p className="text-lg font-bold text-solar-ink">{p.performanceRatio}%</p>
                  </div>
                )}
                {p.systemLifespan && (
                  <div className="rounded-xl bg-solar-sand p-3 text-center">
                    <p className="text-xs text-solar-muted">System Life</p>
                    <p className="text-lg font-bold text-solar-ink">{p.systemLifespan} Years</p>
                  </div>
                )}
              </div>

              {/* Panel & Inverter Specs */}
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {p.panelSpec && (
                  <div className="rounded-xl border border-solar-border p-4">
                    <h4 className="text-xs font-semibold text-solar-muted mb-2">SOLAR PANELS</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-solar-muted">Brand:</span> <span className="font-medium">{p.panelSpec.brand}</span></p>
                      <p><span className="text-solar-muted">Model:</span> <span className="font-medium">{p.panelSpec.model}</span></p>
                      <p><span className="text-solar-muted">Wattage:</span> <span className="font-medium">{p.panelSpec.wattage}W</span></p>
                      <p><span className="text-solar-muted">Quantity:</span> <span className="font-medium">{p.panelSpec.quantity} Nos</span></p>
                      <p><span className="text-solar-muted">Warranty:</span> <span className="font-medium">{p.panelSpec.warranty}</span></p>
                    </div>
                  </div>
                )}
                {p.inverterSpec && (
                  <div className="rounded-xl border border-solar-border p-4">
                    <h4 className="text-xs font-semibold text-solar-muted mb-2">INVERTER</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-solar-muted">Brand:</span> <span className="font-medium">{p.inverterSpec.brand}</span></p>
                      <p><span className="text-solar-muted">Model:</span> <span className="font-medium">{p.inverterSpec.model}</span></p>
                      <p><span className="text-solar-muted">Capacity:</span> <span className="font-medium">{p.inverterSpec.capacity} kW</span></p>
                      <p><span className="text-solar-muted">Quantity:</span> <span className="font-medium">{p.inverterSpec.quantity} Nos</span></p>
                      <p><span className="text-solar-muted">Warranty:</span> <span className="font-medium">{p.inverterSpec.warranty}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bill of Quantities */}
          {p.items && p.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-3">Bill of Quantities</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-solar-sand">
                      <th className="px-4 py-2 text-left font-semibold">S.No</th>
                      <th className="px-4 py-2 text-left font-semibold">Item Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Brand/Model</th>
                      <th className="px-4 py-2 text-left font-semibold">Specifications</th>
                      <th className="px-4 py-2 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-solar-border">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium">{item.description || item.item.description || item.item.name}</p>
                          {item.category && <p className="text-xs text-solar-muted">{item.category}</p>}
                        </td>
                        <td className="px-4 py-2">
                          {item.brand && <span>{item.brand}</span>}
                          {item.model && <span className="text-solar-muted"> / {item.model}</span>}
                        </td>
                        <td className="px-4 py-2">{item.specifications || "-"}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-solar-sand font-semibold">
                      <td colSpan={6} className="px-4 py-2 text-right">Total:</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(p.items.reduce((sum, item) => sum + Number(item.totalPrice), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Performance Charts */}
          {p.systemCapacity && p.annualGeneration && p.avgMonthlyUnits && p.currentTariff && p.systemCost && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-3">Performance Analysis & Projections</h3>
              <ProposalCharts
                systemCapacity={Number(p.systemCapacity)}
                annualGeneration={Number(p.annualGeneration)}
                avgMonthlyUnits={Number(p.avgMonthlyUnits)}
                avgMonthlyBill={Number(p.avgMonthlyBill || 0)}
                currentTariff={Number(p.currentTariff)}
                systemCost={Number(p.systemCost)}
                subsidyAmount={Number(p.subsidyAmount || 0)}
                degradationRate={Number(p.degradationRate || 0.5)}
              />
            </div>
          )}

          {/* Financial Summary */}
          {(p.systemCost || p.netCost) && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-3">Financial Summary</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {p.systemCost && (
                  <div className="rounded-xl bg-solar-sand p-4">
                    <p className="text-xs text-solar-muted">Total System Cost</p>
                    <p className="text-xl font-bold text-solar-ink">{formatCurrency(Number(p.systemCost))}</p>
                  </div>
                )}
                {p.subsidyAmount && Number(p.subsidyAmount) > 0 && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-xs text-green-600">Subsidy</p>
                    <p className="text-xl font-bold text-green-700">- {formatCurrency(Number(p.subsidyAmount))}</p>
                  </div>
                )}
                {p.netCost && (
                  <div className="rounded-xl bg-solar-amber/10 border border-solar-amber/30 p-4">
                    <p className="text-xs text-solar-amber">Net Investment</p>
                    <p className="text-2xl font-bold text-solar-amber">{formatCurrency(Number(p.netCost))}</p>
                  </div>
                )}
              </div>

              {/* ROI Metrics */}
              <div className="grid gap-3 md:grid-cols-4 mt-4">
                {p.savingsYear1 && (
                  <div className="rounded-xl border border-solar-border p-3 text-center">
                    <p className="text-xs text-solar-muted">Year 1 Savings</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(Number(p.savingsYear1))}</p>
                  </div>
                )}
                {p.paybackPeriod && (
                  <div className="rounded-xl border border-solar-border p-3 text-center">
                    <p className="text-xs text-solar-muted">Payback Period</p>
                    <p className="text-lg font-bold text-solar-ink">{p.paybackPeriod} Years</p>
                  </div>
                )}
                {p.roi && (
                  <div className="rounded-xl border border-solar-border p-3 text-center">
                    <p className="text-xs text-solar-muted">Return on Investment</p>
                    <p className="text-lg font-bold text-green-600">{p.roi}%</p>
                  </div>
                )}
                {p.savings25Year && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-xs text-green-600">25-Year Savings</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(Number(p.savings25Year))}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {p.termsConditions && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-2">Terms & Conditions</h3>
              <p className="text-sm text-solar-muted whitespace-pre-wrap">{p.termsConditions}</p>
            </div>
          )}

          {/* Special Notes */}
          {p.specialNotes && (
            <div>
              <h3 className="text-sm font-semibold text-solar-ink mb-2">Special Notes</h3>
              <p className="text-sm text-solar-muted whitespace-pre-wrap">{p.specialNotes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 print:hidden">
          <button
            onClick={() => {
              window.open(`/api/technical-proposals/${p.id}/pdf`, "_blank");
            }}
            className="rounded-xl border border-solar-border bg-white px-4 py-2 text-sm font-semibold text-solar-ink hover:bg-solar-sand"
          >
            📄 Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-solar-border bg-white px-4 py-2 text-sm font-semibold text-solar-ink hover:bg-solar-sand"
          >
            🖨️ Print Proposal
          </button>
          <button
            onClick={() => handleEdit(p)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white hover:bg-solar-amber/90"
          >
            ✏️ Edit Proposal
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-sm text-solar-muted">Loading proposals...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Technical Proposals"
        subtitle="Create and manage professional techno-commercial proposals for clients."
        action={
          viewMode === "list" ? (
            <button
              onClick={() => {
                setSelectedProposal(null);
                setShowForm(true);
              }}
              className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
            >
              + New Proposal
            </button>
          ) : undefined
        }
      />

      {viewMode === "list" ? renderList() : renderDetail()}

      {showForm && (
        <TechnicalProposalForm
          onClose={() => {
            setShowForm(false);
            setSelectedProposal(null);
          }}
          onSuccess={() => {
            fetchProposals();
            setShowForm(false);
            setSelectedProposal(null);
          }}
          proposalId={selectedProposal?.id}
          initialData={selectedProposal ? {
            clientId: selectedProposal.clientId,
            inquiryId: selectedProposal.inquiryId,
            siteAddress: selectedProposal.siteAddress,
            consumerNumber: selectedProposal.consumerNumber,
            consumerType: selectedProposal.consumerType,
            preparedBy: selectedProposal.preparedBy,
            contactPerson: selectedProposal.contactPerson,
            contactPhone: selectedProposal.contactPhone,
            contactEmail: selectedProposal.contactEmail,
            validUntil: selectedProposal.validUntil?.split("T")[0],
            sanctionedLoad: selectedProposal.sanctionedLoad?.toString(),
            contractDemand: selectedProposal.contractDemand?.toString(),
            avgMonthlyUnits: selectedProposal.avgMonthlyUnits?.toString(),
            avgMonthlyBill: selectedProposal.avgMonthlyBill?.toString(),
            currentTariff: selectedProposal.currentTariff?.toString(),
            systemCapacity: selectedProposal.systemCapacity?.toString(),
            annualGeneration: selectedProposal.annualGeneration?.toString(),
            performanceRatio: selectedProposal.performanceRatio?.toString(),
            degradationRate: selectedProposal.degradationRate?.toString(),
            systemLifespan: selectedProposal.systemLifespan?.toString(),
            panelSpec: selectedProposal.panelSpec,
            inverterSpec: selectedProposal.inverterSpec,
            systemCost: selectedProposal.systemCost?.toString(),
            subsidyAmount: selectedProposal.subsidyAmount?.toString(),
            paybackPeriod: selectedProposal.paybackPeriod?.toString(),
            roi: selectedProposal.roi?.toString(),
            savingsYear1: selectedProposal.savingsYear1?.toString(),
            savings25Year: selectedProposal.savings25Year?.toString(),
            executiveNote: selectedProposal.executiveNote,
            termsConditions: selectedProposal.termsConditions,
            specialNotes: selectedProposal.specialNotes,
            items: selectedProposal.items?.map((item) => ({
              itemId: item.item.id,
              category: item.category || "",
              description: item.description || "",
              specifications: item.specifications || "",
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              warranty: item.warranty || "",
              brand: item.brand || "",
              model: item.model || "",
            })),
          } : undefined}
        />
      )}
    </div>
  );
}
