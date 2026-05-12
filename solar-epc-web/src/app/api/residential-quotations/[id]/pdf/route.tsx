import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResidentialQuotationPDF } from "@/components/residential-quotation-pdf";
import { normalizeQuotationDocumentData } from "@/lib/quotation-document";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await import("@/lib/db");
    const { id } = await context.params;
    const versionId = new URL(request.url).searchParams.get("version");
    
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        versions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { item: true }
            }
          }
        }
      }
    });
    
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }
    
    if (!quotation.versions.length) {
      return NextResponse.json({ error: "No versions found for this quotation" }, { status: 404 });
    }
    
    const version = versionId ? quotation.versions.find((v: any) => v.id === versionId) || quotation.versions[0] : quotation.versions[0];
    
    const documentData = normalizeQuotationDocumentData(version.documentData);
    
    const items = version.items.map((item: any) => ({
      category: item.item.category || item.item.name || "Item",
      description: item.description || item.item.description || item.item.name,
      rate: Number(item.rate),
      amount: Number(item.lineTotal)
    }));
    
    const pdfData = {
      proposalNumber: quotation.title,
      clientName: quotation.client.name,
      date: new Date(version.createdAt).toLocaleDateString("en-IN"),
      items,
      documentData,
      grandTotal: Number(version.grandTotal)
    };
    
    const pdfBuffer = await renderToBuffer(<ResidentialQuotationPDF quotation={pdfData} />);
    
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Residential-Quotation-${quotation.title.replace(/\\s+/g, "-")}.pdf"`
      }
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
