import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    const inquiry = await db.inquiry.findUnique({
      where: { id },
      include: { client: true, media: true },
    });

    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json(inquiry);
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    return NextResponse.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { 
      clientId, 
      title, 
      notes, 
      siteAddress, 
      status,
      latitude,
      longitude,
      buildingHeight,
      roofArea,
      roofType,
      roofOrientation,
      sunDirection,
      shadingObstructions,
      electricalPanelDistance,
      electricalPanelCapacity,
      structuralNotes
    } = body;

    const { db } = await import("@/lib/db");
    const inquiry = await db.inquiry.update({
      where: { id },
      data: {
        clientId,
        title,
        notes,
        siteAddress,
        status,
        latitude,
        longitude,
        buildingHeight,
        roofArea,
        roofType,
        roofOrientation,
        sunDirection,
        shadingObstructions,
        electricalPanelDistance,
        electricalPanelCapacity,
        structuralNotes,
      },
      include: { client: true },
    });

    return NextResponse.json(inquiry);
  } catch (error) {
    console.error("Error updating inquiry:", error);
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
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
      await tx.inquiryMedia.deleteMany({ where: { inquiryId: id } });
      await tx.statutoryDocument.deleteMany({ where: { inquiryId: id } });
      await tx.completionDocument.deleteMany({ where: { inquiryId: id } });
      await tx.executionAsset.deleteMany({ where: { inquiryId: id } });
      await tx.task.deleteMany({ where: { inquiryId: id } });
      await tx.tokenAccess.deleteMany({ where: { inquiryId: id } });
      await tx.applicationData.deleteMany({ where: { inquiryId: id } });

      const versionIds = await tx.quotationVersion.findMany({
        where: { quotation: { inquiryId: id } },
        select: { id: true },
      });
      const ids = versionIds.map((v) => v.id);
      if (ids.length > 0) {
        await tx.quotationItem.deleteMany({ where: { quotationVersionId: { in: ids } } });
        await tx.quotationVersion.deleteMany({ where: { id: { in: ids } } });
      }
      await tx.quotation.deleteMany({ where: { inquiryId: id } });

      await tx.inquiry.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    return NextResponse.json({ error: "Failed to delete inquiry" }, { status: 500 });
  }
}
