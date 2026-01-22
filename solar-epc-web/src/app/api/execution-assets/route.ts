import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const assets = await db.executionAsset.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching execution assets:", error);
    return NextResponse.json({ error: "Failed to fetch execution assets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, assetType, serialNo } = body;

    const { db } = await import("@/lib/db");
    const asset = await db.executionAsset.create({
      data: {
        inquiryId,
        assetType,
        serialNo,
      },
      include: {
        inquiry: true,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error creating execution asset:", error);
    return NextResponse.json({ error: "Failed to create execution asset" }, { status: 500 });
  }
}
