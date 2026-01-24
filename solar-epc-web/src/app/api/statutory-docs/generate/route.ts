import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sanitize text for PDF - replace ₹ with Rs. and strip non-ASCII
const sanitizeForPdf = (text: string): string => {
  return text.replace(/₹/g, "Rs.").replace(/[^\x00-\x7F]/g, "");
};

// Format currency for PDF (uses Rs. instead of ₹)
const formatCurrencyForPdf = (value: number): string => {
  return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const DOCUMENT_TEMPLATES = {
  "terms-conditions": {
    title: "Terms & Conditions",
    generate: async (data: Record<string, unknown>) => generateTermsConditions(data),
  },
  "agreement": {
    title: "Solar Installation Agreement",
    generate: async (data: Record<string, unknown>) => generateAgreement(data),
  },
  "authorization": {
    title: "Authorization Letter",
    generate: async (data: Record<string, unknown>) => generateAuthorization(data),
  },
  "dg-noc": {
    title: "DG NOC Application",
    generate: async (data: Record<string, unknown>) => generateDGNOC(data),
  },
  "undertaking": {
    title: "Undertaking",
    generate: async (data: Record<string, unknown>) => generateUndertaking(data),
  },
};

async function generateTermsConditions(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("TERMS & CONDITIONS", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 30;
  page.drawText("Solar Installation Project", { x: leftMargin, y, font, size: 12 });
  y -= 40;

  page.drawText(`Client: ${data.clientName || "N/A"}`, { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Project: ${data.projectTitle || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 10 });
  y -= 40;

  const terms = [
    "1. Payment Terms: 50% advance, 40% on delivery, 10% on commissioning.",
    "2. Warranty: 25 years on panels, 10 years on inverter, 5 years on workmanship.",
    "3. Installation: Will be completed within 15-30 working days from payment.",
    "4. Maintenance: Annual maintenance contract available separately.",
    "5. Net Metering: Company will assist with all regulatory approvals.",
    "6. Insurance: Equipment covered during transportation and installation.",
    "7. Force Majeure: Neither party liable for delays beyond control.",
    "8. Dispute Resolution: Arbitration under local jurisdiction.",
    "9. Cancellation: 10% fee if cancelled after material procurement.",
    "10. Acceptance: Client accepts these terms upon signing quotation.",
  ];

  terms.forEach((term) => {
    const lines = wrapText(term, 80);
    lines.forEach((line) => {
      page.drawText(line, { x: leftMargin, y, font, size: 10 });
      y -= 18;
    });
    y -= 5;
  });

  y -= 40;
  page.drawText("Authorized Signature: _______________________", { x: leftMargin, y, font, size: 10 });
  y -= 30;
  page.drawText("Date: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateAgreement(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("SOLAR INSTALLATION AGREEMENT", { x: leftMargin, y, font: boldFont, size: 16, color: rgb(0.1, 0.3, 0.1) });
  y -= 40;

  page.drawText("This Agreement is entered into between:", { x: leftMargin, y, font, size: 11 });
  y -= 30;

  page.drawText("FIRST PARTY (Installer):", { x: leftMargin, y, font: boldFont, size: 10 });
  y -= 18;
  page.drawText("Hi-Tech Solar Solutions", { x: leftMargin, y, font, size: 10 });
  y -= 30;

  page.drawText("SECOND PARTY (Client):", { x: leftMargin, y, font: boldFont, size: 10 });
  y -= 18;
  page.drawText(`Name: ${data.clientName || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 16;
  page.drawText(`Address: ${data.address || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 16;
  page.drawText(`Phone: ${data.phone || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 30;

  page.drawText("PROJECT DETAILS:", { x: leftMargin, y, font: boldFont, size: 10 });
  y -= 18;
  page.drawText(`System Capacity: ${data.systemCapacity || "N/A"} kW`, { x: leftMargin, y, font, size: 10 });
  y -= 16;
  page.drawText(`Panel Count: ${data.panelCount || "N/A"}`, { x: leftMargin, y, font, size: 10 });
  y -= 16;
  const totalValue = Number(data.totalValue || 0);
  page.drawText(
    `Total Value: ${Number.isNaN(totalValue) ? "N/A" : formatCurrencyForPdf(totalValue)}`,
    { x: leftMargin, y, font, size: 10 }
  );
  y -= 40;

  page.drawText("AGREED TERMS:", { x: leftMargin, y, font: boldFont, size: 10 });
  y -= 20;

  const clauses = [
    "1. The Installer agrees to supply and install the solar power system as specified.",
    "2. The Client agrees to provide necessary access and approvals for installation.",
    "3. Payment shall be made as per the payment schedule in the quotation.",
    "4. Warranty coverage as specified in Terms & Conditions applies.",
    "5. Both parties agree to resolve disputes amicably.",
  ];

  clauses.forEach((clause) => {
    const lines = wrapText(clause, 80);
    lines.forEach((line) => {
      page.drawText(line, { x: leftMargin, y, font, size: 10 });
      y -= 16;
    });
    y -= 5;
  });

  y -= 50;
  page.drawText("FIRST PARTY", { x: leftMargin, y, font: boldFont, size: 10 });
  page.drawText("SECOND PARTY", { x: 350, y, font: boldFont, size: 10 });
  y -= 40;
  page.drawText("Signature: _______________", { x: leftMargin, y, font, size: 10 });
  page.drawText("Signature: _______________", { x: 350, y, font, size: 10 });
  y -= 25;
  page.drawText("Date: _______________", { x: leftMargin, y, font, size: 10 });
  page.drawText("Date: _______________", { x: 350, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateAuthorization(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("AUTHORIZATION LETTER", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 50;

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("To,", { x: leftMargin, y, font, size: 11 });
  y -= 18;
  page.drawText("The Concerned Authority", { x: leftMargin, y, font, size: 11 });
  y -= 18;
  page.drawText("Distribution Company", { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("Subject: Authorization for Net Metering Application", { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 30;

  page.drawText("Dear Sir/Madam,", { x: leftMargin, y, font, size: 11 });
  y -= 25;

  const body = `I, ${data.clientName || "[Client Name]"}, hereby authorize Hi-Tech Solar Solutions to act on my behalf for the purpose of submitting and processing the net metering application for the solar installation at my premises located at ${data.address || "[Address]"}.`;

  const lines = wrapText(body, 75);
  lines.forEach((line) => {
    page.drawText(line, { x: leftMargin, y, font, size: 11 });
    y -= 18;
  });

  y -= 20;
  page.drawText("Details:", { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Consumer Number: ${data.consumerNumber || "N/A"}`, { x: leftMargin, y, font, size: 11 });
  y -= 16;
  page.drawText(`Meter Number: ${data.meterNumber || "N/A"}`, { x: leftMargin, y, font, size: 11 });
  y -= 16;
  page.drawText(`System Capacity: ${data.systemCapacity || "N/A"} kW`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  page.drawText("Yours faithfully,", { x: leftMargin, y, font, size: 11 });
  y -= 50;
  page.drawText("___________________________", { x: leftMargin, y, font, size: 11 });
  y -= 18;
  page.drawText(`${data.clientName || "[Client Name]"}`, { x: leftMargin, y, font, size: 11 });
  y -= 16;
  page.drawText(`Aadhaar/PAN: _______________`, { x: leftMargin, y, font, size: 11 });

  return pdfDoc.save();
}

async function generateDGNOC(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("DG NOC APPLICATION", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 30;
  page.drawText("Distributed Generation No Objection Certificate", { x: leftMargin, y, font, size: 11 });
  y -= 50;

  page.drawText("APPLICANT INFORMATION", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const applicantFields = [
    ["Name:", data.clientName || "N/A"],
    ["Address:", data.address || "N/A"],
    ["Phone:", data.phone || "N/A"],
    ["Email:", data.email || "N/A"],
    ["Consumer Number:", data.consumerNumber || "N/A"],
    ["Meter Number:", data.meterNumber || "N/A"],
    ["Sanctioned Load:", `${data.sanctionedLoad || "N/A"} kW`],
    ["Connection Type:", data.connectionType || "N/A"],
  ];

  applicantFields.forEach(([label, value]) => {
    page.drawText(label as string, { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(value as string, { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 20;
  page.drawText("PROPOSED SYSTEM DETAILS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;

  const systemFields = [
    ["System Capacity:", `${data.systemCapacity || "N/A"} kW`],
    ["Panel Count:", data.panelCount || "N/A"],
    ["Inverter Capacity:", `${data.inverterCapacity || "N/A"} kW`],
    ["Roof Type:", data.roofType || "N/A"],
    ["Available Area:", `${data.roofArea || "N/A"} sq ft`],
  ];

  systemFields.forEach(([label, value]) => {
    page.drawText(label as string, { x: leftMargin, y, font: boldFont, size: 10 });
    page.drawText(value as string, { x: 180, y, font, size: 10 });
    y -= 18;
  });

  y -= 30;
  page.drawText("INSTALLER DETAILS", { x: leftMargin, y, font: boldFont, size: 12 });
  y -= 25;
  page.drawText("Company: Hi-Tech Solar Solutions", { x: leftMargin, y, font, size: 10 });
  y -= 16;
  page.drawText("License No: SOL-2024-XXXX", { x: leftMargin, y, font, size: 10 });
  y -= 40;

  page.drawText("Applicant Signature: _______________________", { x: leftMargin, y, font, size: 10 });
  y -= 25;
  page.drawText("Date: _______________________", { x: leftMargin, y, font, size: 10 });

  return pdfDoc.save();
}

async function generateUndertaking(data: Record<string, unknown>) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const leftMargin = 50;

  page.drawText("UNDERTAKING", { x: leftMargin, y, font: boldFont, size: 18, color: rgb(0.1, 0.3, 0.1) });
  y -= 50;

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: leftMargin, y, font, size: 11 });
  y -= 40;

  const intro = `I, ${data.clientName || "[Client Name]"}, residing at ${data.address || "[Address]"}, hereby declare and undertake the following:`;
  const introLines = wrapText(intro, 75);
  introLines.forEach((line) => {
    page.drawText(line, { x: leftMargin, y, font, size: 11 });
    y -= 18;
  });

  y -= 20;
  const undertakings = [
    "1. I am the lawful owner/authorized occupant of the premises where the solar system is being installed.",
    "2. I have obtained necessary permissions from building management/authorities if applicable.",
    "3. I understand that the solar system will be connected to the grid subject to utility approval.",
    "4. I will maintain the system as per manufacturer guidelines and installer recommendations.",
    "5. I will not tamper with or modify the system without prior consent from the installer.",
    "6. I understand the safety requirements and will ensure compliance at all times.",
    "7. I authorize the utility company to inspect the installation as required.",
    "8. I accept responsibility for any damages caused due to non-compliance with guidelines.",
  ];

  undertakings.forEach((item) => {
    const lines = wrapText(item, 75);
    lines.forEach((line) => {
      page.drawText(line, { x: leftMargin, y, font, size: 10 });
      y -= 16;
    });
    y -= 5;
  });

  y -= 40;
  page.drawText("___________________________", { x: leftMargin, y, font, size: 11 });
  y -= 18;
  page.drawText(`${data.clientName || "[Client Name]"}`, { x: leftMargin, y, font: boldFont, size: 11 });
  y -= 16;
  page.drawText("(Signature)", { x: leftMargin, y, font, size: 10 });

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, templateType, applicationDataId } = body;

    const { db } = await import("@/lib/db");
    
    // Get inquiry and application data
    const inquiry = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: { client: true },
    });

    let applicationData = null;
    if (applicationDataId) {
      applicationData = await db.applicationData.findUnique({
        where: { id: applicationDataId },
      });
    } else {
      // Try to find application data for this inquiry
      applicationData = await db.applicationData.findFirst({
        where: { inquiryId },
      });
    }

    const appData = (applicationData?.data as Record<string, unknown>) || {};

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
    };

    const template = DOCUMENT_TEMPLATES[templateType as keyof typeof DOCUMENT_TEMPLATES];
    if (!template) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const pdfBytes = await template.generate(templateData);

    // Save the document record (optional - don't fail if this fails)
    try {
      await db.statutoryDocument.create({
        data: {
          inquiryId,
          name: template.title,
          fileUrl: `/generated/${templateType}-${inquiryId}.pdf`,
        },
      });
    } catch (saveError) {
      console.error("Failed to save document record:", saveError);
      // Continue anyway - we still want to return the PDF
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template.title.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating statutory document:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    templates: Object.entries(DOCUMENT_TEMPLATES).map(([key, value]) => ({
      id: key,
      title: value.title,
    })),
  });
}
