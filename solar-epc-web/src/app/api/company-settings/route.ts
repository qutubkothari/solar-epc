import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    
    let settings = await db.companySettings.findUnique({
      where: { id: "default" },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await db.companySettings.create({
        data: {
          id: "default",
          companyName: "Hi-Tech Solar",
          companyTagline: "Powering Tomorrow, Today",
          primaryColor: "#F59E0B",
          secondaryColor: "#059669",
          accentColor: "#0F172A",
          footerText: "© 2026 Hi-Tech Solar. All rights reserved.",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch company settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { db } = await import("@/lib/db");

    const settings = await db.companySettings.upsert({
      where: { id: "default" },
      update: body,
      create: {
        id: "default",
        ...body,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating company settings:", error);
    return NextResponse.json(
      { error: "Failed to update company settings" },
      { status: 500 }
    );
  }
}
