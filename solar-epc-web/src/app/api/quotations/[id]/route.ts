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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, status, inquiryId, finalVersionId, versionId, items, brand } = body;

    const { db } = await import("@/lib/db");
    const quotation = await db.$transaction(async (tx) => {
      if (finalVersionId) {
        const version = await tx.quotationVersion.findFirst({
          where: {
            id: finalVersionId,
            quotationId: id,
          },
        });

        if (!version) {
          throw new Error("Final version does not belong to this quotation");
        }

        await tx.quotationVersion.updateMany({
          where: { quotationId: id },
          data: { isFinal: false },
        });

        await tx.quotationVersion.update({
          where: { id: finalVersionId },
          data: { isFinal: true },
        });
      }

      if (versionId) {
        const existingVersion = await tx.quotationVersion.findFirst({
          where: {
            id: versionId,
            quotationId: id,
          },
        });

        if (!existingVersion) {
          throw new Error("Quotation version not found for update");
        }

        const safeItems = Array.isArray(items) ? items : [];
        const itemIds = safeItems.map((item: { itemId: string }) => item.itemId).filter(Boolean);
        const itemRecords = await tx.item.findMany({
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
        }> = safeItems
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

        await tx.quotationItem.deleteMany({
          where: { quotationVersionId: versionId },
        });

        await tx.quotationVersion.update({
          where: { id: versionId },
          data: {
            brand: brand ?? undefined,
            documentData,
            subtotal,
            marginTotal,
            taxTotal,
            grandTotal,
            items: {
              create: lineItems,
            },
          },
        });
      }

      return tx.quotation.update({
        where: { id },
        data: {
          title: title ?? undefined,
          status: status ?? undefined,
          inquiryId: inquiryId === undefined ? undefined : inquiryId || null,
          finalVersionId: finalVersionId ?? undefined,
        },
        include: { client: true, inquiry: true },
      });
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");

    await db.$transaction(async (tx) => {
      const versionIds = await tx.quotationVersion.findMany({
        where: { quotationId: id },
        select: { id: true },
      });
      const ids = versionIds.map((v) => v.id);
      if (ids.length > 0) {
        await tx.quotationItem.deleteMany({ where: { quotationVersionId: { in: ids } } });
        await tx.quotationVersion.deleteMany({ where: { id: { in: ids } } });
      }
      await tx.quotation.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
