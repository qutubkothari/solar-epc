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
    const { inquiryId, name, fileUrl } = body;

    const { db } = await import("@/lib/db");
    const doc = await db.completionDocument.update({
      where: { id },
      data: {
        inquiryId,
        name,
        fileUrl,
      },
      include: { inquiry: true },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error updating completion doc:", error);
    return NextResponse.json({ error: "Failed to update completion doc" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    await db.completionDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting completion doc:", error);
    return NextResponse.json({ error: "Failed to delete completion doc" }, { status: 500 });
  }
}
