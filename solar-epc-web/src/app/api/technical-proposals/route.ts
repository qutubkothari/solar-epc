import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generate proposal number: TP-YYYYMM-XXXX
async function generateProposalNumber(db: typeof import("@/lib/db").db) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `TP-${yearMonth}-`;
  
  const lastProposal = await db.technicalProposal.findFirst({
    where: { proposalNumber: { startsWith: prefix } },
    orderBy: { proposalNumber: "desc" },
  });

  let sequence = 1;
  if (lastProposal) {
    const lastSequence = parseInt(lastProposal.proposalNumber.split("-").pop() || "0", 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const proposals = await db.technicalProposal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        inquiry: true,
        quotation: true,
        items: {
          include: { item: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Error fetching technical proposals:", error);
    return NextResponse.json({ error: "Failed to fetch technical proposals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db } = await import("@/lib/db");

    const {
      clientId,
      inquiryId,
      quotationId,
      // Validity
      validFrom,
      validUntil,
      // Company/Preparer info
      preparedBy,
      contactPerson,
      contactPhone,
      contactEmail,
      // Client/Site details
      siteAddress,
      consumerNumber,
      consumerType,
      // Existing consumption
      sanctionedLoad,
      contractDemand,
      avgMonthlyUnits,
      avgMonthlyBill,
      currentTariff,
      // System specifications
      systemCapacity,
      annualGeneration,
      performanceRatio,
      degradationRate,
      systemLifespan,
      // Equipment specs (JSON)
      panelSpec,
      inverterSpec,
      structureSpec,
      // Financial summary
      systemCost,
      subsidyAmount,
      netCost,
      paybackPeriod,
      roi,
      savingsYear1,
      savings25Year,
      // Terms & notes
      executiveNote,
      termsConditions,
      specialNotes,
      // Line items
      items,
    } = body;

    // Generate proposal number
    const proposalNumber = await generateProposalNumber(db);

    // Create proposal with items
    const proposal = await db.technicalProposal.create({
      data: {
        proposalNumber,
        clientId,
        inquiryId: inquiryId || null,
        quotationId: quotationId || null,
        status: "DRAFT",
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        preparedBy,
        contactPerson,
        contactPhone,
        contactEmail,
        siteAddress,
        consumerNumber,
        consumerType,
        sanctionedLoad: sanctionedLoad ? parseFloat(sanctionedLoad) : null,
        contractDemand: contractDemand ? parseFloat(contractDemand) : null,
        avgMonthlyUnits: avgMonthlyUnits ? parseFloat(avgMonthlyUnits) : null,
        avgMonthlyBill: avgMonthlyBill ? parseFloat(avgMonthlyBill) : null,
        currentTariff: currentTariff ? parseFloat(currentTariff) : null,
        systemCapacity: systemCapacity ? parseFloat(systemCapacity) : null,
        annualGeneration: annualGeneration ? parseFloat(annualGeneration) : null,
        performanceRatio: performanceRatio ? parseFloat(performanceRatio) : null,
        degradationRate: degradationRate ? parseFloat(degradationRate) : null,
        systemLifespan: systemLifespan ? parseInt(systemLifespan, 10) : null,
        panelSpec: panelSpec || null,
        inverterSpec: inverterSpec || null,
        structureSpec: structureSpec || null,
        systemCost: systemCost ? parseFloat(systemCost) : null,
        subsidyAmount: subsidyAmount ? parseFloat(subsidyAmount) : null,
        netCost: netCost ? parseFloat(netCost) : null,
        paybackPeriod: paybackPeriod ? parseFloat(paybackPeriod) : null,
        roi: roi ? parseFloat(roi) : null,
        savingsYear1: savingsYear1 ? parseFloat(savingsYear1) : null,
        savings25Year: savings25Year ? parseFloat(savings25Year) : null,
        executiveNote,
        termsConditions,
        specialNotes,
        items: items && items.length > 0 ? {
          create: items.map((item: {
            itemId: string;
            category?: string;
            description?: string;
            specifications?: string;
            quantity: number;
            unitPrice: number;
            warranty?: string;
            brand?: string;
            model?: string;
          }, index: number) => ({
            itemId: item.itemId,
            category: item.category || null,
            description: item.description || null,
            specifications: item.specifications || null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
            warranty: item.warranty || null,
            brand: item.brand || null,
            model: item.model || null,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        client: true,
        inquiry: true,
        quotation: true,
        items: {
          include: { item: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Error creating technical proposal:", error);
    return NextResponse.json({ error: "Failed to create technical proposal" }, { status: 500 });
  }
}
