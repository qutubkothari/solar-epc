import { NextResponse } from "next/server";
import { getQuotationWriteups } from "@/lib/quotation-writeups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WriteupPayload = {
  key?: unknown;
  title?: unknown;
  content?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET() {
  try {
    const writeups = await getQuotationWriteups();
    return NextResponse.json(writeups);
  } catch (error) {
    console.error("Error fetching quotation writeups:", error);
    return NextResponse.json({ error: "Failed to fetch quotation writeups" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : null;

    if (!items) {
      return NextResponse.json({ error: "Writeup items are required" }, { status: 400 });
    }

    const { db } = await import("@/lib/db");
    const sanitizedItems = (items as WriteupPayload[])
      .map((item) => ({
        key: asString(item.key).trim(),
        title: asString(item.title).trim(),
        content: asString(item.content).trim(),
        sortOrder: asNumber(item.sortOrder, 0),
        isActive: item.isActive !== false,
      }))
      .filter((item) => item.key);

    await Promise.all(
      sanitizedItems.map((item) =>
        db.quotationWriteup.upsert({
          where: { key: item.key },
          update: {
            title: item.title,
            content: item.content,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          },
          create: item,
        })
      )
    );

    const writeups = await getQuotationWriteups();
    return NextResponse.json(writeups);
  } catch (error) {
    console.error("Error updating quotation writeups:", error);
    return NextResponse.json({ error: "Failed to update quotation writeups" }, { status: 500 });
  }
}