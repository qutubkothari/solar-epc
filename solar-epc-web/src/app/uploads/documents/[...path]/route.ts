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
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const relativePath = path.join("/");
    const filePath = join(process.cwd(), "public", "uploads", "documents", relativePath);

    const { readFile, stat } = await import("fs/promises");
    try {
      await stat(filePath);
    } catch (error) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileName = path[path.length - 1] || "document";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getContentType(fileName),
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error serving upload:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
