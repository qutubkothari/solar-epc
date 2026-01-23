import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalPDF } from "@/components/proposal-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposal = await db.technicalProposal.findUnique({
      where: { id },
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

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Transform data for PDF
    const pdfData = {
      proposalNumber: proposal.proposalNumber,
      client: {
        name: proposal.client.name,
        address: proposal.client.address || undefined,
        contactName: proposal.client.contactName || undefined,
      },
      companyName: proposal.companyName || "Solar EPC Solutions",
      companyLogo: proposal.companyLogo || undefined,
      clientLogo: proposal.clientLogo || undefined,
      introText: proposal.introText || undefined,
      siteAddress: proposal.siteAddress || undefined,
      consumerNumber: proposal.consumerNumber || undefined,
      consumerType: proposal.consumerType || undefined,
      sanctionedLoad: proposal.sanctionedLoad ? Number(proposal.sanctionedLoad) : undefined,
      contractDemand: proposal.contractDemand ? Number(proposal.contractDemand) : undefined,
      avgMonthlyUnits: proposal.avgMonthlyUnits ? Number(proposal.avgMonthlyUnits) : undefined,
      avgMonthlyBill: proposal.avgMonthlyBill ? Number(proposal.avgMonthlyBill) : undefined,
      currentTariff: proposal.currentTariff ? Number(proposal.currentTariff) : undefined,
      systemCapacity: proposal.systemCapacity ? Number(proposal.systemCapacity) : undefined,
      annualGeneration: proposal.annualGeneration ? Number(proposal.annualGeneration) : undefined,
      performanceRatio: proposal.performanceRatio ? Number(proposal.performanceRatio) : undefined,
      degradationRate: proposal.degradationRate ? Number(proposal.degradationRate) : undefined,
      systemLifespan: proposal.systemLifespan || undefined,
      panelSpec: proposal.panelSpec as any,
      inverterSpec: proposal.inverterSpec as any,
      systemCost: proposal.systemCost ? Number(proposal.systemCost) : undefined,
      subsidyAmount: proposal.subsidyAmount ? Number(proposal.subsidyAmount) : undefined,
      netCost: proposal.netCost ? Number(proposal.netCost) : undefined,
      paybackPeriod: proposal.paybackPeriod ? Number(proposal.paybackPeriod) : undefined,
      roi: proposal.roi ? Number(proposal.roi) : undefined,
      savingsYear1: proposal.savingsYear1 ? Number(proposal.savingsYear1) : undefined,
      savings25Year: proposal.savings25Year ? Number(proposal.savings25Year) : undefined,
      scopeOfWork: proposal.scopeOfWork || undefined,
      termsConditions: proposal.termsConditions || undefined,
      specialNotes: proposal.specialNotes || undefined,
      validUntil: proposal.validUntil?.toISOString(),
      preparedBy: proposal.preparedBy || undefined,
      contactPerson: proposal.contactPerson || undefined,
      contactPhone: proposal.contactPhone || undefined,
      contactEmail: proposal.contactEmail || undefined,
      items: proposal.items.map((item) => ({
        category: item.category || undefined,
        description: item.description || undefined,
        specifications: item.specifications || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        warranty: item.warranty || undefined,
        brand: item.brand || undefined,
        model: item.model || undefined,
      })),
    };

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(<ProposalPDF proposal={pdfData} />);

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Proposal-${proposal.proposalNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
