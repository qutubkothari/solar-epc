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
    const { title, status } = body;

    const { db } = await import("@/lib/db");
    const quotation = await db.quotation.update({
      where: { id },
      data: { title, status },
      include: { client: true },
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
