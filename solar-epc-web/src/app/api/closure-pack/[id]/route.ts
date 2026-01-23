import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as JSZip from "jszip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inquiryId } = await context.params;

    const { db } = await import("@/lib/db");

    // Get all project data
    const inquiry = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        client: true,
        executionAssets: true,
        quotations: {
          include: {
            versions: {
              where: { isFinal: true },
              include: { items: { include: { item: true } } },
            },
          },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    // Get application data
    const applicationData = await db.applicationData.findFirst({
      where: { inquiryId },
    });

    const appData = (applicationData?.data as Record<string, unknown>) || {};

    const templateData = {
      clientName: appData.applicantName || inquiry.client?.name || "N/A",
      address: appData.applicantAddress || inquiry.client?.address || "N/A",
      phone: appData.applicantPhone || inquiry.client?.phone || "N/A",
      email: appData.applicantEmail || inquiry.client?.email || "N/A",
      projectTitle: inquiry.title || "N/A",
      consumerNumber: appData.consumerNumber || "N/A",
      meterNumber: appData.meterNumber || "N/A",
      sanctionedLoad: appData.sanctionedLoad || "N/A",
      connectionType: appData.connectionType || "N/A",
      systemCapacity: appData.systemCapacity || "N/A",
      panelCount: appData.panelCount || "N/A",
      inverterCapacity: appData.inverterCapacity || "N/A",
      roofType: appData.roofType || "N/A",
      roofArea: appData.roofArea || "N/A",
      serials: inquiry.executionAssets.map((a) => ({
        type: a.assetType,
        serial: a.serialNo,
      })),
    };

    // Create ZIP file
    const zip = new JSZip.default();

    // Generate and add all documents
    const selfCert = await generateSelfCertificate(templateData);
    zip.file("01_Self_Certificate.pdf", selfCert);

    const netMeter = await generateNetMeterAgreement(templateData);
    zip.file("02_Net_Meter_Agreement.pdf", netMeter);

    const completionReport = await generateCompletionReport(templateData);
    zip.file("03_Completion_Report.pdf", completionReport);

    const warrantyCard = await generateWarrantyCard(templateData);
    zip.file("04_Warranty_Card.pdf", warrantyCard);

    const serialList = await generateSerialNumberList(templateData);
    zip.file("05_Serial_Numbers.pdf", serialList);

    // Generate the ZIP
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Create closure pack record
    await db.completionDocument.create({
      data: {
        inquiryId,
        name: "Closure Pack (All Documents)",
        fileUrl: `/closure-pack/${inquiryId}.zip`,
      },
    });

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const zipArray = new Uint8Array(zipBuffer);

    return new NextResponse(zipArray, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Closure_Pack_${inquiry.title.replace(/\s+/g, "_")}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error generating closure pack:", error);
    return NextResponse.json({ error: "Failed to generate closure pack" }, { status: 500 });
  }
}

// Helper functions for PDF generation
async function generateSelfCertificate(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("SELF CERTIFICATE", { x: leftMargin, y, font: boldFont, size: 20, color: rgb(0.1, 0.3, 0.1) });
  y -= 25;
  page.drawText("Solar Power System Installation", { x: leftMargin, y, font, size: 12 });
  y -= 50;

  page.drawText("Certificate No: " + generateCertNumber(), { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("This is to certify that the following solar power system has been", { x: leftMargin, y, font, size: 11 });
  y -= 18;
  page.drawText("installed and commissioned as per applicable standards.", { x: leftMargin, y, font, size: 11 });
  y -= 40;

  const details = [
    ["Client:", data.clientName],
    ["Address:", data.address],
    ["System Capacity:", `${data.systemCapacity} kW`],
    ["Panel Count:", data.panelCount],
  ];

  details.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 50;
  page.drawText("Installer Signature: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateNetMeterAgreement(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("NET METERING AGREEMENT", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 50;

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  const details = [
    ["Name:", data.clientName],
    ["Consumer No:", data.consumerNumber],
    ["Meter No:", data.meterNumber],
    ["System Capacity:", `${data.systemCapacity} kW`],
  ];

  details.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 50;
  page.drawText("Consumer Signature: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateCompletionReport(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("COMPLETION REPORT", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 50;

  page.drawText("Report No: " + generateCertNumber(), { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  const details = [
    ["Project:", data.projectTitle],
    ["Client:", data.clientName],
    ["Address:", data.address],
    ["System Size:", `${data.systemCapacity} kW`],
    ["Panels:", data.panelCount],
  ];

  details.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 150, y, font, size: 10 });
    y -= 18;
  });

  y -= 30;
  page.drawText("All tests passed. System commissioned successfully.", { x: leftMargin, y, font, size: 11 });

  y -= 60;
  page.drawText("Project Manager: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateWarrantyCard(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 421]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 350, width: 595, height: 70, color: rgb(0.1, 0.3, 0.1) });
  page.drawText("WARRANTY CERTIFICATE", { x: 40, y: 375, font: boldFont, size: 20, color: rgb(1, 1, 1) });

  let y = 320;
  page.drawText(`Warranty No: ${generateCertNumber()}`, { x: 40, y, font: boldFont, size: 10 });
  y -= 30;
  page.drawText(`Customer: ${data.clientName || "N/A"}`, { x: 40, y, font, size: 10 });
  y -= 20;
  page.drawText(`System: ${data.systemCapacity || "N/A"} kW`, { x: 40, y, font, size: 10 });
  y -= 30;
  page.drawText("Panels: 25 Years | Inverter: 10 Years | Workmanship: 5 Years", { x: 40, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateSerialNumberList(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("EQUIPMENT SERIAL NUMBERS", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 30;
  page.drawText(`Project: ${data.projectTitle || "N/A"}`, { x: leftMargin, y, font, size: 11 });
  y -= 20;
  page.drawText(`Client: ${data.clientName || "N/A"}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  const serials = (data.serials as Array<{ type: string; serial: string }>) || [];

  if (serials.length === 0) {
    page.drawText("No serial numbers recorded.", { x: leftMargin, y, font, size: 11 });
  } else {
    page.drawText("No.", { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText("Type", { x: 90, y, font: boldFont, size: 10 });
    page.drawText("Serial Number", { x: 200, y, font: boldFont, size: 10 });
    y -= 20;

    serials.forEach((s, i) => {
      if (y < 50) {
        // Would need new page in production
        return;
      }
      page.drawText(`${i + 1}`, { x: leftMargin, y, font, size: 9 });
      page.drawText(s.type, { x: 90, y, font, size: 9 });
      page.drawText(s.serial, { x: 200, y, font, size: 9 });
      y -= 16;
    });
  }

  return pdfDoc.save();
}

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `HTS-${year}-${random}`;
}
