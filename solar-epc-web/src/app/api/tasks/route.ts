import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const tasks = await db.task.findMany({
      include: {
        createdBy: true,
        inquiry: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, dueDate, inquiryId } = body;

    const { db } = await import("@/lib/db");
    const { getSystemUser } = await import("@/lib/system-user");
    const systemUser = await getSystemUser();

    const task = await db.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: systemUser.id,
        assignedToId: systemUser.id,
        inquiryId: inquiryId || null,
      },
      include: {
        createdBy: true,
        inquiry: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";import { NextResponse } from "next/server";

















































}  }    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });    console.error("Error creating task:", error);  } catch (error) {    return NextResponse.json(task);    });      },        assignedTo: true,      include: {      },        status: "OPEN",        createdById,        assignedToId: assignedToId || null,        dueDate: dueDate ? new Date(dueDate) : null,        description,        title,      data: {    const task = await db.task.create({    const { db } = await import("@/lib/db");    const { title, description, dueDate, assignedToId, createdById } = body;    const body = await request.json();  try {export async function POST(request: Request) {}  }    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });    console.error("Error fetching tasks:", error);  } catch (error) {    return NextResponse.json(tasks);    });      },        assignedTo: true,      include: {      },        createdAt: "desc",      orderBy: {    const tasks = await db.task.findMany({    const { db } = await import("@/lib/db");  try {export async function GET() {export const dynamic = "force-dynamic";export const runtime = "nodejs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const tasks = await db.task.findMany({
      include: {
        createdBy: true,
        inquiry: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, dueDate, inquiryId } = body;

    const { db } = await import("@/lib/db");
    const { getSystemUser } = await import("@/lib/system-user");
    const systemUser = await getSystemUser();

    const task = await db.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: systemUser.id,
        assignedToId: systemUser.id,
        inquiryId: inquiryId || null,
      },
      include: {
        createdBy: true,
        inquiry: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
