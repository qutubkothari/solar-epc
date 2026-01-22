import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const { name, description, unitPrice, taxPercent, marginPercent, uom, category } = body;

    const item = await db.item.create({
      data: {
        name,
        description,
        unitPrice,
        taxPercent,
        marginPercent,
        uom,
        category,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
