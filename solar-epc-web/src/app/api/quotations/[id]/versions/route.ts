import { NextResponse } from "next/server";
import { createDefaultQuotationDocumentData, normalizeQuotationDocumentData } from "@/lib/quotation-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const percentToDecimal = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value / 100;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { items = [], version, brand, isFinal = false } = body;

    if (!version) {
      return NextResponse.json({ error: "Version label is required" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const itemIds = items.map((item: { itemId: string }) => item.itemId).filter(Boolean);
    const itemRecords = await db.item.findMany({
      where: { id: { in: itemIds } },
    });

    const documentData = body.documentData
      ? normalizeQuotationDocumentData(body.documentData)
      : createDefaultQuotationDocumentData({
          moduleWattage: Number(body.moduleWattage ?? 0) || undefined,
          numberOfModules: Number(body.numberOfModules ?? 0) || undefined,
          totalKw: Number(body.systemCapacityKw ?? 0) || undefined,
        });

    const lineItems: Array<{
      itemId: string;
      description: string | null;
      quantity: number;
      rate: number;
      marginPercent: number;
      taxPercent: number;
      lineTotal: number;
    }> = items
      .filter((line: { itemId: string }) => line.itemId)
      .map((line: {
        itemId: string;
        quantity: number;
        rate?: number;
        description?: string;
        marginPercent?: number;
        taxPercent?: number;
      }) => {
        const item = itemRecords.find((record) => record.id === line.itemId);
        const quantity = Number(line.quantity || 1);
        const rate = Number(line.rate ?? item?.unitPrice ?? 0);
        const marginPercent = Number(line.marginPercent ?? item?.marginPercent ?? 0);
        const taxPercent = Number(line.taxPercent ?? item?.taxPercent ?? 0);
        const marginAmount = rate * percentToDecimal(marginPercent);
        const taxAmount = rate * percentToDecimal(taxPercent);
        const lineTotal = (rate + marginAmount + taxAmount) * quantity;

        return {
          itemId: line.itemId,
          description: line.description || item?.description || null,
          quantity,
          rate,
          marginPercent,
          taxPercent,
          lineTotal,
        };
      });

    const subtotal = lineItems.reduce(
      (sum: number, line) => sum + Number(line.rate) * Number(line.quantity),
      0
    );
    const marginTotal = lineItems.reduce(
      (sum: number, line) =>
        sum + Number(line.rate) * percentToDecimal(Number(line.marginPercent)) * Number(line.quantity),
      0
    );
    const taxTotal = lineItems.reduce(
      (sum: number, line) =>
        sum + Number(line.rate) * percentToDecimal(Number(line.taxPercent)) * Number(line.quantity),
      0
    );
    const grandTotal = subtotal + marginTotal + taxTotal;

    const quotationVersion = await db.$transaction(async (tx) => {
      if (isFinal) {
        await tx.quotationVersion.updateMany({
          where: { quotationId: id },
          data: { isFinal: false },
        });
      }

      const createdVersion = await tx.quotationVersion.create({
        data: {
          quotationId: id,
          version,
          brand,
          documentData,
          isFinal,
          subtotal,
          marginTotal,
          taxTotal,
          grandTotal,
          items: {
            create: lineItems,
          },
        },
        include: {
          items: { include: { item: true } },
        },
      });

      if (isFinal) {
        await tx.quotation.update({
          where: { id },
          data: { finalVersionId: createdVersion.id },
        });
      }

      return createdVersion;
    });

    return NextResponse.json(quotationVersion);
  } catch (error) {
    console.error("Error creating quotation version:", error);
    return NextResponse.json({ error: "Failed to create quotation version" }, { status: 500 });
  }
}
