import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, status, inquiryId, finalVersionId } = body;

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
