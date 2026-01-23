import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
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
    const {
      name,
      contactName,
      email,
      phone,
      phoneAlt,
      mobile,
      website,
      industry,
      companyType,
      taxId,
      registrationNo,
      address,
      billingAddress,
      shippingAddress,
      city,
      state,
      country,
      postalCode,
      currency,
      creditLimit,
      paymentTerms,
      accountManager,
      status,
      notes,
    } = body;

    const { db } = await import("@/lib/db");

    const client = await db.client.create({
      data: {
        name,
        contactName,
        email,
        phone,
        phoneAlt,
        mobile,
        website,
        industry,
        companyType,
        taxId,
        registrationNo,
        address,
        billingAddress,
        shippingAddress,
        city,
        state,
        country,
        postalCode,
        currency,
        creditLimit,
        paymentTerms,
        accountManager,
        status,
        notes,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
