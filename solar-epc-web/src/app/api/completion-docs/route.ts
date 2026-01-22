import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const docs = await db.completionDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error fetching completion docs:", error);
    return NextResponse.json({ error: "Failed to fetch completion docs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, name, fileUrl } = body;

    const { db } = await import("@/lib/db");
    const doc = await db.completionDocument.create({
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
    console.error("Error creating completion doc:", error);
    return NextResponse.json({ error: "Failed to create completion doc" }, { status: 500 });
  }
}
