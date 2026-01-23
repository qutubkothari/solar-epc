import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const datasets = await db.technicalDataset.findMany({
      orderBy: [{ sourceSheet: "asc" }, { rowIndex: "asc" }],
    });
    return NextResponse.json(datasets);
  } catch (error) {
    console.error("Error fetching technical datasets:", error);
    return NextResponse.json({ error: "Failed to fetch technical datasets" }, { status: 500 });
  }
}
