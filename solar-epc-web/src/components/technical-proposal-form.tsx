"use client";

import { useEffect, useState, useMemo } from "react";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";

type Client = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Inquiry = {
  id: string;
  title: string;
  siteAddress?: string | null;
  clientId: string;
};

type Quotation = {
  id: string;
  title: string;
  clientId: string;
  versions: {
    id: string;
    version: string;
    brand?: string | null;
    isFinal: boolean;
    grandTotal: number;
    items: {
      id: string;
      itemId: string;
      description?: string | null;
      quantity: number;
      rate: number;
      marginPercent: number;
      taxPercent: number;
      lineTotal: number;
      item: {
        id: string;
        name: string;
        description?: string | null;
        category?: string | null;
        brand?: string | null;
        uom?: string | null;
      };
    }[];
  }[];
};

type Item = {
  id: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  uom?: string | null;
  category?: string | null;
};

type ProposalItem = {
  itemId: string;
  category: string;
  description: string;
  specifications: string;
  quantity: number;
  unitPrice: number;
  warranty: string;
  brand: string;
  model: string;
};

type TechnicalProposalFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  proposalId?: string;
  initialData?: Record<string, unknown>;
};

const STEPS = [
  { id: 1, name: "Client & Site", icon: "👤" },
  { id: 2, name: "Usage Data", icon: "⚡" },
  { id: 3, name: "Equipment", icon: "🔧" },
  { id: 4, name: "System Specs", icon: "📊" },
  { id: 5, name: "Financials", icon: "💰" },
  { id: 6, name: "Summary", icon: "📋" },
];

const CONSUMER_TYPES = [
  "Residential LT",
  "Commercial LT",
  "Industrial LT",
  "Industrial HT",
  "Agricultural",
  "Government/Institutional",
];

const ITEM_CATEGORIES = [
  "Solar Panel",
  "Inverter",
  "Mounting Structure",
  "DC Cable",
  "AC Cable",
  "ACDB/DCDB",
  "Earthing Kit",
  "Lightning Arrestor",
  "Net Meter",
  "Installation & Commissioning",
  "Other",
];

