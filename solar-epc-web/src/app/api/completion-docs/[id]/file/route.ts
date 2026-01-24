import { NextResponse } from "next/server";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getContentType = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import("@/lib/db");

    const doc = await db.completionDocument.findUnique({
      where: { id },
    });

    if (!doc?.fileUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (doc.fileUrl.startsWith("http")) {
      return NextResponse.redirect(doc.fileUrl, 302);
    }

    const relativePath = doc.fileUrl.replace(/^\/+/, "");
    const filePath = join(process.cwd(), "public", relativePath);

    const { readFile, stat } = await import("fs/promises");
    try {
      await stat(filePath);
    } catch (error) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileName = relativePath.split("/").pop() || "document";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getContentType(fileName),
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error serving document:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
