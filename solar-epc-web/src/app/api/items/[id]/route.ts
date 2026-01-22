import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const { name, description, unitPrice, taxPercent, marginPercent, uom, category } = body;

    const { db } = await import("@/lib/db");
    const item = await db.item.update({
      where: { id: params.id },
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
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
