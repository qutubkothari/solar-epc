import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await import("@/lib/db");
    const { id } = await context.params;
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        versions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (!quotation.versions || quotation.versions.length === 0) {
      return NextResponse.json({ error: "No versions found for this quotation" }, { status: 404 });
    }

    const version = quotation.versions[0];
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text: string, x: number, y: number, size = 12, bold = false) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: bold ? boldFont : font,
        color: rgb(0.12, 0.14, 0.16),
      });
    };

    // Header
    drawText("Solar EPC Quotation", 40, 800, 18, true);
    drawText(`Client: ${quotation.client.name}`, 40, 770, 12);
    drawText(`Quote: ${quotation.title}`, 40, 750, 12);
    drawText(`Version: ${version.version || "1.0"}`, 40, 730, 12);
    if (version.brand) {
      drawText(`Brand: ${version.brand}`, 40, 710, 12);
    }

    let y = version.brand ? 680 : 700;
    
    // Table Header
    drawText("Item", 40, y, 11, true);
    drawText("Qty", 280, y, 11, true);
    drawText("Rate", 340, y, 11, true);
    drawText("Amount", 480, y, 11, true);
    y -= 20;

    if (version.items && version.items.length > 0) {
      version.items.forEach((line) => {
        const itemName = line.item.name || 'Unknown Item';
        const qty = Number(line.quantity).toFixed(2);
        const rate = formatCurrency(Number(line.rate));
        const total = formatCurrency(Number(line.lineTotal));
        
        // Truncate long item names
        const displayName = itemName.length > 35 ? itemName.substring(0, 32) + '...' : itemName;
        
        drawText(displayName, 40, y, 10);
        drawText(qty, 280, y, 10);
        drawText(rate, 340, y, 10);
        drawText(total, 480, y, 10);
        y -= 16;
        
        // Add page if needed
        if (y < 150) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }
      });
    } else {
      drawText("No line items recorded.", 40, y, 11);
      y -= 18;
    }

    y -= 20;
    drawText(`Subtotal: ${formatCurrency(Number(version.subtotal || 0))}`, 350, y, 11, true);
    y -= 16;
    drawText(`Margin: ${formatCurrency(Number(version.marginTotal || 0))}`, 350, y, 11, true);
    y -= 16;
    drawText(`Tax: ${formatCurrency(Number(version.taxTotal || 0))}`, 350, y, 11, true);
    y -= 20;
    drawText(`Grand Total: ${formatCurrency(Number(version.grandTotal || 0))}`, 350, y, 14, true);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${quotation.title.replace(/\s+/g, "-")}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    return NextResponse.json({ 
      error: "Failed to generate PDF", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
