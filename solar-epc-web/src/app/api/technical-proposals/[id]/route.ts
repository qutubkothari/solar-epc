import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");
    
    const proposal = await db.technicalProposal.findUnique({
      where: { id },
      include: {
        client: true,
        inquiry: true,
        quotation: {
          include: {
            versions: {
              include: {
                items: { include: { item: true } },
              },
            },
          },
        },
        items: {
          include: { item: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Technical proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Error fetching technical proposal:", error);
    return NextResponse.json({ error: "Failed to fetch technical proposal" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await import("@/lib/db");

    const {
      clientId,
      inquiryId,
      quotationId,
      status,
      validFrom,
      validUntil,
      preparedBy,
      contactPerson,
      contactPhone,
      contactEmail,
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
      panelSpec,
      inverterSpec,
      structureSpec,
      systemCost,
      subsidyAmount,
      netCost,
      paybackPeriod,
      roi,
      savingsYear1,
      savings25Year,
      executiveNote,
      termsConditions,
      specialNotes,
      items,
    } = body;

    // Delete existing items and create new ones
    if (items !== undefined) {
      await db.technicalProposalItem.deleteMany({
        where: { technicalProposalId: id },
      });
    }

    const proposal = await db.technicalProposal.update({
      where: { id },
      data: {
        clientId,
        inquiryId: inquiryId || null,
        quotationId: quotationId || null,
        status: status || undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : null,
        preparedBy,
        contactPerson,
        contactPhone,
        contactEmail,
        siteAddress,
        consumerNumber,
        consumerType,
        sanctionedLoad: sanctionedLoad !== undefined ? (sanctionedLoad ? parseFloat(sanctionedLoad) : null) : undefined,
        contractDemand: contractDemand !== undefined ? (contractDemand ? parseFloat(contractDemand) : null) : undefined,
        avgMonthlyUnits: avgMonthlyUnits !== undefined ? (avgMonthlyUnits ? parseFloat(avgMonthlyUnits) : null) : undefined,
        avgMonthlyBill: avgMonthlyBill !== undefined ? (avgMonthlyBill ? parseFloat(avgMonthlyBill) : null) : undefined,
        currentTariff: currentTariff !== undefined ? (currentTariff ? parseFloat(currentTariff) : null) : undefined,
        systemCapacity: systemCapacity !== undefined ? (systemCapacity ? parseFloat(systemCapacity) : null) : undefined,
        annualGeneration: annualGeneration !== undefined ? (annualGeneration ? parseFloat(annualGeneration) : null) : undefined,
        performanceRatio: performanceRatio !== undefined ? (performanceRatio ? parseFloat(performanceRatio) : null) : undefined,
        degradationRate: degradationRate !== undefined ? (degradationRate ? parseFloat(degradationRate) : null) : undefined,
        systemLifespan: systemLifespan !== undefined ? (systemLifespan ? parseInt(systemLifespan, 10) : null) : undefined,
        panelSpec: panelSpec !== undefined ? panelSpec : undefined,
        inverterSpec: inverterSpec !== undefined ? inverterSpec : undefined,
        structureSpec: structureSpec !== undefined ? structureSpec : undefined,
        systemCost: systemCost !== undefined ? (systemCost ? parseFloat(systemCost) : null) : undefined,
        subsidyAmount: subsidyAmount !== undefined ? (subsidyAmount ? parseFloat(subsidyAmount) : null) : undefined,
        netCost: netCost !== undefined ? (netCost ? parseFloat(netCost) : null) : undefined,
        paybackPeriod: paybackPeriod !== undefined ? (paybackPeriod ? parseFloat(paybackPeriod) : null) : undefined,
        roi: roi !== undefined ? (roi ? parseFloat(roi) : null) : undefined,
        savingsYear1: savingsYear1 !== undefined ? (savingsYear1 ? parseFloat(savingsYear1) : null) : undefined,
        savings25Year: savings25Year !== undefined ? (savings25Year ? parseFloat(savings25Year) : null) : undefined,
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
    console.error("Error updating technical proposal:", error);
    return NextResponse.json({ error: "Failed to update technical proposal" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");

    await db.technicalProposal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting technical proposal:", error);
    return NextResponse.json({ error: "Failed to delete technical proposal" }, { status: 500 });
  }
}
