import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const docs = await db.statutoryDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error fetching statutory docs:", error);
    return NextResponse.json({ error: "Failed to fetch statutory docs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, name, fileUrl } = body;

    const { db } = await import("@/lib/db");
    const doc = await db.statutoryDocument.create({
      data: {
        inquiryId,
        name,
        fileUrl,
      },
      include: {
        inquiry: true,
      },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error creating statutory doc:", error);
    return NextResponse.json({ error: "Failed to create statutory doc" }, { status: 500 });
  }
}
