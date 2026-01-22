import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const quotations = await db.quotation.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: true,
        versions: true,
      },
    });
    return NextResponse.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, title } = body;

    const { db } = await import("@/lib/db");
    const quotation = await db.quotation.create({
      data: {
        clientId,
        title,
        status: "DRAFT",
        versions: {
          create: {
            version: "1.0",
            isFinal: false,
          },
        },
      },
      include: {
        client: true,
        versions: true,
      },
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error creating quotation:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
