import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET single client with all related data
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    
    const client = await db.client.findUnique({
      where: { id },
      include: {
        inquiries: {
          orderBy: { createdAt: "desc" },
        },
        quotations: {
          include: {
            versions: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        },
        technicalProposals: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// PATCH for partial updates (for follow-up)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { db } = await import("@/lib/db");
    
    const client = await db.client.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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
      lastContactDate,
      nextFollowupDate,
      followupNotes,
    } = body;

    const { db } = await import("@/lib/db");
    const client = await db.client.update({
      where: { id },
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
        lastContactDate,
        nextFollowupDate,
        followupNotes,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { db } = await import("@/lib/db");
    await db.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
