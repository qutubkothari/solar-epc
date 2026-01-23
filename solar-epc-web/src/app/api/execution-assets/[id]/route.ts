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
    const { inquiryId, assetType, serialNo } = body;

    const { db } = await import("@/lib/db");
    const asset = await db.executionAsset.update({
      where: { id },
      data: {
        inquiryId,
        assetType,
        serialNo,
      },
      include: { inquiry: true },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error updating execution asset:", error);
    return NextResponse.json({ error: "Failed to update execution asset" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    await db.executionAsset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting execution asset:", error);
    return NextResponse.json({ error: "Failed to delete execution asset" }, { status: 500 });
  }
}
