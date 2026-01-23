import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const items = await db.item.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, brand, unitPrice, taxPercent, marginPercent, uom, category, sku, isActive } = body;

    const { db } = await import("@/lib/db");

    const item = await db.item.create({
      data: {
        name,
        description,
        brand,
        unitPrice,
        taxPercent,
        marginPercent,
        uom,
        category,
        sku,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
