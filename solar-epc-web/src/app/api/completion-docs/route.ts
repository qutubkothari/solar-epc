import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const docs = await db.completionDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error fetching completion docs:", error);
    return NextResponse.json({ error: "Failed to fetch completion docs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Try to parse as FormData first (for file uploads)
    let isFormData = false;
    let formData: FormData | null = null;
    
    try {
      formData = await request.formData();
      isFormData = true;
    } catch (e) {
      // Not FormData, will try JSON
    }
    
    // Handle file upload (FormData)
    if (isFormData && formData) {
      const file = formData.get('file') as File;
      const inquiryId = formData.get('inquiryId') as string;
      const name = formData.get('name') as string;

      if (!file || !inquiryId) {
        return NextResponse.json({ error: "Missing required fields: file and inquiryId" }, { status: 400 });
      }

      // Save file to public/uploads directory
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents');
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(uploadsDir, fileName);
      
      // Ensure uploads directory exists
      const { mkdir } = await import('fs/promises');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
      
      await writeFile(filePath, buffer);
      
      // Store relative URL in database
      const fileUrl = `/uploads/documents/${fileName}`;

      const { db } = await import("@/lib/db");
      const doc = await db.completionDocument.create({
        data: {
          inquiryId,
          name: name || file.name,
          fileUrl,
        },
        include: {
          inquiry: true,
        },
      });

      return NextResponse.json(doc);
    } 
    
    // Handle JSON data (legacy support)
    const body = await request.json();
    const { inquiryId, name, fileUrl } = body;

    const { db } = await import("@/lib/db");
    const doc = await db.completionDocument.create({
      data: {
        inquiryId,
        name,
        fileUrl,
      },
      include: {
        inquiry: true,
      },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error creating completion doc:", error);
    return NextResponse.json({ 
      error: "Failed to create completion doc",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
