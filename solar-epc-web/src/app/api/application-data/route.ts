import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const applications = await db.applicationData.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: true,
        inquiry: true,
      },
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching application data:", error);
    return NextResponse.json({ error: "Failed to fetch application data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, inquiryId, data } = body;

    const { db } = await import("@/lib/db");
    const application = await db.applicationData.create({
      data: {
        clientId,
        inquiryId: inquiryId || null,
        data,
      },
      include: {
        client: true,
        inquiry: true,
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error creating application data:", error);
    return NextResponse.json({ error: "Failed to create application data" }, { status: 500 });
  }
}
