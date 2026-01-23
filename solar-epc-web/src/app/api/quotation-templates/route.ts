import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const templates = await db.quotationTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching quotation templates:", error);
    return NextResponse.json({ error: "Failed to fetch quotation templates" }, { status: 500 });
  }
}
