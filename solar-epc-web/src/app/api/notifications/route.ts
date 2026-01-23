import { NextResponse } from "next/server";
import { formatCurrency } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Email configuration - in production, use environment variables
const EMAIL_CONFIG = {
  from: "noreply@hitechsolar.com",
  replyTo: "support@hitechsolar.com",
};

type NotificationTrigger = 
  | "QUOTATION_FINALIZED"
  | "STATUTORY_DOCS_READY"
  | "CLOSURE_PACK_READY"
  | "TASK_ASSIGNED"
  | "TASK_DUE_REMINDER";

interface NotificationPayload {
  trigger: NotificationTrigger;
  inquiryId?: string;
  taskId?: string;
  recipientEmail?: string;
  recipientName?: string;
  customData?: Record<string, string>;
}

const NOTIFICATION_TEMPLATES: Record<NotificationTrigger, {
  subject: (data: Record<string, string>) => string;
  body: (data: Record<string, string>) => string;
}> = {
  QUOTATION_FINALIZED: {
    subject: (data) => `Quotation Finalized - ${data.projectTitle}`,
    body: (data) => `
Dear Team,

A quotation has been finalized and is ready for processing.

Project: ${data.projectTitle}
Client: ${data.clientName}
Total Value: ${data.totalValue}
Version: ${data.version}

Please proceed with the next steps in the workflow.

Best regards,
Hi-Tech Solar Solutions System
    `.trim(),
  },
  STATUTORY_DOCS_READY: {
    subject: (data) => `Statutory Documents Ready - ${data.projectTitle}`,
    body: (data) => `
Dear Team,

All statutory documents have been generated for the following project:

Project: ${data.projectTitle}
Client: ${data.clientName}

Documents generated:
- Terms & Conditions
- Solar Installation Agreement
- Authorization Letter
- DG NOC Application
- Undertaking

Please review and proceed with client signatures.

Best regards,
Hi-Tech Solar Solutions System
    `.trim(),
  },
  CLOSURE_PACK_READY: {
    subject: (data) => `Project Closure Pack Ready - ${data.projectTitle}`,
    body: (data) => `
Dear ${data.recipientName || "Valued Customer"},

Great news! Your solar installation project has been completed successfully.

Project: ${data.projectTitle}
System Capacity: ${data.systemCapacity} kW

Your complete document pack is ready and can be accessed using the link below:

${data.tokenLink}

The pack includes:
- Self Certificate
- Net Meter Agreement
- Completion Report
- Warranty Card
- Serial Number List

Thank you for choosing Hi-Tech Solar Solutions. Enjoy your clean energy!

Best regards,
Hi-Tech Solar Solutions Team
    `.trim(),
  },
  TASK_ASSIGNED: {
    subject: (data) => `New Task Assigned - ${data.taskTitle}`,
    body: (data) => `
Dear ${data.assigneeName},

A new task has been assigned to you:

Task: ${data.taskTitle}
Project: ${data.projectTitle}
Due Date: ${data.dueDate}
Priority: ${data.priority || "Normal"}

Description:
${data.description || "No additional details provided."}

Please complete this task by the due date.

Best regards,
Hi-Tech Solar Solutions System
    `.trim(),
  },
  TASK_DUE_REMINDER: {
    subject: (data) => `Task Due Reminder - ${data.taskTitle}`,
    body: (data) => `
Dear ${data.assigneeName},

This is a reminder that the following task is due:

Task: ${data.taskTitle}
Project: ${data.projectTitle}
Due Date: ${data.dueDate}

Please ensure this task is completed on time.

Best regards,
Hi-Tech Solar Solutions System
    `.trim(),
  },
};

export async function POST(request: Request) {
  try {
    const body: NotificationPayload = await request.json();
    const { trigger, inquiryId, taskId, recipientEmail, recipientName, customData } = body;

    const { db } = await import("@/lib/db");

    // Build template data based on trigger type
    let templateData: Record<string, string> = { ...customData };

    if (inquiryId) {
      const inquiry = await db.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          client: true,
          quotations: {
            include: {
              versions: {
                where: { isFinal: true },
                take: 1,
              },
            },
          },
          tokenAccess: {
            take: 1,
          },
        },
      });

      if (inquiry) {
        const applicationData = await db.applicationData.findFirst({
          where: { inquiryId },
        });
        const appData = (applicationData?.data as Record<string, string>) || {};

        templateData = {
          ...templateData,
          projectTitle: inquiry.title,
          clientName: inquiry.client?.name || "N/A",
          clientEmail: inquiry.client?.email || "",
          systemCapacity: appData.systemCapacity || "N/A",
        };

        if (inquiry.quotations?.[0]?.versions?.[0]) {
          const version = inquiry.quotations[0].versions[0];
          templateData.totalValue = formatCurrency(Number(version.grandTotal || 0));
          templateData.version = version.version;
        }

        if (inquiry.tokenAccess?.[0]) {
          templateData.tokenLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/token/${inquiry.tokenAccess[0].token}`;
        }
      }
    }

    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          assignedTo: true,
          inquiry: true,
        },
      });

      if (task) {
        templateData = {
          ...templateData,
          taskTitle: task.title,
          description: task.description || "",
          dueDate: task.dueDate?.toLocaleDateString() || "Not set",
          assigneeName: task.assignedTo?.name || "Team",
          assigneeEmail: task.assignedTo?.email || "",
          projectTitle: task.inquiry?.title || "General",
        };
      }
    }

    if (recipientName) {
      templateData.recipientName = recipientName;
    }

    const template = NOTIFICATION_TEMPLATES[trigger];
    if (!template) {
      return NextResponse.json({ error: "Invalid notification trigger" }, { status: 400 });
    }

    const subject = template.subject(templateData);
    const bodyText = template.body(templateData);

    // Determine recipient
    const toEmail = recipientEmail || templateData.assigneeEmail || templateData.clientEmail;

    if (!toEmail) {
      // Log notification but don't fail if no email
      console.log("No recipient email, logging notification only");
    }

    // Store notification in database
    const notification = await db.notification.create({
      data: {
        channel: "EMAIL",
        title: subject,
        message: bodyText,
      },
    });

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate sending
    console.log("=== EMAIL NOTIFICATION ===");
    console.log(`To: ${toEmail || "NO_RECIPIENT"}`);
    console.log(`From: ${EMAIL_CONFIG.from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${bodyText}`);
    console.log("=========================");

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      trigger,
      recipient: toEmail || null,
      subject,
      message: "Email notification queued successfully",
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
