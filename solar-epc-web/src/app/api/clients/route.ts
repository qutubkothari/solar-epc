import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await db.client.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactName, email, phone, address, notes } = body;

    const client = await db.client.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        notes,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
