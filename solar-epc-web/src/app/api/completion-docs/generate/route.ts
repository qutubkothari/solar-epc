import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPLETION_TEMPLATES = {
  "self-certificate": {
    title: "Self Certificate",
    generate: async (data: Record<string, unknown>) => generateSelfCertificate(data),
  },
  "net-meter-agreement": {
    title: "Net Meter Agreement",
    generate: async (data: Record<string, unknown>) => generateNetMeterAgreement(data),
  },
  "completion-report": {
    title: "Completion Report",
    generate: async (data: Record<string, unknown>) => generateCompletionReport(data),
  },
  "warranty-card": {
    title: "Warranty Card",
    generate: async (data: Record<string, unknown>) => generateWarrantyCard(data),
  },
};

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
  page.drawText("installed and commissioned as per applicable standards and regulations.", { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("INSTALLATION DETAILS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const details = [
    ["Client Name:", data.clientName],
    ["Installation Address:", data.address],
    ["Consumer Number:", data.consumerNumber],
    ["System Capacity:", `${data.systemCapacity} kW`],
    ["Panel Count:", data.panelCount],
    ["Inverter Capacity:", `${data.inverterCapacity} kW`],
    ["Installation Date:", data.installationDate || new Date().toLocaleDateString()],
    ["Commissioning Date:", data.commissioningDate || new Date().toLocaleDateString()],
  ];

  details.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 200, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("EQUIPMENT SERIAL NUMBERS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const serials = (data.serials as Array<{ type: string; serial: string }>) || [];
  if (serials.length > 0) {
    serials.slice(0, 10).forEach((s, i) => {
      page.drawText(`${i + 1}. ${s.type}: ${s.serial}`, { x: leftMargin, y, font, size: 9 });
      y -= 16;
    });
    if (serials.length > 10) {
      page.drawText(`... and ${serials.length - 10} more items`, { x: leftMargin, y, font, size: 9 });
      y -= 16;
    }
  } else {
    page.drawText("Serial numbers attached separately.", { x: leftMargin, y, font, size: 10 });
    y -= 16;
  }

  y -= 30;
  page.drawText("DECLARATION", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 20;

  const declaration = "We hereby declare that the installation has been completed in accordance with all applicable electrical codes, safety standards, and manufacturer specifications. The system has been tested and is functioning as designed.";
  const declLines = wrapText(declaration, 75);
  declLines.forEach((line) => {
    page.drawText(line, { x: leftMargin, y, font, size: 10 });
    y -= 16;
  });

  y -= 40;
  page.drawText("Installer Signature: _______________________", { x: leftMargin, y, font, size: 10 });
  page.drawText("Client Signature: _______________________", { x: 320, y, font, size: 10 });
  y -= 30;
  page.drawText("Hi-Tech Solar Solutions", { x: leftMargin, y, font: boldFont, size: 10 });

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

  page.drawText(`Agreement Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("CONSUMER DETAILS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const consumerDetails = [
    ["Name:", data.clientName],
    ["Address:", data.address],
    ["Consumer No:", data.consumerNumber],
    ["Meter No:", data.meterNumber],
    ["Sanctioned Load:", `${data.sanctionedLoad} kW`],
  ];

  consumerDetails.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("SOLAR SYSTEM DETAILS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const systemDetails = [
    ["System Capacity:", `${data.systemCapacity} kW`],
    ["Annual Generation (Est.):", `${Number(data.systemCapacity || 0) * 1500} kWh`],
    ["Inverter Capacity:", `${data.inverterCapacity} kW`],
  ];

  systemDetails.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("TERMS OF AGREEMENT", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 20;

  const terms = [
    "1. The consumer agrees to sell excess power generated to the utility.",
    "2. The utility agrees to purchase excess power at applicable tariff rates.",
    "3. A bi-directional meter will be installed to record import/export.",
    "4. The agreement is valid for 25 years from commissioning date.",
    "5. Either party may terminate with 90 days written notice.",
    "6. The consumer is responsible for system maintenance.",
    "7. Safety and technical standards must be maintained at all times.",
  ];

  terms.forEach((term) => {
    const lines = wrapText(term, 75);
    lines.forEach((line) => {
      page.drawText(line, { x: leftMargin, y, font, size: 10 });
      y -= 16;
    });
    y -= 3;
  });

  y -= 30;
  page.drawText("Consumer Signature: _______________________", { x: leftMargin, y, font, size: 10 });
  y -= 30;
  page.drawText("Utility Representative: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateCompletionReport(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("PROJECT COMPLETION REPORT", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 50;

  page.drawText("Report No: " + generateCertNumber(), { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("1. PROJECT OVERVIEW", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const overview = [
    ["Project Name:", data.projectTitle],
    ["Client:", data.clientName],
    ["Location:", data.address],
    ["System Size:", `${data.systemCapacity} kW`],
  ];

  overview.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("2. INSTALLATION SUMMARY", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const installation = [
    ["Panels Installed:", data.panelCount],
    ["Inverters Installed:", "1"],
    ["Mounting Type:", data.roofType],
    ["Cabling:", "Completed as per design"],
    ["Earthing:", "Installed and tested"],
  ];

  installation.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value || "N/A"), { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("3. TESTING & COMMISSIONING", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const tests = [
    ["Open Circuit Voltage:", "PASS"],
    ["Short Circuit Current:", "PASS"],
    ["Insulation Resistance:", "PASS"],
    ["Earth Continuity:", "PASS"],
    ["Inverter Sync Test:", "PASS"],
    ["Grid Export Test:", "PASS"],
  ];

  tests.forEach(([label, value]) => {
    page.drawText(String(label), { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(String(value), { x: 200, y, font, size: 10, color: rgb(0, 0.5, 0) });
    y -= 18;
  });

  y -= 20;
  page.drawText("4. HANDOVER CHECKLIST", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 20;

  const checklist = [
    "✓ System operational and generating power",
    "✓ Client trained on monitoring and basic maintenance",
    "✓ All documentation provided to client",
    "✓ Warranty cards issued",
    "✓ Emergency contact information provided",
  ];

  checklist.forEach((item) => {
    page.drawText(item, { x: leftMargin, y, font, size: 10 });
    y -= 18;
  });

  y -= 30;
  page.drawText("Project Manager: _______________________", { x: leftMargin, y, font, size: 10 });
  y -= 25;
  page.drawText("Client Acceptance: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateWarrantyCard(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 421]); // A5 landscape
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 380;
  const leftMargin = 40;

  // Header
  page.drawRectangle({ x: 0, y: 350, width: 595, height: 70, color: rgb(0.1, 0.3, 0.1) });
  page.drawText("WARRANTY CERTIFICATE", { x: leftMargin, y: 375, font: boldFont, size: 20, color: rgb(1, 1, 1) });
  page.drawText("Hi-Tech Solar Solutions", { x: leftMargin, y: 355, font, size: 11, color: rgb(1, 1, 1) });

  y = 320;

  page.drawText(`Warranty No: ${generateCertNumber()}`, { x: leftMargin, y, font: boldFont, size: 10 });
  page.drawText(`Issue Date: ${new Date().toLocaleDateString()}`, { x: 350, y, font, size: 10 });
  y -= 30;

  page.drawText("CUSTOMER INFORMATION", { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Name: ${data.clientName || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 16;
  page.drawText(`Address: ${data.address || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 30;

  page.drawText("WARRANTY COVERAGE", { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;

  const warranties = [
    ["Solar Panels:", "25 Years Performance Warranty"],
    ["Inverter:", "10 Years Manufacturer Warranty"],
    ["Mounting Structure:", "10 Years Against Corrosion"],
    ["Workmanship:", "5 Years Installation Warranty"],
  ];

  warranties.forEach(([item, coverage]) => {
    page.drawText(String(item), { x: leftMargin, y, font: boldFont, size: 9 });
    page.drawText(String(coverage), { x: 180, y, font, size: 9 });
    y -= 16;
  });

  y -= 20;
  page.drawText("System Details:", { x: leftMargin, y, font: boldFont, size: 10 });
  y -= 16;
  page.drawText(`Capacity: ${data.systemCapacity || "N/A"} kW | Panels: ${data.panelCount || "N/A"} | Inverter: ${data.inverterCapacity || "N/A"} kW`, { x: leftMargin, y, font, size: 9 });

  y -= 30;
  page.drawText("Authorized Signature: _________________", { x: leftMargin, y, font, size: 10 });
  page.drawText("Customer: _________________", { x: 320, y, font, size: 10 });

  return pdfDoc.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `HTS-${year}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, templateType } = body;

    const { db } = await import("@/lib/db");

    // Get inquiry with all related data
    const inquiry = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        client: true,
        executionAssets: true,
      },
    });

    // Get application data
    const applicationData = await db.applicationData.findFirst({
      where: { inquiryId },
    });

    const appData = (applicationData?.data as Record<string, unknown>) || {};

    // Get serials
    const serials = inquiry?.executionAssets?.map((a) => ({
      type: a.assetType,
      serial: a.serialNo,
    })) || [];

    const templateData = {
      clientName: appData.applicantName || inquiry?.client?.name || "N/A",
      address: appData.applicantAddress || inquiry?.client?.address || "N/A",
      phone: appData.applicantPhone || inquiry?.client?.phone || "N/A",
      email: appData.applicantEmail || inquiry?.client?.email || "N/A",
      projectTitle: inquiry?.title || "N/A",
      consumerNumber: appData.consumerNumber || "N/A",
      meterNumber: appData.meterNumber || "N/A",
      sanctionedLoad: appData.sanctionedLoad || "N/A",
      connectionType: appData.connectionType || "N/A",
      systemCapacity: appData.systemCapacity || "N/A",
      panelCount: appData.panelCount || "N/A",
      inverterCapacity: appData.inverterCapacity || "N/A",
      roofType: appData.roofType || "N/A",
      roofArea: appData.roofArea || "N/A",
      serials,
    };

    const template = COMPLETION_TEMPLATES[templateType as keyof typeof COMPLETION_TEMPLATES];
    if (!template) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const pdfBytes = await template.generate(templateData);

    // Save the document record
    const doc = await db.completionDocument.create({
      data: {
        inquiryId,
        name: template.title,
        fileUrl: `/generated/${templateType}-${inquiryId}.pdf`,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template.title.replace(/\s+/g, "_")}.pdf"`,
        "X-Document-Id": doc.id,
      },
    });
  } catch (error) {
    console.error("Error generating completion document:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    templates: Object.entries(COMPLETION_TEMPLATES).map(([key, value]) => ({
      id: key,
      title: value.title,
    })),
  });
}
