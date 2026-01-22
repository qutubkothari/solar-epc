import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { db } = await import("@/lib/db");
    const quotation = await db.quotation.findUnique({
      where: { id: params.id },
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

    drawText("Solar EPC Quotation", 40, 800, 18, true);
    drawText(`Client: ${quotation.client.name}`, 40, 770, 12);
    drawText(`Quote: ${quotation.title}`, 40, 750, 12);
    drawText(`Version: ${version?.version || "1.0"}`, 40, 730, 12);

    let y = 700;
    drawText("Items", 40, y, 12, true);
    y -= 20;

    if (version?.items?.length) {
      version.items.forEach((line) => {
        drawText(`${line.item.name} x ${line.quantity}`, 40, y, 11);
        drawText(`AED ${Number(line.lineTotal).toFixed(2)}`, 420, y, 11);
        y -= 18;
      });
    } else {
      drawText("No line items recorded.", 40, y, 11);
      y -= 18;
    }

    y -= 10;
    drawText(`Subtotal: AED ${Number(version?.subtotal || 0).toFixed(2)}`, 40, y, 11, true);
    y -= 16;
    drawText(`Margin: AED ${Number(version?.marginTotal || 0).toFixed(2)}`, 40, y, 11, true);
    y -= 16;
    drawText(`Tax: AED ${Number(version?.taxTotal || 0).toFixed(2)}`, 40, y, 11, true);
    y -= 16;
    drawText(`Grand Total: AED ${Number(version?.grandTotal || 0).toFixed(2)}`, 40, y, 12, true);

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
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
