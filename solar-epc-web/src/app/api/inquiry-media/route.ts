import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const media = await db.inquiryMedia.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        inquiry: true,
      },
    });
    return NextResponse.json(media);
  } catch (error) {
    console.error("Error fetching inquiry media:", error);
    return NextResponse.json({ error: "Failed to fetch inquiry media" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const inquiryId = formData.get('inquiryId') as string;
    const category = formData.get('category') as string;
    const notes = formData.get('notes') as string;
    const latitudeStr = formData.get('latitude') as string;
    const longitudeStr = formData.get('longitude') as string;

    if (!file || !inquiryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save file to public/uploads directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
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
    const fileUrl = `/uploads/${fileName}`;

    const { db } = await import("@/lib/db");
    const media = await db.inquiryMedia.create({
      data: {
        inquiryId,
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'Photo' : file.type.startsWith('video/') ? 'Video' : 'Document',
        fileUrl,
        category: category || null,
        notes: notes || null,
        latitude: latitudeStr ? parseFloat(latitudeStr) : null,
        longitude: longitudeStr ? parseFloat(longitudeStr) : null,
        takenAt: new Date(),
      },
      include: {
        inquiry: true,
      },
    });

    // Update inquiry photo count if it's a photo
    if (file.type.startsWith('image/')) {
      await db.inquiry.update({
        where: { id: inquiryId },
        data: {
          sitePhotosCount: {
            increment: 1
          }
        }
      });
    }

    return NextResponse.json(media);
  } catch (error) {
    console.error("Error creating inquiry media:", error);
    return NextResponse.json({ error: "Failed to create inquiry media" }, { status: 500 });
  }
}
