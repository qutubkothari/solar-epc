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
    const { clientId, inquiryId, allowDownload, expiresAt } = body;

    const { db } = await import("@/lib/db");
    const token = await db.tokenAccess.update({
      where: { id },
      data: {
        clientId,
        inquiryId,
        allowDownload: allowDownload ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { client: true, inquiry: true },
    });

    return NextResponse.json(token);
  } catch (error) {
    console.error("Error updating token:", error);
    return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    await db.tokenAccess.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting token:", error);
    return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
  }
}
