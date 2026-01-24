import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const inquiries = await db.inquiry.findMany({
      include: {
        client: true,
        media: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      title, 
      notes, 
      siteAddress,
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

    const inquiry = await db.inquiry.create({
      data: {
        clientId,
        title,
        notes,
        siteAddress,
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
        status: "NEW",
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json(inquiry);
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}
