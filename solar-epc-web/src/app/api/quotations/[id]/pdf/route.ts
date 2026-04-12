import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCurrency } from "@/lib/format";
import { getBoqDisplayParts } from "@/lib/solar-boq";
import { normalizeQuotationDocumentData } from "@/lib/quotation-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TOP = 42;
const FOOTER_Y = 22;
const FIRST_PAGE_HEADER_HEIGHT = 110;
const CONTINUATION_HEADER_HEIGHT = 74;

type QuoteLine = {
  title: string;
  detail: string;
  quantity: number;
  rate: number;
  amount: number;
};

type Column = {
  key: "title" | "detail" | "quantity" | "rate" | "amount";
  label: string;
  x: number;
  width: number;
  align?: "left" | "right";
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await import("@/lib/db");
    const { id } = await context.params;

    const [companySettings, quotation] = await Promise.all([
      db.companySettings.findUnique({ where: { id: "default" } }),
      db.quotation.findUnique({
        where: { id },
        include: {
          client: true,
          versions: {
            orderBy: { createdAt: "desc" },
            include: {
              items: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (!quotation.versions.length) {
      return NextResponse.json({ error: "No versions found for this quotation" }, { status: 404 });
    }

    const versionId = new URL(request.url).searchParams.get("version");
    const version = versionId
      ? quotation.versions.find((entry) => entry.id === versionId) || quotation.versions[0]
      : quotation.versions[0];

    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages: PDFPage[] = [];

    const sanitizeText = (value: string | null | undefined) =>
      (value || "")
        .replace(/₹/g, "Rs.")
        .replace(/©/g, "(c)")
        .replace(/[^\u0000-\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const parseColor = (hex?: string | null, fallback = "#0F172A") => {
      const normalized = (hex || fallback).replace("#", "");
      if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return rgb(0.06, 0.09, 0.16);
      }

      return rgb(
        parseInt(normalized.slice(0, 2), 16) / 255,
        parseInt(normalized.slice(2, 4), 16) / 255,
        parseInt(normalized.slice(4, 6), 16) / 255
      );
    };

    const primary = parseColor(companySettings?.primaryColor, "#F59E0B");
    const secondary = parseColor(companySettings?.secondaryColor, "#059669");
    const accent = parseColor(companySettings?.accentColor, "#0F172A");
    const muted = rgb(0.39, 0.45, 0.54);
    const border = rgb(0.87, 0.9, 0.94);
    const softFill = rgb(0.98, 0.99, 1);
    const paleFill = rgb(0.95, 0.97, 0.99);
    const white = rgb(1, 1, 1);
    const subtleLine = rgb(0.92, 0.94, 0.97);

    const measureWidth = (text: string, size: number, font: PDFFont) => font.widthOfTextAtSize(text, size);

    const splitLongToken = (token: string, maxWidth: number, size: number, font: PDFFont) => {
      if (measureWidth(token, size, font) <= maxWidth) {
        return [token];
      }

      const parts: string[] = [];
      let current = "";
      for (const char of token) {
        const next = `${current}${char}`;
        if (current && measureWidth(next, size, font) > maxWidth) {
          parts.push(current);
          current = char;
        } else {
          current = next;
        }
      }
      if (current) {
        parts.push(current);
      }
      return parts;
    };

    const wrapText = (text: string, maxWidth: number, size: number, bold = false) => {
      const safe = sanitizeText(text);
      if (!safe) {
        return [""];
      }

      const font = bold ? boldFont : regularFont;
      const tokens = safe
        .split(/\s+/)
        .flatMap((token) => splitLongToken(token, maxWidth, size, font));

      const lines: string[] = [];
      let current = "";

      for (const token of tokens) {
        const next = current ? `${current} ${token}` : token;
        if (measureWidth(next, size, font) <= maxWidth) {
          current = next;
        } else {
          if (current) {
            lines.push(current);
          }
          current = token;
        }
      }

      if (current) {
        lines.push(current);
      }

      return lines.length ? lines : [safe];
    };

    const bulletizeDescription = (text: string, maxWidth: number, size: number) => {
      const safe = sanitizeText(text);
      if (!safe) {
        return ["-"];
      }

      const rawPoints = safe
        .split(/(?<=[.;:])\s+|\s+\|\s+/)
        .map((part) => sanitizeText(part))
        .filter(Boolean);

      const points = rawPoints.length ? rawPoints : [safe];
      const lines: string[] = [];

      for (const point of points) {
        const wrapped = wrapText(point, maxWidth - 12, size);
        wrapped.forEach((line, index) => {
          lines.push(index === 0 ? `- ${line}` : `  ${line}`);
        });
      }

      return lines.slice(0, 10);
    };

    const drawText = (
      page: PDFPage,
      text: string,
      x: number,
      y: number,
      size = 10,
      bold = false,
      color = accent
    ) => {
      const safe = sanitizeText(text);
      if (!safe) {
        return;
      }

      page.drawText(safe, {
        x,
        y,
        size,
        font: bold ? boldFont : regularFont,
        color,
      });
    };

    const drawRightAligned = (
      page: PDFPage,
      text: string,
      x: number,
      width: number,
      y: number,
      size = 9,
      bold = false,
      color = accent
    ) => {
      const safe = sanitizeText(text);
      if (!safe) {
        return;
      }

      const font = bold ? boldFont : regularFont;
      const textWidth = measureWidth(safe, size, font);
      drawText(page, safe, x + width - textWidth - 6, y, size, bold, color);
    };

    const drawWrapped = (
      page: PDFPage,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      size = 9,
      bold = false,
      color = muted,
      lineHeight = size + 3
    ) => {
      const lines = wrapText(text, maxWidth, size, bold);
      lines.forEach((line, index) => {
        drawText(page, line, x, y - index * lineHeight, size, bold, color);
      });
      return lines.length * lineHeight;
    };

    const formatDate = (value: Date | string) =>
      new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value));

    const resolveLogo = async () => {
      const source = companySettings?.companyLogo;
      if (!source) {
        return null;
      }

      try {
        if (source.startsWith("data:image/")) {
          const [meta, data] = source.split(",", 2);
          const bytes = Buffer.from(data, "base64");
          return meta.includes("png") ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
        }

        const url = source.startsWith("http")
          ? source
          : new URL(source, new URL(request.url).origin).toString();
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }

        const bytes = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") || "";
        return contentType.includes("png") || url.toLowerCase().endsWith(".png")
          ? pdfDoc.embedPng(bytes)
          : pdfDoc.embedJpg(bytes);
      } catch {
        return null;
      }
    };

    const embeddedLogo = await resolveLogo();

    const drawFallbackLogo = (page: PDFPage, isContinuation = false) => {
      const outerSize = isContinuation ? 34 : 44;
      const innerSize = isContinuation ? 24 : 32;
      const outerY = PAGE_HEIGHT - (isContinuation ? 58 : 80);
      const innerY = PAGE_HEIGHT - (isContinuation ? 53 : 74);
      const initialsY = PAGE_HEIGHT - (isContinuation ? 45 : 63);
      const solarY = PAGE_HEIGHT - (isContinuation ? 57 : 78);

      page.drawRectangle({
        x: MARGIN,
        y: outerY,
        width: outerSize,
        height: outerSize,
        color: white,
        opacity: 0.12,
        borderColor: white,
        borderWidth: 1,
      });
      page.drawRectangle({
        x: MARGIN + 6,
        y: innerY,
        width: innerSize,
        height: innerSize,
        color: white,
        opacity: 0.08,
      });

      const initials =
        sanitizeText(companySettings?.companyName || "Hi Tech")
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || "HT";

      drawText(page, initials, MARGIN + (isContinuation ? 8 : 10), initialsY, isContinuation ? 12 : 16, true, white);
      if (!isContinuation) {
        drawText(page, "SOLAR", MARGIN + 52, solarY, 7, true, rgb(0.93, 0.95, 0.98));
      }
    };

    const drawFooter = (page: PDFPage, pageNumber: number, totalPages: number) => {
      page.drawLine({
        start: { x: MARGIN, y: FOOTER_TOP },
        end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_TOP },
        thickness: 1,
        color: border,
      });

      const footerText = sanitizeText(companySettings?.footerText || "Generated by Solar EPC Workspace");
      drawText(page, footerText, MARGIN, FOOTER_Y, 8, false, muted);
      drawRightAligned(page, `Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH - MARGIN - 94, 94, FOOTER_Y, 8, false, muted);
    };

    const createPage = (isContinuation = false) => {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      const headerHeight = isContinuation ? CONTINUATION_HEADER_HEIGHT : FIRST_PAGE_HEADER_HEIGHT;
      const logoSize = isContinuation ? 34 : 48;
      const logoY = PAGE_HEIGHT - (isContinuation ? 58 : 82);
      const titleY = PAGE_HEIGHT - (isContinuation ? 38 : 50);
      const subtitleY = PAGE_HEIGHT - (isContinuation ? 51 : 66);
      const contactY = PAGE_HEIGHT - (isContinuation ? 62 : 82);

      page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - headerHeight,
        width: PAGE_WIDTH,
        height: headerHeight,
        color: accent,
      });
      page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - headerHeight - 4,
        width: PAGE_WIDTH,
        height: 4,
        color: primary,
      });

      if (embeddedLogo) {
        const scaled = embeddedLogo.scale(1);
        const ratio = Math.min(logoSize / scaled.width, logoSize / scaled.height);
        page.drawImage(embeddedLogo, {
          x: MARGIN,
          y: logoY,
          width: scaled.width * ratio,
          height: scaled.height * ratio,
        });
      } else {
        drawFallbackLogo(page, isContinuation);
      }

      drawText(page, companySettings?.companyName || "Hi-Tech Solar", MARGIN + 56, titleY, isContinuation ? 16 : 20, true, white);
      if (companySettings?.companyTagline) {
        drawText(page, companySettings.companyTagline, MARGIN + 56, subtitleY, isContinuation ? 7.5 : 9, false, rgb(0.89, 0.92, 0.97));
      }

      const contactBits = [companySettings?.contactPhone, companySettings?.contactEmail, companySettings?.website]
        .map((value) => sanitizeText(value))
        .filter(Boolean)
        .join(" | ");
      if (contactBits && !isContinuation) {
        drawText(page, contactBits, MARGIN + 56, contactY, 8, false, rgb(0.88, 0.91, 0.95));
      }

      return { page, y: PAGE_HEIGHT - headerHeight - 18 };
    };

    const versionDocumentData = (version as typeof version & { documentData?: unknown }).documentData;
    const documentData = normalizeQuotationDocumentData(versionDocumentData);

    const lines: QuoteLine[] = version.items.map((item) => ({
      title: sanitizeText(item.item.category || item.item.name || "BOQ Item"),
      detail: sanitizeText(item.item.description || item.description || item.item.name || ""),
      quantity: Number(item.quantity || 0),
      rate: Number(item.rate || 0),
      amount: Number(item.lineTotal || 0),
    }));

    const findVersionItem = (head: string, includesText?: string) =>
      version.items.find((entry) => {
        const category = sanitizeText(entry.item.category || "").toUpperCase();
        const haystack = sanitizeText(`${entry.item.name} ${entry.item.description || ""} ${entry.description || ""}`).toUpperCase();
        return category === head.toUpperCase() && (!includesText || haystack.includes(includesText.toUpperCase()));
      });

    const moduleItem = findVersionItem("SOLAR MODULE");
    const inverterItem = findVersionItem("SOLAR INVERTER");
    const structureItem = findVersionItem("SOLAR STRUCTURE");
    const acdbItem = findVersionItem("ELECTRICAL PROTECTION Panels", "ACDB");
    const dcdbItem = findVersionItem("ELECTRICAL PROTECTION Panels", "DCDB");
    const lightningItem = findVersionItem("ELECTRICAL PROTECTION ITEMS", "LIGHTNING") || findVersionItem("LIGHTNING ARRESTOR ACCESSORIES");
    const earthingItem = findVersionItem("EARTHING SOLUTION");

    const asSolarBoqItem = (entry: NonNullable<typeof moduleItem>["item"]) => ({
      ...entry,
      unitPrice: Number(entry.unitPrice || 0),
      taxPercent: Number(entry.taxPercent || 0),
      marginPercent: Number(entry.marginPercent || 0),
    });

    const moduleDisplay = moduleItem ? getBoqDisplayParts(asSolarBoqItem(moduleItem.item)) : null;
    const inverterDisplay = inverterItem ? getBoqDisplayParts(asSolarBoqItem(inverterItem.item)) : null;
    const structureDisplay = structureItem ? getBoqDisplayParts(asSolarBoqItem(structureItem.item)) : null;

    const systemInstallationCost = Number(version.subtotal || 0);
    const taxTotalValue = Number(version.taxTotal || 0);
    const additionalChargesTotal =
      Number(documentData.gedaRegistrationCharges || 0) +
      Number(documentData.netMeteringCharges || 0) +
      Number(documentData.meterCharges || 0);
    const proposalGrandTotal = Number(version.grandTotal || 0) + additionalChargesTotal;

    const technicalRows = [
      ["System Size", `${documentData.totalKw.toFixed(2)} Kwp`, ""],
      ["System Type", documentData.systemType, inverterDisplay?.itemType || ""],
      [
        "Required Area",
        `${Math.ceil(documentData.totalKw * documentData.requiredAreaFactorSqftPerKw)} Sqft Minimum`,
        `${documentData.requiredAreaFactorSqftPerKw} sqft per kW`,
      ],
      [
        "Module Type",
        moduleItem
          ? `${documentData.moduleWattage}Wp ${moduleDisplay?.itemType || sanitizeText(moduleItem.item.name)}`
          : `${documentData.moduleWattage}Wp Solar Module`,
        moduleDisplay?.ratingOrCapacity || "",
      ],
      [
        "Module Make & Rating",
        moduleItem ? sanitizeText(moduleItem.item.brand || "-") : "-",
        documentData.moduleWarranty,
      ],
      [
        "Inverter Type",
        inverterDisplay?.itemType || (inverterItem ? sanitizeText(inverterItem.item.name) : "-"),
        sanitizeText(inverterItem?.item.description || ""),
      ],
      [
        "Inverter Make & Rating",
        inverterItem ? sanitizeText(inverterItem.item.brand || "-") : "-",
        inverterDisplay?.ratingOrCapacity || "",
      ],
      ["Inverter Warranty Coverage", documentData.inverterWarranty, ""],
      [
        "Type Of Module Mounting Structure",
        structureDisplay?.itemType || (structureItem ? sanitizeText(structureItem.item.name) : "-"),
        documentData.structureWindSpeed,
      ],
      [
        "Structure Height",
        `${documentData.structureHeightSouth} at South, ${documentData.structureHeightNorth} at North`,
        "",
      ],
      ["Array Layout", documentData.arrayLayout, ""],
      ["Type of ACDB Box", sanitizeText(acdbItem?.item.name || "-") || "-", sanitizeText(acdbItem?.item.description || "")],
      ["Type of DCDB Box", sanitizeText(dcdbItem?.item.name || "-") || "-", sanitizeText(dcdbItem?.item.description || "")],
      ["Type of Lightning Arrestor", sanitizeText(lightningItem?.item.name || "-") || "-", sanitizeText(lightningItem?.item.description || "")],
      ["Type of Earthing Road", sanitizeText(earthingItem?.item.brand || earthingItem?.item.name || "-") || "-", sanitizeText(earthingItem?.item.description || "")],
      ["Monitoring System", documentData.monitoringSystem, ""],
      ["Net Metering Provision", documentData.netMeteringProvision, ""],
      [
        "Expected Generation (Unit/Day)",
        `${Math.round(documentData.totalKw * documentData.expectedGenerationUnitsPerKw)}`,
        `${documentData.expectedGenerationUnitsPerKw} units/day/kW`,
      ],
      ["Approvals & Compliance", documentData.approvalsCompliance, ""],
      ["Project Completion Timeline", documentData.projectCompletionTimeline, ""],
    ];

    const companyRows = [
      companySettings?.companyName || "Hi-Tech Solar",
      companySettings?.contactAddress || "",
      companySettings?.taxId ? `GSTIN: ${companySettings.taxId}` : "",
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean);

    const clientRows = [
      quotation.client.name,
      quotation.client.contactName ? `Contact: ${quotation.client.contactName}` : "",
      quotation.client.email ? `Email: ${quotation.client.email}` : "",
      quotation.client.phone || quotation.client.mobile
        ? `Phone: ${quotation.client.phone || quotation.client.mobile}`
        : "",
      quotation.client.address || quotation.client.billingAddress
        ? `Address: ${quotation.client.address || quotation.client.billingAddress}`
        : "",
      quotation.client.taxId ? `GSTIN: ${quotation.client.taxId}` : "",
    ]
      .map((value) => sanitizeText(value))
      .filter(Boolean);

    let { page, y } = createPage(false);

    const metaHeight = 72;
    const metaLeftWidth = 270;
    const metaRightWidth = CONTENT_WIDTH - metaLeftWidth;
    page.drawRectangle({
      x: MARGIN,
      y: y - metaHeight,
      width: CONTENT_WIDTH,
      height: metaHeight,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: MARGIN,
      y: y - metaHeight,
      width: metaLeftWidth,
      height: metaHeight,
      color: paleFill,
    });
    page.drawRectangle({
      x: MARGIN + metaLeftWidth,
      y: y - metaHeight,
      width: metaRightWidth,
      height: metaHeight,
      color: white,
    });
    page.drawLine({
      start: { x: MARGIN + metaLeftWidth, y },
      end: { x: MARGIN + metaLeftWidth, y: y - metaHeight },
      thickness: 1,
      color: border,
    });

    drawText(page, "SOLAR EPC QUOTATION", MARGIN + 12, y - 22, 15, true, accent);
    drawText(page, quotation.title, MARGIN + 12, y - 40, 9, false, muted);
    const metaLabelX = MARGIN + metaLeftWidth + 14;
    const metaValueX = MARGIN + metaLeftWidth + 78;
    drawText(page, "Version", metaLabelX, y - 18, 8.5, true, muted);
    drawText(page, version.version || "1.0", metaValueX, y - 18, 8.5, true, secondary);
    drawText(page, "Quote Ref", metaLabelX, y - 34, 8.5, true, muted);
    drawText(page, quotation.id.slice(-8).toUpperCase(), metaValueX, y - 34, 8.5, false, accent);
    drawText(page, "Issued", metaLabelX, y - 50, 8.5, true, muted);
    drawText(page, formatDate(version.createdAt), metaValueX, y - 50, 8.5, false, muted);
    if (version.brand) {
      drawText(page, "Brand", metaLabelX + 128, y - 18, 8.5, true, muted);
      drawWrapped(page, version.brand, metaLabelX + 168, y - 18, metaRightWidth - 184, 8.5, true, accent, 10);
    }

    y -= metaHeight + 14;

    const cardGap = 12;
    const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
    const companyLineCount = companyRows.reduce((count, row) => count + wrapText(row, cardWidth - 20, 8).length, 0);
    const clientLineCount = clientRows.reduce((count, row) => count + wrapText(row, cardWidth - 20, 8).length, 0);
    const cardHeight = Math.max(76, 28 + Math.max(companyLineCount, clientLineCount) * 11);

    const drawInfoCard = (title: string, rows: string[], x: number) => {
      page.drawRectangle({
        x,
        y: y - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: white,
        borderColor: border,
        borderWidth: 1,
      });
      page.drawRectangle({
        x,
        y: y - 24,
        width: cardWidth,
        height: 24,
        color: softFill,
      });
      drawText(page, title, x + 10, y - 16, 9, true, secondary);

      let cursorY = y - 38;
      rows.forEach((row, index) => {
        const isHeading = index === 0;
        const consumed = drawWrapped(
          page,
          row,
          x + 10,
          cursorY,
          cardWidth - 20,
          isHeading ? 9 : 8,
          isHeading,
          isHeading ? accent : muted,
          11
        );
        cursorY -= consumed + 1;
      });
    };

    drawInfoCard("From", companyRows, MARGIN);
    drawInfoCard("Bill To", clientRows, MARGIN + cardWidth + cardGap);
    y -= cardHeight + 18;

    const executiveSummary = sanitizeText(
      `We are pleased to present our proposal for the installation of a ${documentData.totalKw.toFixed(2)} kWp solar power plant${documentData.preparedFor ? ` for ${documentData.preparedFor}` : ""}. This solution is designed to reduce electricity costs, lower carbon emissions, and provide long-term energy reliability through a complete EPC scope covering design, procurement, installation, commissioning, and post-installation support.`
    );

    const summaryLines = wrapText(executiveSummary, CONTENT_WIDTH - 20, 8.5);
    const executiveSummaryHeight = 38 + summaryLines.length * 11;
    if (y - executiveSummaryHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Executive Summary", MARGIN, y, 12.5, true, accent);
    y -= 16;
    page.drawRectangle({
      x: MARGIN,
      y: y - (executiveSummaryHeight - 12),
      width: CONTENT_WIDTH,
      height: executiveSummaryHeight - 12,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });
    summaryLines.forEach((line, index) => {
      drawText(page, line, MARGIN + 10, y - 14 - index * 11, 8.5, false, muted);
    });
    y -= executiveSummaryHeight + 10;

    const technicalColumns = [
      { label: "Parameter", x: MARGIN, width: 150 },
      { label: "Description", x: MARGIN + 150, width: 220 },
      { label: "Remarks", x: MARGIN + 370, width: 161 },
    ];

    const drawTechnicalHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({
        x: MARGIN,
        y: topY - 24,
        width: CONTENT_WIDTH,
        height: 24,
        color: secondary,
      });
      technicalColumns.forEach((column) => {
        drawText(targetPage, column.label, column.x + 6, topY - 16, 9, true, white);
      });
    };

    drawText(page, "Technical Proposal", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawTechnicalHeader(page, y);
    y -= 28;

    technicalRows.forEach((row, index) => {
      const parameterLines = wrapText(row[0], technicalColumns[0].width - 12, 8, true);
      const descriptionLines = wrapText(row[1], technicalColumns[1].width - 12, 8);
      const remarkLines = wrapText(row[2] || "-", technicalColumns[2].width - 12, 8);
      const lineCount = Math.max(parameterLines.length, descriptionLines.length, remarkLines.length, 1);
      const rowHeight = 12 + lineCount * 10;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "Technical Proposal", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawTechnicalHeader(page, y);
        y -= 28;
      }

      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: index % 2 === 0 ? white : softFill,
        borderColor: subtleLine,
        borderWidth: 1,
      });
      [technicalColumns[1], technicalColumns[2]].forEach((column) => {
        page.drawLine({
          start: { x: column.x, y },
          end: { x: column.x, y: y - rowHeight },
          thickness: 1,
          color: subtleLine,
        });
      });

      parameterLines.forEach((line, lineIndex) => drawText(page, line, technicalColumns[0].x + 6, y - 14 - lineIndex * 10, 8, true, accent));
      descriptionLines.forEach((line, lineIndex) => drawText(page, line, technicalColumns[1].x + 6, y - 14 - lineIndex * 10, 8, false, accent));
      remarkLines.forEach((line, lineIndex) => drawText(page, line, technicalColumns[2].x + 6, y - 14 - lineIndex * 10, 8, false, muted));
      y -= rowHeight;
    });

    y -= 18;

    const columns: Column[] = [
      { key: "title", label: "Item Head", x: MARGIN, width: 92 },
      { key: "detail", label: "Description", x: MARGIN + 92, width: 225 },
      { key: "quantity", label: "Qty", x: MARGIN + 317, width: 42, align: "right" },
      { key: "rate", label: "Rate", x: MARGIN + 359, width: 74, align: "right" },
      { key: "amount", label: "Amount", x: MARGIN + 433, width: 98, align: "right" },
    ];

    const drawTableHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({
        x: MARGIN,
        y: topY - 24,
        width: CONTENT_WIDTH,
        height: 24,
        color: primary,
      });

      columns.forEach((column) => {
        if (column.align === "right") {
          drawRightAligned(targetPage, column.label, column.x, column.width, topY - 16, 9, true, white);
        } else {
          drawText(targetPage, column.label, column.x + 6, topY - 16, 9, true, white);
        }
      });
    };

    drawTableHeader(page, y);
    y -= 28;

    lines.forEach((line, index) => {
      const titleLines = wrapText(line.title, 80, 8.5, true).slice(0, 4);
      const detailLines = bulletizeDescription(line.detail, 213, 7.5);
      const lineCount = Math.max(titleLines.length, detailLines.length, 1);
      const rowHeight = 12 + lineCount * 10;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawTableHeader(page, y);
        y -= 28;
      }

      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: index % 2 === 0 ? white : softFill,
        borderColor: subtleLine,
        borderWidth: 1,
      });

      columns.slice(1).forEach((column) => {
        page.drawLine({
          start: { x: column.x, y: y },
          end: { x: column.x, y: y - rowHeight },
          thickness: 1,
          color: subtleLine,
        });
      });

      titleLines.forEach((titleLine, titleIndex) => {
        drawText(page, titleLine, columns[0].x + 6, y - 14 - titleIndex * 10, 8.5, true, accent);
      });

      detailLines.forEach((detailLine, detailIndex) => {
        drawText(page, detailLine, columns[1].x + 6, y - 14 - detailIndex * 10, 7.5, false, muted);
      });

      drawRightAligned(
        page,
        line.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        columns[2].x,
        columns[2].width,
        y - 14,
        8,
        false,
        accent
      );
      drawRightAligned(page, formatCurrency(line.rate), columns[3].x, columns[3].width, y - 14, 8, false, accent);
      drawRightAligned(page, formatCurrency(line.amount), columns[4].x, columns[4].width, y - 14, 8.5, true, accent);

      y -= rowHeight;
    });

    const summaryWidth = 230;
    const summaryHeight = 134;
    if (y - summaryHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - summaryWidth,
      y: y - summaryHeight,
      width: summaryWidth,
      height: summaryHeight,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - summaryWidth,
      y: y - 24,
      width: summaryWidth,
      height: 24,
      color: secondary,
    });
    drawText(page, "Commercial Summary", PAGE_WIDTH - MARGIN - summaryWidth + 10, y - 16, 10, true, white);

    const summaryRows = [
      ["System & Installation", formatCurrency(systemInstallationCost)],
      ["Tax / GST", formatCurrency(taxTotalValue)],
      ["Registration Charges", formatCurrency(Number(documentData.gedaRegistrationCharges || 0))],
      ["Net Metering Charges", formatCurrency(Number(documentData.netMeteringCharges || 0))],
      ["Meter / Modem Charges", formatCurrency(Number(documentData.meterCharges || 0))],
      ["Grand Total", formatCurrency(proposalGrandTotal)],
    ];
    let summaryY = y - 40;
    summaryRows.forEach(([label, value], index) => {
      const emphasized = index === summaryRows.length - 1;
      drawText(page, label, PAGE_WIDTH - MARGIN - summaryWidth + 10, summaryY, 9.5, emphasized, accent);
      drawRightAligned(
        page,
        value,
        PAGE_WIDTH - MARGIN - summaryWidth + 94,
        summaryWidth - 104,
        summaryY,
        9.5,
        emphasized,
        emphasized ? secondary : accent
      );
      summaryY -= 16;
    });
    y -= summaryHeight + 16;

    const paymentRows = documentData.paymentStages;
    const paymentTableHeight = 36 + paymentRows.length * 26;
    if (y - paymentTableHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Payment Stages", MARGIN, y, 12.5, true, accent);
    y -= 10;
    page.drawRectangle({ x: MARGIN, y: y - 24, width: CONTENT_WIDTH, height: 24, color: primary });
    drawText(page, "Stage", MARGIN + 6, y - 16, 8.5, true, white);
    drawText(page, "Milestone / Remarks", MARGIN + 170, y - 16, 8.5, true, white);
    drawRightAligned(page, "%", MARGIN + 440, 30, y - 16, 8.5, true, white);
    drawRightAligned(page, "Amount", MARGIN + 476, 55, y - 16, 8.5, true, white);
    y -= 28;

    paymentRows.forEach((stage, index) => {
      const milestone = `${stage.milestone} ${stage.remarks}`.trim();
      const lines = wrapText(milestone, 258, 7.5);
      const rowHeight = 12 + Math.max(lines.length, 1) * 10;

      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: index % 2 === 0 ? white : softFill,
        borderColor: subtleLine,
        borderWidth: 1,
      });
      page.drawLine({ start: { x: MARGIN + 160, y }, end: { x: MARGIN + 160, y: y - rowHeight }, thickness: 1, color: subtleLine });
      page.drawLine({ start: { x: MARGIN + 430, y }, end: { x: MARGIN + 430, y: y - rowHeight }, thickness: 1, color: subtleLine });
      page.drawLine({ start: { x: MARGIN + 468, y }, end: { x: MARGIN + 468, y: y - rowHeight }, thickness: 1, color: subtleLine });
      drawText(page, stage.label, MARGIN + 6, y - 14, 7.8, true, accent);
      lines.forEach((line, lineIndex) => drawText(page, line, MARGIN + 170, y - 14 - lineIndex * 10, 7.5, false, muted));
      drawRightAligned(page, `${stage.percentage}%`, MARGIN + 432, 28, y - 14, 7.8, true, accent);
      drawRightAligned(page, formatCurrency(systemInstallationCost * (stage.percentage / 100)), MARGIN + 474, 55, y - 14, 7.8, true, accent);
      y -= rowHeight;
    });

    y -= 18;

    const terms = [
      "Price validity: 15 days from the quotation issue date unless revised in writing.",
      "Payment terms: 70% against material dispatch and 30% against successful installation and handover.",
      "Execution timelines depend on site readiness, approvals, and material availability.",
      "Any civil, electrical, or statutory scope outside the listed BOQ will be billed separately after approval.",
      "Taxes are included as shown above and final billing will follow the applicable GST at invoicing.",
    ];

    const termLines = terms.flatMap((term) => bulletizeDescription(term, CONTENT_WIDTH - 22, 8.5));
    const termsHeight = 34 + termLines.length * 11;
    if (y - termsHeight < FOOTER_TOP + 12) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Terms and Conditions", MARGIN, y, 12.5, true, accent);
    y -= 16;
    page.drawRectangle({
      x: MARGIN,
      y: y - (termsHeight - 18),
      width: CONTENT_WIDTH,
      height: termsHeight - 18,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });

    let termsY = y - 14;
    termLines.forEach((line) => {
      drawText(page, line, MARGIN + 10, termsY, 8.5, false, muted);
      termsY -= 11;
    });
    y -= termsHeight;

    const bankCardHeight = 124;
    const docsCardHeight = 124;
    if (y - Math.max(bankCardHeight, docsCardHeight) < FOOTER_TOP + 12) {
      ({ page, y } = createPage(true));
    }

    const sectionGap = 12;
    const sectionWidth = (CONTENT_WIDTH - sectionGap) / 2;
    const bankRows = [
      `Bank Name: ${documentData.bankDetails.bankName}`,
      `A/C Name: ${documentData.bankDetails.accountName}`,
      `A/C Number: ${documentData.bankDetails.accountNumber}`,
      `A/C Type: ${documentData.bankDetails.accountType}`,
      `IFSC Code: ${documentData.bankDetails.ifscCode}`,
      `Branch: ${documentData.bankDetails.branch}`,
    ];

    const drawBoxSection = (title: string, rows: string[], x: number, height: number) => {
      page.drawRectangle({ x, y: y - height, width: sectionWidth, height, color: white, borderColor: border, borderWidth: 1 });
      page.drawRectangle({ x, y: y - 24, width: sectionWidth, height: 24, color: paleFill });
      drawText(page, title, x + 10, y - 16, 9.5, true, accent);
      let rowY = y - 38;
      rows.forEach((row) => {
        const wrapped = wrapText(row, sectionWidth - 20, 8);
        wrapped.forEach((line) => {
          drawText(page, line, x + 10, rowY, 8, false, muted);
          rowY -= 10;
        });
      });
    };

    drawBoxSection("Bank Details", bankRows, MARGIN, bankCardHeight);
    drawBoxSection(
      "Required Documents",
      documentData.requiredDocuments.map((row) => `- ${row}`),
      MARGIN + sectionWidth + sectionGap,
      docsCardHeight
    );
    y -= Math.max(bankCardHeight, docsCardHeight) + 18;

    const authHeight = 86;
    if (y - authHeight < FOOTER_TOP + 12) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Authorization", MARGIN, y, 12.5, true, accent);
    y -= 16;
    page.drawRectangle({
      x: MARGIN,
      y: y - 70,
      width: CONTENT_WIDTH,
      height: 70,
      color: white,
      borderColor: border,
      borderWidth: 1,
    });

    page.drawLine({
      start: { x: MARGIN + 20, y: y - 40 },
      end: { x: MARGIN + 220, y: y - 40 },
      thickness: 1,
      color: border,
    });
    page.drawLine({
      start: { x: PAGE_WIDTH - MARGIN - 220, y: y - 40 },
      end: { x: PAGE_WIDTH - MARGIN - 20, y: y - 40 },
      thickness: 1,
      color: border,
    });
    drawText(page, "Client Acceptance", MARGIN + 20, y - 54, 8.5, true, muted);
    drawText(page, `For ${companySettings?.companyName || "Hi-Tech Solar"}`, PAGE_WIDTH - MARGIN - 220, y - 54, 8.5, true, muted);
    drawText(page, "Signature / Date", MARGIN + 20, y - 66, 7.5, false, muted);
    drawText(page, "Authorized Signatory", PAGE_WIDTH - MARGIN - 220, y - 66, 7.5, false, muted);

    pages.forEach((currentPage, index) => {
      drawFooter(currentPage, index + 1, pages.length);
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${quotation.title.replace(/\s+/g, "-")}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
