import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateToken = () => crypto.randomBytes(4).toString("hex").toUpperCase();

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const tokens = await db.tokenAccess.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: true,
        inquiry: true,
      },
    });
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, inquiryId, allowDownload, expiresAt } = body;

    const { db } = await import("@/lib/db");
    const token = await db.tokenAccess.create({
      data: {
        clientId,
        inquiryId,
        token: generateToken(),
        allowDownload: allowDownload ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        client: true,
        inquiry: true,
      },
    });

    return NextResponse.json(token);
  } catch (error) {
    console.error("Error creating token:", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
