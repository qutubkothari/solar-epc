import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const media = await db.inquiryMedia.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(media);
  } catch (error) {
    console.error("Error fetching inquiry media:", error);
    return NextResponse.json({ error: "Failed to fetch inquiry media" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, fileName, fileType, fileUrl } = body;

    const { db } = await import("@/lib/db");
    const media = await db.inquiryMedia.create({
      data: {
        inquiryId,
        fileName,
        fileType,
        fileUrl,
      },
      include: {
        inquiry: true,
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("Error creating inquiry media:", error);
    return NextResponse.json({ error: "Failed to create inquiry media" }, { status: 500 });
  }
}