export function TechnicalProposalForm({
  onClose,
  onSuccess,
  proposalId,
  initialData,
}: TechnicalProposalFormProps) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");

  // Step 1: Client & Site Info
  const [clientId, setClientId] = useState((initialData?.clientId as string) || "");
  const [inquiryId, setInquiryId] = useState((initialData?.inquiryId as string) || "");
  const [siteAddress, setSiteAddress] = useState((initialData?.siteAddress as string) || "");
  const [consumerNumber, setConsumerNumber] = useState((initialData?.consumerNumber as string) || "");
  const [consumerType, setConsumerType] = useState((initialData?.consumerType as string) || "Industrial HT");
  const [validUntil, setValidUntil] = useState((initialData?.validUntil as string) || "");
  const [preparedBy, setPreparedBy] = useState((initialData?.preparedBy as string) || "Technical Team");
  const [contactPerson, setContactPerson] = useState((initialData?.contactPerson as string) || "Sales Manager");
  const [contactPhone, setContactPhone] = useState((initialData?.contactPhone as string) || "+91 ");
  const [contactEmail, setContactEmail] = useState((initialData?.contactEmail as string) || "sales@solarepc.com");
  const [companyName, setCompanyName] = useState((initialData?.companyName as string) || "Solar EPC Solutions");
  const [companyLogo, setCompanyLogo] = useState((initialData?.companyLogo as string) || "");
  const [clientLogo, setClientLogo] = useState((initialData?.clientLogo as string) || "");
  const [introText, setIntroText] = useState((initialData?.introText as string) || "We are pleased to present this comprehensive technical proposal for the installation of a Solar Photovoltaic (PV) system. This proposal outlines the complete system design, equipment specifications, financial analysis, and expected performance of the proposed solar power plant.");
  const [scopeOfWork, setScopeOfWork] = useState((initialData?.scopeOfWork as string) || "1. Site Survey and Technical Assessment\n2. System Design and Engineering\n3. Procurement of Equipment and Materials\n4. Civil and Structural Works\n5. Electrical Installation and Wiring\n6. Grid Synchronization and Net Metering\n7. Testing and Commissioning\n8. Training and Documentation\n9. Handover to Client\n10. Warranty and AMC Support");

  // Step 2: Existing Usage Data
  const [sanctionedLoad, setSanctionedLoad] = useState((initialData?.sanctionedLoad as string) || "");
  const [contractDemand, setContractDemand] = useState((initialData?.contractDemand as string) || "");
  const [avgMonthlyUnits, setAvgMonthlyUnits] = useState((initialData?.avgMonthlyUnits as string) || "");
  const [avgMonthlyBill, setAvgMonthlyBill] = useState((initialData?.avgMonthlyBill as string) || "");
  const [currentTariff, setCurrentTariff] = useState((initialData?.currentTariff as string) || "");

  // Step 3: Equipment/Items (Bill of Quantities)
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>(
    (initialData?.items as ProposalItem[]) || [
      { itemId: "", category: "Solar Panel", description: "", specifications: "", quantity: 1, unitPrice: 0, warranty: "", brand: "", model: "" },
    ]
  );

  // Step 4: System Specifications
  const [systemCapacity, setSystemCapacity] = useState((initialData?.systemCapacity as string) || "");
  const [annualGeneration, setAnnualGeneration] = useState((initialData?.annualGeneration as string) || "");
  const [performanceRatio, setPerformanceRatio] = useState((initialData?.performanceRatio as string) || "78");
  const [degradationRate, setDegradationRate] = useState((initialData?.degradationRate as string) || "0.5");
  const [systemLifespan, setSystemLifespan] = useState((initialData?.systemLifespan as string) || "25");

  // Panel & Inverter Specs
  const [panelBrand, setPanelBrand] = useState((initialData?.panelSpec as Record<string, string>)?.brand || "");
  const [panelModel, setPanelModel] = useState((initialData?.panelSpec as Record<string, string>)?.model || "");
  const [panelWattage, setPanelWattage] = useState((initialData?.panelSpec as Record<string, string>)?.wattage || "");
  const [panelQuantity, setPanelQuantity] = useState((initialData?.panelSpec as Record<string, string>)?.quantity || "");
  const [panelWarranty, setPanelWarranty] = useState((initialData?.panelSpec as Record<string, string>)?.warranty || "25 Years");

  const [inverterBrand, setInverterBrand] = useState((initialData?.inverterSpec as Record<string, string>)?.brand || "");
  const [inverterModel, setInverterModel] = useState((initialData?.inverterSpec as Record<string, string>)?.model || "");
  const [inverterCapacity, setInverterCapacity] = useState((initialData?.inverterSpec as Record<string, string>)?.capacity || "");
  const [inverterQuantity, setInverterQuantity] = useState((initialData?.inverterSpec as Record<string, string>)?.quantity || "1");
  const [inverterWarranty, setInverterWarranty] = useState((initialData?.inverterSpec as Record<string, string>)?.warranty || "5 Years");

  // Step 5: Financials
  const [systemCost, setSystemCost] = useState((initialData?.systemCost as string) || "");
  const [subsidyAmount, setSubsidyAmount] = useState((initialData?.subsidyAmount as string) || "0");
  const [paybackPeriod, setPaybackPeriod] = useState((initialData?.paybackPeriod as string) || "");
  const [roi, setRoi] = useState((initialData?.roi as string) || "");
  const [savingsYear1, setSavingsYear1] = useState((initialData?.savingsYear1 as string) || "");
  const [savings25Year, setSavings25Year] = useState((initialData?.savings25Year as string) || "");

  // Step 6: Summary & Notes
  const [executiveNote, setExecutiveNote] = useState((initialData?.executiveNote as string) || "This solar PV system is designed to provide reliable, sustainable, and cost-effective power generation for your facility, ensuring significant savings on electricity bills while contributing to environmental conservation.");
  const [termsConditions, setTermsConditions] = useState((initialData?.termsConditions as string) || "1. Prices are valid for 30 days from the date of proposal\n2. Payment Terms: 30% advance, 60% on material delivery, 10% on commissioning\n3. Installation timeline: 4-6 weeks from advance payment\n4. Client to provide necessary approvals and permits\n5. Warranty: Solar Panels 25 years, Inverters 5 years, Structure 5 years\n6. AMC available post-warranty at mutually agreed terms\n7. Force majeure clause applicable\n8. Dispute resolution: Arbitration as per Indian law");
  const [specialNotes, setSpecialNotes] = useState((initialData?.specialNotes as string) || "");

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/inquiries").then((r) => r.json()),
      fetch("/api/quotations").then((r) => r.json()),
      fetch("/api/items").then((r) => r.json()),
    ])
      .then(([clientsData, inquiriesData, quotationsData, itemsData]) => {
        setClients(clientsData || []);
        setInquiries(inquiriesData || []);
        setQuotations(quotationsData || []);
        setItems(itemsData || []);
      })
      .catch(console.error);
  }, []);

  // Filter inquiries and quotations by selected client
  const filteredInquiries = useMemo(() => {
    if (!clientId) return inquiries;
    return inquiries.filter((inq) => inq.clientId === clientId);
  }, [clientId, inquiries]);

  const filteredQuotations = useMemo(() => {
    if (!clientId) return quotations;
    return quotations.filter((q) => q.clientId === clientId);
  }, [clientId, quotations]);

  const selectedQuotation = useMemo(() => {
    return quotations.find((q) => q.id === selectedQuotationId);
  }, [selectedQuotationId, quotations]);

  const quotationVersions = useMemo(() => {
    if (!selectedQuotation) return [];
    return selectedQuotation.versions || [];
  }, [selectedQuotation]);

  // Import quotation data when version is selected
  useEffect(() => {
    if (!selectedVersionId || !selectedQuotation) return;

    const version = selectedQuotation.versions.find((v) => v.id === selectedVersionId);
    if (!version) return;

    // Import items from quotation
    const importedItems: ProposalItem[] = version.items.map((qItem) => ({
      itemId: qItem.itemId,
      category: qItem.item.category || "Other",
      description: qItem.description || qItem.item.description || qItem.item.name,
      specifications: "",
      quantity: Number(qItem.quantity),
      unitPrice: Number(qItem.rate),
      warranty: "",
      brand: qItem.item.brand || version.brand || "",
      model: "",
    }));

    setProposalItems(importedItems);

    // Set system cost from quotation grand total
    setSystemCost(Number(version.grandTotal).toString());

    // Try to extract panel and inverter details
    const panelItem = version.items.find((item) => 
      item.item.category?.toLowerCase().includes("panel") ||
      item.item.name.toLowerCase().includes("panel")
    );

    const inverterItem = version.items.find((item) => 
      item.item.category?.toLowerCase().includes("inverter") ||
      item.item.name.toLowerCase().includes("inverter")
    );

    if (panelItem) {
      setPanelBrand(panelItem.item.brand || version.brand || "");
      setPanelQuantity(Number(panelItem.quantity).toString());
      // Try to extract wattage from description or name
      const wattageMatch = (panelItem.item.description || panelItem.item.name).match(/(\d+)\s*w/i);
      if (wattageMatch) {
        setPanelWattage(wattageMatch[1]);
        // Calculate system capacity
        const totalWp = Number(panelItem.quantity) * Number(wattageMatch[1]);
        setSystemCapacity((totalWp / 1000).toFixed(2));
      }
    }

    if (inverterItem) {
      setInverterBrand(inverterItem.item.brand || version.brand || "");
      setInverterQuantity(Number(inverterItem.quantity).toString());
      // Try to extract capacity from description or name
      const capacityMatch = (inverterItem.item.description || inverterItem.item.name).match(/(\d+)\s*kw/i);
      if (capacityMatch) {
        setInverterCapacity(capacityMatch[1]);
      }
    }
  }, [selectedVersionId, selectedQuotation]);

  // Auto-fill site address from inquiry
  useEffect(() => {
    if (inquiryId) {
      const selectedInquiry = inquiries.find((i) => i.id === inquiryId);
      if (selectedInquiry?.siteAddress && !siteAddress) {
        setSiteAddress(selectedInquiry.siteAddress);
      }
    }
  }, [inquiryId, inquiries, siteAddress]);

  // Calculate totals
  const { boqSubtotal, netCost } = useMemo(() => {
    const subtotal = proposalItems.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
    const system = parseFloat(systemCost) || subtotal;
    const subsidy = parseFloat(subsidyAmount) || 0;
    return { boqSubtotal: subtotal, netCost: system - subsidy };
  }, [proposalItems, systemCost, subsidyAmount]);

  // Auto-calculate annual generation based on capacity
  useEffect(() => {
    if (systemCapacity) {
      const capacity = parseFloat(systemCapacity);
      const pr = parseFloat(performanceRatio) / 100;
      // Assuming 1500 equivalent sun hours for India
      const annualGen = capacity * 1500 * pr;
      setAnnualGeneration(annualGen.toFixed(0));
    }
  }, [systemCapacity, performanceRatio]);

  // Auto-calculate financials
  useEffect(() => {
    if (annualGeneration && currentTariff && netCost) {
      const yearlyGeneration = parseFloat(annualGeneration);
      const tariff = parseFloat(currentTariff);
      const cost = netCost;
      
      const year1Savings = yearlyGeneration * tariff;
      setSavingsYear1(year1Savings.toFixed(0));
      
      // 25-year savings with degradation
      const degradation = parseFloat(degradationRate) / 100;
      let totalSavings = 0;
      for (let year = 0; year < 25; year++) {
        totalSavings += year1Savings * Math.pow(1 - degradation, year);
      }
      setSavings25Year(totalSavings.toFixed(0));
      
      if (year1Savings > 0) {
        const payback = cost / year1Savings;
        setPaybackPeriod(payback.toFixed(1));
        
        const returnOnInvestment = ((totalSavings - cost) / cost) * 100;
        setRoi(returnOnInvestment.toFixed(1));
      }
    }
  }, [annualGeneration, currentTariff, netCost, degradationRate]);

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const inquiryOptions = filteredInquiries.map((i) => ({ value: i.id, label: i.title }));
  const itemOptions = items.map((item) => ({
    value: item.id,
    label: item.description || item.name,
    subtitle: `${item.category || "Item"} • ${formatCurrency(Number(item.unitPrice))}`,
  }));

  const addProposalItem = () => {
    setProposalItems((prev) => [
      ...prev,
      { itemId: "", category: "Solar Panel", description: "", specifications: "", quantity: 1, unitPrice: 0, warranty: "", brand: "", model: "" },
    ]);
  };

  const updateProposalItem = (index: number, field: keyof ProposalItem, value: string | number) => {
    setProposalItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeProposalItem = (index: number) => {
    setProposalItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find((i) => i.id === itemId);
    if (selectedItem) {
      setProposalItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                itemId,
                description: selectedItem.description || selectedItem.name,
                unitPrice: Number(selectedItem.unitPrice) || 0,
                category: selectedItem.category || item.category,
              }
            : item
        )
      );
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        clientId,
        inquiryId: inquiryId || null,
        quotationId: selectedQuotationId || null,
        validUntil: validUntil || null,
        preparedBy,
        contactPerson,
        contactPhone,
        contactEmail,
        companyName,
        companyLogo: companyLogo || null,
        clientLogo: clientLogo || null,
        introText: introText || null,
        scopeOfWork: scopeOfWork || null,
        siteAddress,
        consumerNumber,
        consumerType,
        sanctionedLoad,
        contractDemand,
        avgMonthlyUnits,
        avgMonthlyBill,
        currentTariff,
        systemCapacity,
        annualGeneration,
        performanceRatio,
        degradationRate,
        systemLifespan,
        panelSpec: {
          brand: panelBrand,
          model: panelModel,
          wattage: panelWattage,
          quantity: panelQuantity,
          warranty: panelWarranty,
        },
        inverterSpec: {
          brand: inverterBrand,
          model: inverterModel,
          capacity: inverterCapacity,
          quantity: inverterQuantity,
          warranty: inverterWarranty,
        },
        systemCost: systemCost || boqSubtotal.toString(),
        subsidyAmount,
        netCost: netCost.toString(),
        paybackPeriod,
        roi,
        savingsYear1,
        savings25Year,
        executiveNote,
        termsConditions,
        specialNotes,
        items: proposalItems.filter((item) => item.itemId),
      };

      const url = proposalId
        ? `/api/technical-proposals/${proposalId}`
        : "/api/technical-proposals";
      const method = proposalId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to save proposal");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the proposal.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!clientId;
      case 2:
        return true;
      case 3:
        return proposalItems.some((item) => item.itemId);
      case 4:
        return !!systemCapacity;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-solar-ink">Client & Site Information</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Client *</label>
                <SearchableSelect
                  value={clientId}
                  options={clientOptions}
                  onChange={setClientId}
                  placeholder="Select client"
                  searchPlaceholder="Search clients"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Inquiry/Project</label>
                <SearchableSelect
                  value={inquiryId}
                  options={inquiryOptions}
                  onChange={setInquiryId}
                  placeholder="Select inquiry (optional)"
                  searchPlaceholder="Search inquiries"
                />
              </div>
            </div>

            {/* Import from Quotation */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-3">📋 Import from Quotation (Optional)</h4>
              <p className="text-xs text-amber-700 mb-3">
                Select a quotation to auto-fill equipment, costs, and specifications
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">Quotation</label>
                  <SearchableSelect
                    value={selectedQuotationId}
                    options={filteredQuotations.map((q) => ({
                      value: q.id,
                      label: q.title,
                      subtitle: `${q.versions.length} version(s)`,
                    }))}
                    onChange={(value) => {
                      setSelectedQuotationId(value);
                      setSelectedVersionId("");
                    }}
                    placeholder="Select quotation"
                    searchPlaceholder="Search quotations"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">Version</label>
                  <SearchableSelect
                    value={selectedVersionId}
                    options={quotationVersions.map((v) => ({
                      value: v.id,
                      label: `${v.version}${v.brand ? ` - ${v.brand}` : ""}${v.isFinal ? " (Final)" : ""}`,
                      subtitle: formatCurrency(Number(v.grandTotal)),
                    }))}
                    onChange={setSelectedVersionId}
                    placeholder={selectedQuotationId ? "Select version" : "Select quotation first"}
                    searchPlaceholder="Search versions"
                    disabled={!selectedQuotationId}
                  />
                </div>
              </div>
              {selectedVersionId && (
                <div className="mt-3 text-xs text-green-700 flex items-center gap-2">
                  <span>✓</span>
                  <span>Quotation imported! Equipment and costs have been auto-filled.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-solar-ink mb-1">Site Address</label>
              <textarea
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Full installation site address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Consumer Number</label>
                <input
                  value={consumerNumber}
                  onChange={(e) => setConsumerNumber(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Consumer Type</label>
                <select
                  value={consumerType}
                  onChange={(e) => setConsumerType(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                >
                  {CONSUMER_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-solar-border pt-4 mt-4">
              <h4 className="font-medium text-solar-ink mb-3">Proposal Details</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Prepared By</label>
                  <input
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Contact Person</label>
                  <input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Contact Phone</label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-solar-ink">Existing Electricity Usage</h3>
            <p className="text-sm text-solar-muted">
              Enter current electricity consumption details to calculate savings and ROI.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Sanctioned Load (kW)</label>
                <input
                  type="number"
                  value={sanctionedLoad}
                  onChange={(e) => setSanctionedLoad(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Contract Demand (kVA)</label>
                <input
                  type="number"
                  value={contractDemand}
                  onChange={(e) => setContractDemand(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Avg. Monthly Units (kWh)</label>
                <input
                  type="number"
                  value={avgMonthlyUnits}
                  onChange={(e) => setAvgMonthlyUnits(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 15000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Avg. Monthly Bill (₹)</label>
                <input
                  type="number"
                  value={avgMonthlyBill}
                  onChange={(e) => setAvgMonthlyBill(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 120000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-solar-ink mb-1">Current Tariff Rate (₹/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentTariff}
                  onChange={(e) => setCurrentTariff(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 8.50"
                />
              </div>
            </div>

            {avgMonthlyBill && avgMonthlyUnits && (
              <div className="rounded-xl bg-solar-amber/10 border border-solar-amber/30 p-4">
                <p className="text-sm text-solar-ink">
                  <strong>Calculated Effective Rate:</strong>{" "}
                  {formatCurrency(parseFloat(avgMonthlyBill) / parseFloat(avgMonthlyUnits))}/kWh
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-solar-ink">Bill of Quantities</h3>
                <p className="text-sm text-solar-muted">Add equipment and materials from inventory.</p>
              </div>
              <button
                type="button"
                onClick={addProposalItem}
                className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {proposalItems.map((item, index) => (
                <div key={index} className="rounded-xl border border-solar-border bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-solar-muted mb-1">Select Item *</label>
                      <SearchableSelect
                        value={item.itemId}
                        options={itemOptions}
                        onChange={(value) => handleItemSelect(index, value)}
                        placeholder="Select from inventory"
                        searchPlaceholder="Search items"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateProposalItem(index, "category", e.target.value)}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                      >
                        {ITEM_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Brand</label>
                      <input
                        value={item.brand}
                        onChange={(e) => updateProposalItem(index, "brand", e.target.value)}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                        placeholder="e.g., Adani, Tata"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Model</label>
                      <input
                        value={item.model}
                        onChange={(e) => updateProposalItem(index, "model", e.target.value)}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                        placeholder="Model number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Specifications</label>
                      <input
                        value={item.specifications}
                        onChange={(e) => updateProposalItem(index, "specifications", e.target.value)}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                        placeholder="e.g., 545W Mono PERC"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateProposalItem(index, "quantity", Number(e.target.value))}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateProposalItem(index, "unitPrice", Number(e.target.value))}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-solar-muted mb-1">Warranty</label>
                      <input
                        value={item.warranty}
                        onChange={(e) => updateProposalItem(index, "warranty", e.target.value)}
                        className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                        placeholder="e.g., 25 Years"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-solar-border">
                    <span className="text-sm font-medium text-solar-ink">
                      Line Total: {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    {proposalItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProposalItem(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-solar-sand border border-solar-border p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-solar-ink">BOQ Subtotal:</span>
                <span className="text-lg font-bold text-solar-amber">{formatCurrency(boqSubtotal)}</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-solar-ink">System Specifications</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">System Capacity (kWp) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={systemCapacity}
                  onChange={(e) => setSystemCapacity(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Annual Generation (kWh)</label>
                <input
                  type="number"
                  value={annualGeneration}
                  onChange={(e) => setAnnualGeneration(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  placeholder="Auto-calculated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Performance Ratio (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={performanceRatio}
                  onChange={(e) => setPerformanceRatio(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Degradation Rate (%/year)</label>
                <input
                  type="number"
                  step="0.1"
                  value={degradationRate}
                  onChange={(e) => setDegradationRate(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">System Lifespan (Years)</label>
                <input
                  type="number"
                  value={systemLifespan}
                  onChange={(e) => setSystemLifespan(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="border-t border-solar-border pt-4">
              <h4 className="font-medium text-solar-ink mb-3">Solar Panel Specification</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Brand</label>
                  <input
                    value={panelBrand}
                    onChange={(e) => setPanelBrand(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., Adani"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Model</label>
                  <input
                    value={panelModel}
                    onChange={(e) => setPanelModel(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., AW5A45BF"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Wattage (W)</label>
                  <input
                    type="number"
                    value={panelWattage}
                    onChange={(e) => setPanelWattage(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., 545"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Quantity</label>
                  <input
                    type="number"
                    value={panelQuantity}
                    onChange={(e) => setPanelQuantity(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., 184"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Warranty</label>
                  <input
                    value={panelWarranty}
                    onChange={(e) => setPanelWarranty(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-solar-border pt-4">
              <h4 className="font-medium text-solar-ink mb-3">Inverter Specification</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Brand</label>
                  <input
                    value={inverterBrand}
                    onChange={(e) => setInverterBrand(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., Sungrow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Model</label>
                  <input
                    value={inverterModel}
                    onChange={(e) => setInverterModel(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., SG110CX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Capacity (kW)</label>
                  <input
                    type="number"
                    value={inverterCapacity}
                    onChange={(e) => setInverterCapacity(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                    placeholder="e.g., 110"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Quantity</label>
                  <input
                    type="number"
                    value={inverterQuantity}
                    onChange={(e) => setInverterQuantity(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-solar-muted mb-1">Warranty</label>
                  <input
                    value={inverterWarranty}
                    onChange={(e) => setInverterWarranty(e.target.value)}
                    className="w-full rounded-lg border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-solar-ink">Financial Summary</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Total System Cost (₹)</label>
                <input
                  type="number"
                  value={systemCost || boqSubtotal}
                  onChange={(e) => setSystemCost(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-solar-ink mb-1">Subsidy Amount (₹)</label>
                <input
                  type="number"
                  value={subsidyAmount}
                  onChange={(e) => setSubsidyAmount(e.target.value)}
                  className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Net Investment:</span>
                <span className="text-xl font-bold text-green-700">{formatCurrency(netCost)}</span>
              </div>
            </div>

            <div className="border-t border-solar-border pt-4">
              <h4 className="font-medium text-solar-ink mb-3">Auto-Calculated Savings (based on usage data)</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Year 1 Savings (₹)</label>
                  <input
                    type="number"
                    value={savingsYear1}
                    onChange={(e) => setSavingsYear1(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">25-Year Savings (₹)</label>
                  <input
                    type="number"
                    value={savings25Year}
                    onChange={(e) => setSavings25Year(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Payback Period (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={paybackPeriod}
                    onChange={(e) => setPaybackPeriod(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-solar-ink mb-1">Return on Investment (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={roi}
                    onChange={(e) => setRoi(e.target.value)}
                    className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-solar-ink">Summary & Notes</h3>

            <div>
              <label className="block text-sm font-medium text-solar-ink mb-1">Executive Summary</label>
              <textarea
                value={executiveNote}
                onChange={(e) => setExecutiveNote(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Brief overview of the proposal highlighting key benefits..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-solar-ink mb-1">Terms & Conditions</label>
              <textarea
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Payment terms, delivery schedule, warranty conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-solar-ink mb-1">Special Notes</label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                placeholder="Any additional notes or remarks..."
              />
            </div>

            {/* Quick Preview */}
            <div className="rounded-xl bg-solar-sand border border-solar-border p-4 mt-4">
              <h4 className="font-medium text-solar-ink mb-3">Quick Preview</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-solar-muted">Client:</span>
                  <span className="font-medium">{clients.find((c) => c.id === clientId)?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-solar-muted">System Capacity:</span>
                  <span className="font-medium">{systemCapacity} kWp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-solar-muted">Annual Generation:</span>
                  <span className="font-medium">{Number(annualGeneration).toLocaleString()} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-solar-muted">Net Investment:</span>
                  <span className="font-medium">{formatCurrency(netCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-solar-muted">Payback Period:</span>
                  <span className="font-medium">{paybackPeriod} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-solar-muted">25-Year Savings:</span>
                  <span className="font-medium text-green-600">{formatCurrency(parseFloat(savings25Year) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ModalShell
      title={proposalId ? "Edit Technical Proposal" : "Create Technical Proposal"}
      subtitle="Build a professional techno-commercial proposal step by step."
      onClose={onClose}
      size="full"
    >
      <div className="flex flex-col h-[600px]">
        {/* Stepper */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                step === s.id
                  ? "bg-solar-amber text-white"
                  : step > s.id
                  ? "bg-green-100 text-green-700"
                  : "bg-solar-sand text-solar-muted"
              }`}
            >
              <span>{s.icon}</span>
              <span className="text-sm font-medium">{s.name}</span>
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {renderStep()}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-solar-border">
          <button
            type="button"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl border border-solar-border bg-white text-sm font-semibold text-solar-ink disabled:opacity-50"
          >
            ← Previous
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-solar-border bg-white text-sm font-semibold text-solar-ink"
            >
              Cancel
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 rounded-xl bg-solar-amber text-sm font-semibold text-white disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="px-6 py-2 rounded-xl bg-green-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Saving..." : proposalId ? "Update Proposal" : "Create Proposal"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
