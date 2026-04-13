import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCurrency } from "@/lib/format";
import { buildRoiProjection } from "@/lib/roi-calculation";
import { getQuotationWriteups } from "@/lib/quotation-writeups";
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
const FIRST_PAGE_HEADER_HEIGHT = 146;
const CONTINUATION_HEADER_HEIGHT = 108;

type BoqDisplayRow = {
  srNo: string;
  itemName: string;
  make: string;
  description: string;
  unit: string;
  quantity: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await import("@/lib/db");
    const { id } = await context.params;

    const [companySettings, quotation, quotationWriteups] = await Promise.all([
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
      getQuotationWriteups({ activeOnly: true }),
    ]);

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (!quotation.versions.length) {
      return NextResponse.json({ error: "No versions found for this quotation" }, { status: 404 });
    }

    type QuotationVersionEntry = (typeof quotation.versions)[number];
    type VersionItemEntry = QuotationVersionEntry["items"][number];
    type QuotationWriteupEntry = (typeof quotationWriteups)[number];

    const versionId = new URL(request.url).searchParams.get("version");
    const version = versionId
      ? quotation.versions.find((entry: QuotationVersionEntry) => entry.id === versionId) || quotation.versions[0]
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

    const fitTextSize = (
      text: string,
      maxWidth: number,
      preferredSize: number,
      minimumSize: number,
      bold = false
    ) => {
      const safe = sanitizeText(text);
      if (!safe) {
        return preferredSize;
      }

      const font = bold ? boldFont : regularFont;
      let size = preferredSize;
      while (size > minimumSize && measureWidth(safe, size, font) > maxWidth) {
        size -= 0.5;
      }

      return size;
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

    const drawWriteupSection = (title: string, content: string) => {
      const safeTitle = sanitizeText(title);
      const normalizedContent = content.replace(/\r/g, "").trim();
      if (!safeTitle || !normalizedContent) {
        return;
      }

      const drawSectionHeading = (continuation = false) => {
        if (y - 24 < FOOTER_TOP + 12) {
          ({ page, y } = createPage(true));
        }

        drawText(page, continuation ? `${safeTitle} (cont.)` : safeTitle, MARGIN, y, 12.5, true, accent);
        y -= 16;
      };

      drawSectionHeading(false);

      normalizedContent.split("\n").forEach((rawLine) => {
        const safeLine = rawLine.trim();
        if (!safeLine) {
          y -= 4;
          return;
        }

        const isSubheading =
          !safeLine.startsWith("-") &&
          !/^\d+[.)]/.test(safeLine) &&
          safeLine.length <= 42 &&
          !/[.!?]$/.test(safeLine);
        const wrappedLines = wrapText(safeLine, CONTENT_WIDTH, 8.2, isSubheading);
        const requiredHeight = wrappedLines.length * 10 + 2;

        if (y - requiredHeight < FOOTER_TOP + 12) {
          ({ page, y } = createPage(true));
          drawSectionHeading(true);
        }

        const consumed = drawWrapped(page, safeLine, MARGIN, y, CONTENT_WIDTH, 8.2, isSubheading, isSubheading ? accent : muted, 10);
        y -= consumed + 2;
      });

      y -= 8;
    };

    const drawBarChartCard = (
      page: PDFPage,
      options: {
        x: number;
        y: number;
        width: number;
        height: number;
        title: string;
        data: Array<{ label: string; value: number }>;
        barColor: ReturnType<typeof rgb>;
        valueFormatter: (value: number) => string;
        axisFormatter?: (value: number) => string;
      }
    ) => {
      const { x, y, width, height, title, data, barColor, valueFormatter, axisFormatter } = options;
      const cardBottom = y - height;
      page.drawRectangle({
        x,
        y: cardBottom,
        width,
        height,
        color: white,
        borderColor: border,
        borderWidth: 1,
      });
      page.drawRectangle({
        x,
        y: y - 22,
        width,
        height: 22,
        color: paleFill,
      });
      drawText(page, title, x + 8, y - 14, 8.2, true, accent);

      const safeAxisFormatter =
        axisFormatter ||
        ((value: number) => {
          if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
          }
          return value.toFixed(0);
        });

      const chartTop = y - 42;
      const chartBottom = cardBottom + 28;
      const chartLeft = x + 34;
      const chartRight = x + width - 12;
      const chartHeight = chartTop - chartBottom;
      const chartWidth = chartRight - chartLeft;
      const maxValue = Math.max(...data.map((entry) => entry.value), 1);
      const averageValue = data.reduce((sum, entry) => sum + entry.value, 0) / Math.max(data.length, 1);
      const tickCount = 4;
      const barGap = 6;
      const barWidth = Math.max((chartWidth - barGap * (data.length - 1)) / Math.max(data.length, 1), 7);
      const peakEntry = data.reduce((peak, entry) => (entry.value > peak.value ? entry : peak), data[0]);
      const peakText = `Peak ${peakEntry.label.toUpperCase()}: ${valueFormatter(peakEntry.value)}`;
      const peakTextWidth = measureWidth(peakText, 6, boldFont);
      const peakChipWidth = Math.min(Math.max(peakTextWidth + 16, 78), width - 24);

      page.drawRectangle({
        x: x + width - peakChipWidth - 8,
        y: y - 18,
        width: peakChipWidth,
        height: 12,
        color: softFill,
        borderColor: border,
        borderWidth: 1,
      });
      drawText(page, peakText, x + width - peakChipWidth, y - 14, 6, true, muted);

      for (let tickIndex = 0; tickIndex <= tickCount; tickIndex += 1) {
        const ratio = tickIndex / tickCount;
        const tickValue = maxValue * ratio;
        const tickY = chartBottom + (chartHeight - 8) * ratio;
        const tickLabel = safeAxisFormatter(tickValue);
        const tickLabelWidth = measureWidth(tickLabel, 5.6, regularFont);

        page.drawLine({
          start: { x: chartLeft, y: tickY },
          end: { x: chartRight, y: tickY },
          thickness: tickIndex === 0 ? 1 : 0.6,
          color: subtleLine,
        });
        drawText(page, tickLabel, chartLeft - tickLabelWidth - 6, tickY - 2, 5.6, false, muted);
      }

      page.drawLine({
        start: { x: chartLeft, y: chartBottom },
        end: { x: chartRight, y: chartBottom },
        thickness: 1,
        color: subtleLine,
      });
      page.drawLine({
        start: { x: chartLeft, y: chartBottom },
        end: { x: chartLeft, y: chartTop },
        thickness: 1,
        color: subtleLine,
      });

      const avgY = chartBottom + (averageValue / maxValue) * (chartHeight - 8);
      page.drawLine({
        start: { x: chartLeft, y: avgY },
        end: { x: chartRight, y: avgY },
        thickness: 1,
        color: rgb(0.78, 0.48, 0.12),
        dashArray: [3, 3],
      });
      drawText(page, `Avg ${safeAxisFormatter(averageValue)}`, chartLeft + 4, avgY + 3, 5.8, true, rgb(0.78, 0.48, 0.12));

      data.forEach((entry, index) => {
        const barHeight = Math.max((entry.value / maxValue) * (chartHeight - 10), 2);
        const barX = chartLeft + index * (barWidth + barGap);
        const barY = chartBottom;
        const label = entry.label.slice(0, 3).toUpperCase();

        page.drawRectangle({
          x: barX,
          y: barY,
          width: barWidth,
          height: barHeight,
          color: barColor,
          opacity: 0.92,
        });

        page.drawLine({
          start: { x: barX, y: barY + barHeight },
          end: { x: barX + barWidth, y: barY + barHeight },
          thickness: 0.6,
          color: white,
          opacity: 0.35,
        });

        const labelWidth = measureWidth(label, 5.8, boldFont);
        drawText(page, label, barX + Math.max((barWidth - labelWidth) / 2, 0), chartBottom - 10, 5.8, true, muted);
      });
    };

    const drawDualAxisChartCard = (
      page: PDFPage,
      options: {
        x: number;
        y: number;
        width: number;
        height: number;
        title: string;
        data: Array<{ label: string; barValue: number; lineValue: number }>;
        barColor: ReturnType<typeof rgb>;
        lineColor: ReturnType<typeof rgb>;
        leftFormatter: (value: number) => string;
        rightFormatter: (value: number) => string;
        barLegend: string;
        lineLegend: string;
      }
    ) => {
      const {
        x,
        y,
        width,
        height,
        title,
        data,
        barColor,
        lineColor,
        leftFormatter,
        rightFormatter,
        barLegend,
        lineLegend,
      } = options;
      const cardBottom = y - height;
      page.drawRectangle({ x, y: cardBottom, width, height, color: white, borderColor: border, borderWidth: 1 });
      page.drawRectangle({ x, y: y - 22, width, height: 22, color: paleFill });
      drawText(page, title, x + 8, y - 14, 8.2, true, accent);

      const chartTop = y - 40;
      const chartBottom = cardBottom + 28;
      const chartLeft = x + 34;
      const chartRight = x + width - 34;
      const chartHeight = chartTop - chartBottom;
      const chartWidth = chartRight - chartLeft;
      const maxBarValue = Math.max(...data.map((entry) => entry.barValue), 1);
      const maxLineValue = Math.max(...data.map((entry) => entry.lineValue), 1);
      const tickCount = 4;
      const barGap = data.length > 20 ? 2 : 4;
      const barWidth = Math.max((chartWidth - barGap * (data.length - 1)) / Math.max(data.length, 1), 3);
      const legendY = y - 14;

      page.drawRectangle({ x: x + width - 140, y: legendY - 2, width: 8, height: 8, color: barColor });
      drawText(page, barLegend, x + width - 128, legendY, 5.8, true, muted);
      page.drawLine({ start: { x: x + width - 62, y: legendY + 2 }, end: { x: x + width - 48, y: legendY + 2 }, thickness: 1.4, color: lineColor });
      drawText(page, lineLegend, x + width - 44, legendY, 5.8, true, muted);

      for (let tickIndex = 0; tickIndex <= tickCount; tickIndex += 1) {
        const ratio = tickIndex / tickCount;
        const gridY = chartBottom + (chartHeight - 8) * ratio;
        const leftValue = maxBarValue * ratio;
        const rightValue = maxLineValue * ratio;
        const leftLabel = leftFormatter(leftValue);
        const rightLabel = rightFormatter(rightValue);

        page.drawLine({ start: { x: chartLeft, y: gridY }, end: { x: chartRight, y: gridY }, thickness: tickIndex === 0 ? 1 : 0.6, color: subtleLine });
        drawText(page, leftLabel, x + 2, gridY - 2, 5.4, false, muted);
        drawText(page, rightLabel, chartRight + 6, gridY - 2, 5.4, false, muted);
      }

      page.drawLine({ start: { x: chartLeft, y: chartBottom }, end: { x: chartRight, y: chartBottom }, thickness: 1, color: subtleLine });
      page.drawLine({ start: { x: chartLeft, y: chartBottom }, end: { x: chartLeft, y: chartTop }, thickness: 1, color: subtleLine });
      page.drawLine({ start: { x: chartRight, y: chartBottom }, end: { x: chartRight, y: chartTop }, thickness: 1, color: subtleLine });

      const points = data.map((entry, index) => {
        const barX = chartLeft + index * (barWidth + barGap);
        const barHeight = Math.max((entry.barValue / maxBarValue) * (chartHeight - 10), 2);
        const pointX = barX + barWidth / 2;
        const pointY = chartBottom + (entry.lineValue / maxLineValue) * (chartHeight - 8);
        const labelShouldRender = data.length <= 12 || index === 0 || index === data.length - 1 || (index + 1) % 5 === 0;

        page.drawRectangle({ x: barX, y: chartBottom, width: barWidth, height: barHeight, color: barColor, opacity: 0.9 });

        if (labelShouldRender) {
          const label = entry.label;
          const labelWidth = measureWidth(label, 5.4, regularFont);
          drawText(page, label, pointX - labelWidth / 2, chartBottom - 10, 5.4, false, muted);
        }

        return { x: pointX, y: pointY };
      });

      points.forEach((point, index) => {
        if (index > 0) {
          page.drawLine({ start: points[index - 1], end: point, thickness: 1.4, color: lineColor });
        }
        page.drawCircle({ x: point.x, y: point.y, size: 1.8, color: lineColor, borderColor: white, borderWidth: 0.6 });
      });
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
      const subHeaderHeight = 24;
      const logoMaxWidth = isContinuation ? 36 : 44;
      const logoMaxHeight = isContinuation ? 36 : 44;
      const logoTopInset = isContinuation ? 14 : 18;
      const textStartX = MARGIN + (isContinuation ? 48 : 60);
      const textBlockWidth = PAGE_WIDTH - textStartX - MARGIN;
      const titleY = PAGE_HEIGHT - (isContinuation ? 34 : 48);
      const subtitleY = PAGE_HEIGHT - (isContinuation ? 49 : 66);
      const contactY = PAGE_HEIGHT - (isContinuation ? 64 : 84);
      const subHeaderY = PAGE_HEIGHT - headerHeight;

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
      page.drawRectangle({
        x: 0,
        y: subHeaderY,
        width: PAGE_WIDTH,
        height: subHeaderHeight,
        color: paleFill,
      });
      page.drawLine({
        start: { x: 0, y: subHeaderY + subHeaderHeight },
        end: { x: PAGE_WIDTH, y: subHeaderY + subHeaderHeight },
        thickness: 1,
        color: primary,
      });

      if (embeddedLogo) {
        const scaled = embeddedLogo.scale(1);
        const ratio = Math.min(logoMaxWidth / scaled.width, logoMaxHeight / scaled.height);
        const logoWidth = scaled.width * ratio;
        const logoHeight = scaled.height * ratio;
        page.drawImage(embeddedLogo, {
          x: MARGIN,
          y: PAGE_HEIGHT - logoTopInset - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
      } else {
        drawFallbackLogo(page, isContinuation);
      }

      const companyName = companySettings?.companyName || "Hi-Tech Solar";
      const companyNameSize = fitTextSize(
        companyName,
        textBlockWidth,
        isContinuation ? 16 : 20,
        isContinuation ? 13 : 16,
        true
      );
      drawText(page, companyName, textStartX, titleY, companyNameSize, true, white);
      if (companySettings?.companyTagline) {
        drawWrapped(
          page,
          companySettings.companyTagline,
          textStartX,
          subtitleY,
          textBlockWidth,
          isContinuation ? 7 : 8,
          false,
          rgb(0.89, 0.92, 0.97),
          isContinuation ? 8 : 9
        );
      }

      const contactBits = [companySettings?.contactPhone, companySettings?.contactEmail, companySettings?.website]
        .map((value) => sanitizeText(value))
        .filter(Boolean)
        .join(" | ");
      if (contactBits && !isContinuation) {
        drawWrapped(page, contactBits, textStartX, contactY, textBlockWidth, 7, false, rgb(0.88, 0.91, 0.95), 8);
      }

      drawText(page, "Quotation", MARGIN, subHeaderY + 8, 9, true, accent);
      drawWrapped(page, quotation.title, MARGIN + 68, subHeaderY + 8, 280, 9, true, accent, 10);
      drawRightAligned(
        page,
        `Version ${sanitizeText(version.version || "1.0")} | ${formatDate(version.createdAt)}`,
        PAGE_WIDTH - MARGIN - 170,
        170,
        subHeaderY + 8,
        8,
        false,
        muted
      );

      return { page, y: PAGE_HEIGHT - headerHeight - 18 };
    };

    const versionDocumentData = (version as typeof version & { documentData?: unknown }).documentData;
    const documentData = normalizeQuotationDocumentData(versionDocumentData);
    const manualBoqRows = documentData.billOfQuantityRows;

    const generatedBoqRows: BoqDisplayRow[] = version.items.map((item: VersionItemEntry, index) => ({
      srNo: String(index + 1),
      itemName: sanitizeText(item.item.category || item.item.name || "BOQ Item"),
      make: sanitizeText(item.item.brand || "-") || "-",
      description: sanitizeText(item.item.description || item.description || item.item.name || "-"),
      unit: sanitizeText(item.item.uom || "-") || "-",
      quantity: Number(item.quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    }));
    const boqRows: BoqDisplayRow[] = manualBoqRows.length > 0 ? manualBoqRows : generatedBoqRows;

    const findVersionItem = (head: string, includesText?: string) =>
      version.items.find((entry: VersionItemEntry) => {
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
    const systemTotalWithTax = systemInstallationCost + taxTotalValue;
    const totalAmountPerKw = documentData.totalKw > 0 ? systemTotalWithTax / documentData.totalKw : 0;
    const effectiveTaxPercent = systemInstallationCost > 0 ? (taxTotalValue / systemInstallationCost) * 100 : 0;
    const proposalGrandTotal = Number(version.grandTotal || 0) + additionalChargesTotal;
    const validUntil = new Date(version.createdAt);
    validUntil.setDate(validUntil.getDate() + Math.max(documentData.validityDays || 0, 0));
    const generationRows = documentData.generationTable.map((row) => {
      const kwh = documentData.totalKw * row.unitsPerDay * row.days;
      const amount = kwh * Number(documentData.electricityTariffYear1 || 0);

      return {
        ...row,
        kwh,
        amount,
      };
    });
    const annualGenerationKwh = generationRows.reduce((sum, row) => sum + row.kwh, 0);
    const annualGenerationSavings = generationRows.reduce((sum, row) => sum + row.amount, 0);
    const indicativeGenerationPerDay = documentData.totalKw * Math.max(Math.round(documentData.expectedGenerationUnitsPerKw || 0), 0);
    const twentyFiveYearSaving = annualGenerationSavings * 25;
    const roiInstallationCost = Number(version.grandTotal || 0);
    const roiProjection = buildRoiProjection({
      totalKw: documentData.totalKw,
      installationCost: roiInstallationCost,
      averageDailyGenerationUnitsPerKw: Number(documentData.roiAverageDailyGenerationUnitsPerKw || 0),
      yearlyShutdownDays: Number(documentData.roiShutdownDays || 0),
      electricityTariffYear1: Number(documentData.electricityTariffYear1 || 0),
      tariffEscalationPercent: Number(documentData.roiTariffEscalationPercent || 0),
      annualPowerDegradationAfterYear1Percent: Number(documentData.roiAnnualPowerDegradationAfterYear1Percent || 0),
      annualPowerDegradationFromYear3OnwardPercent: Number(documentData.roiAnnualPowerDegradationFromYear3OnwardPercent || 0),
      operationMaintenancePercentYear1: Number(documentData.roiOperationMaintenancePercentYear1 || 0),
      operationMaintenanceEscalationPercent: Number(documentData.roiOperationMaintenanceEscalationPercent || 0),
      projectionYears: Number(documentData.roiProjectLifeYears || 0),
    });
    const roiProjectionRows = roiProjection.rows;
    const roiProjectionYears = roiProjectionRows.length;
    const roiYear1GenerationKwh = roiProjection.year1GenerationKwh;
    const roiYear1GrossSavings = roiProjection.year1GrossSavings;
    const roiOperationMaintenanceCostYear1 = roiProjection.year1OperationMaintenanceCost;
    const roiYear1NetSavings = roiProjection.year1NetSavings;
    const roiLifetimeNetSavings = roiProjection.lifetimeNetSavings;
    const roiEstimatedPaybackYears = roiProjection.estimatedPaybackYears;

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

    const scopeMatrixRows = documentData.scopeOfWorkRows.map((row) => ({
      srNo: sanitizeText(row.srNo || "-"),
      workItem: sanitizeText(row.workItem || "-"),
      responsibility: sanitizeText(row.responsibility || "-"),
      remarks: sanitizeText(row.remarks || "-"),
      isSection: row.responsibility === "Section",
    }));

    let { page, y } = createPage(false);

    const metaLeftWidth = 240;
    const metaRightWidth = CONTENT_WIDTH - metaLeftWidth;
    const metaPaddingTop = 16;
    const metaPaddingBottom = 14;
    const metaLabelX = MARGIN + metaLeftWidth + 14;
    const metaValueX = MARGIN + metaLeftWidth + 78;
    const metaValueWidth = metaRightWidth - 84;
    const projectMetaRows = [
      ["Client", quotation.client.name],
      ["Prepared For", documentData.preparedFor || quotation.title],
      ["Customer Contact", documentData.customerContactPerson || quotation.client.contactName || "-"],
      ["Consumer Type", documentData.consumerType],
      ["Consumer No.", documentData.consumerNumber || "-"],
      ["Prepared By", documentData.preparedBy],
      ["Issued", formatDate(version.createdAt)],
      ["Valid Till", formatDate(validUntil)],
    ] as const;
    const leftTitleHeight = 14;
    const leftSubtitleHeight = wrapText(`${documentData.totalKw.toFixed(2)} Kwp Roof Top Solar System`, metaLeftWidth - 24, 13, true).length * 15;
    const leftQuoteHeight = wrapText(quotation.title, metaLeftWidth - 24, 8.5).length * 10.5;
    const leftOfferHeight = version.brand
      ? Math.max(10, wrapText(version.brand, metaLeftWidth - 60, 8.5, true).length * 10) + 12
      : 0;
    const leftContentHeight = leftTitleHeight + leftSubtitleHeight + leftQuoteHeight + leftOfferHeight + 10;

    const rightRowHeights = projectMetaRows.map(([, value]) => {
      const lineCount = wrapText(value, metaValueWidth, 8.2).length;
      return Math.max(9.5, lineCount * 9.5) + 2;
    });
    const rightContentHeight = rightRowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);
    const metaHeight = Math.max(110, metaPaddingTop + Math.max(leftContentHeight, rightContentHeight) + metaPaddingBottom);

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

    let leftCursorY = y - metaPaddingTop - 4;
    drawText(page, "Detailed Techno-Commercial Proposal", MARGIN + 12, leftCursorY, 14, true, accent);
    leftCursorY -= 20;
    const consumedSubtitle = drawWrapped(
      page,
      `${documentData.totalKw.toFixed(2)} Kwp Roof Top Solar System`,
      MARGIN + 12,
      leftCursorY,
      metaLeftWidth - 24,
      13,
      true,
      secondary,
      15
    );
    leftCursorY -= consumedSubtitle + 3;
    const consumedQuote = drawWrapped(page, quotation.title, MARGIN + 12, leftCursorY, metaLeftWidth - 24, 8.5, false, muted, 10.5);
    leftCursorY -= consumedQuote + 6;
    if (version.brand) {
      drawText(page, "Offer", MARGIN + 12, leftCursorY, 8.5, true, muted);
      drawWrapped(page, version.brand, MARGIN + 48, leftCursorY, metaLeftWidth - 60, 8.5, true, accent, 10);
    }

    let metaCursorY = y - metaPaddingTop - 2;
    projectMetaRows.forEach(([label, value], index) => {
      const rowY = metaCursorY;
      drawText(page, label, metaLabelX, rowY, 8.2, true, muted);
      drawWrapped(page, value, metaValueX, rowY, metaValueWidth, 8.2, false, accent, 9.5);
      metaCursorY -= rightRowHeights[index];
    });

    y -= metaHeight + 20;

    const executiveSummaryWriteup = quotationWriteups.find((entry: QuotationWriteupEntry) => entry.key === "executive-summary");
    const descriptionOfServicesWriteup = quotationWriteups.find(
      (entry: QuotationWriteupEntry) => entry.key === "description-of-services"
    );
    const technicalConsiderationsWriteup = quotationWriteups.find(
      (entry: QuotationWriteupEntry) => entry.key === "technical-considerations"
    );
    const remainingWriteups = quotationWriteups.filter(
      (entry: QuotationWriteupEntry) =>
        entry.key !== "executive-summary" &&
        entry.key !== "description-of-services" &&
        entry.key !== "technical-considerations"
    );
    const executiveSummary = sanitizeText(
      executiveSummaryWriteup?.content ||
        `We are pleased to present our proposal for the installation of a ${documentData.totalKw.toFixed(2)} kWp solar power plant${documentData.preparedFor ? ` for ${documentData.preparedFor}` : ""}. This solution is designed to reduce electricity costs, lower carbon emissions, and provide long-term energy reliability through a complete EPC scope covering design, procurement, installation, commissioning, and post-installation support.`
    );

    const summaryLines = wrapText(executiveSummary, CONTENT_WIDTH - 20, 8.5);
    const executiveSummaryHeight = 42 + summaryLines.length * 11;
    if (y - executiveSummaryHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, executiveSummaryWriteup?.title || "Executive Summary", MARGIN, y, 12.5, true, accent);
    y -= 18;
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

    if (descriptionOfServicesWriteup) {
      drawWriteupSection(descriptionOfServicesWriteup.title, descriptionOfServicesWriteup.content);
    }

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

    const measureTechnicalRowHeight = (row: (typeof technicalRows)[number]) => {
      const parameterLines = wrapText(row[0], technicalColumns[0].width - 12, 8, true);
      const descriptionLines = wrapText(row[1], technicalColumns[1].width - 12, 8);
      const remarkLines = wrapText(row[2] || "-", technicalColumns[2].width - 12, 8);
      const lineCount = Math.max(parameterLines.length, descriptionLines.length, remarkLines.length, 1);

      return 12 + lineCount * 10;
    };

    const firstTechnicalRowHeight = technicalRows.length ? measureTechnicalRowHeight(technicalRows[0]) : 0;
    const technicalSectionIntroHeight = 10 + 28 + firstTechnicalRowHeight;
    if (y - technicalSectionIntroHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Technical Proposal", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawTechnicalHeader(page, y);
    y -= 28;

    technicalRows.forEach((row, index) => {
      const parameterLines = wrapText(row[0], technicalColumns[0].width - 12, 8, true);
      const descriptionLines = wrapText(row[1], technicalColumns[1].width - 12, 8);
      const remarkLines = wrapText(row[2] || "-", technicalColumns[2].width - 12, 8);
      const rowHeight = measureTechnicalRowHeight(row);

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

    const drawGenerationSection = () => {
      const generationSectionHeight = 360;
      if (y - generationSectionHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
      }

      drawText(page, "System Generation & Revenue Details", MARGIN, y, 12.5, true, accent);
      y -= 18;

      const generationSummaryRows = [
        [
          { label: "Solar Roof Top Size", value: `${documentData.totalKw.toFixed(2)} Kw`, note: "Calculated system size" },
          { label: "Generation / Day", value: `${indicativeGenerationPerDay.toFixed(0)} Unit`, note: "System size x rounded avg. generation" },
          { label: "Yearly Saving", value: formatCurrency(annualGenerationSavings), note: "Sum of monthly savings" },
        ],
        [
          { label: "1st Year Generation", value: `${annualGenerationKwh.toFixed(0)} kWh`, note: "Sum of monthly generation" },
          { label: "25 Year Saving", value: formatCurrency(twentyFiveYearSaving), note: "Yearly saving x 25" },
        ],
      ];

      generationSummaryRows.forEach((rowCards) => {
        const gap = 10;
        const cardWidth = (CONTENT_WIDTH - gap * (rowCards.length - 1)) / rowCards.length;
        const cardHeight = 54;

        rowCards.forEach((card, index) => {
          const cardX = MARGIN + index * (cardWidth + gap);
          page.drawRectangle({
            x: cardX,
            y: y - cardHeight,
            width: cardWidth,
            height: cardHeight,
            color: white,
            borderColor: border,
            borderWidth: 1,
          });
          drawText(page, card.label, cardX + 8, y - 14, 7, true, muted);
          drawText(page, card.value, cardX + 8, y - 28, 10, true, accent);
          drawWrapped(page, card.note, cardX + 8, y - 40, cardWidth - 16, 6.5, false, muted, 8);
        });

        y -= cardHeight + 10;
      });

      page.drawRectangle({ x: MARGIN, y: y - 20, width: CONTENT_WIDTH, height: 20, color: secondary });
      drawText(page, "Predicted Monthly Generation & Savings", MARGIN + 8, y - 13, 8.5, true, white);
      y -= 24;

      const chartGap = 12;
      const chartWidth = (CONTENT_WIDTH - chartGap) / 2;
      const chartHeight = 150;
      drawBarChartCard(page, {
        x: MARGIN,
        y,
        width: chartWidth,
        height: chartHeight,
        title: "Predicted Monthly Generation (kWh)",
        data: generationRows.map((row) => ({ label: row.month, value: row.kwh })),
        barColor: secondary,
        valueFormatter: (value) => value.toFixed(0),
      });
      drawBarChartCard(page, {
        x: MARGIN + chartWidth + chartGap,
        y,
        width: chartWidth,
        height: chartHeight,
        title: "Predicted Monthly Savings (INR)",
        data: generationRows.map((row) => ({ label: row.month, value: row.amount })),
        barColor: primary,
        valueFormatter: (value) => `Rs.${value.toFixed(0)}`,
      });
      y -= chartHeight + 12;

      const miniSummaryHeight = 40;
      page.drawRectangle({ x: MARGIN, y: y - miniSummaryHeight, width: CONTENT_WIDTH, height: miniSummaryHeight, color: white, borderColor: border, borderWidth: 1 });
      const miniSummaryColumns = [
        { label: "Avg. Unit / Day", value: documentData.expectedGenerationUnitsPerKw.toFixed(2), x: MARGIN + 10 },
        { label: "Total Days", value: "365", x: MARGIN + 145 },
        { label: "1st Year Generation", value: `${annualGenerationKwh.toFixed(0)} kWh`, x: MARGIN + 250 },
        { label: "Yearly Saving", value: formatCurrency(annualGenerationSavings), x: MARGIN + 405 },
      ];
      miniSummaryColumns.forEach((entry) => {
        drawText(page, entry.label, entry.x, y - 13, 6.6, true, muted);
        drawText(page, entry.value, entry.x, y - 27, 8.2, true, accent);
      });
      y -= miniSummaryHeight + 10;

      const generationNoteLines = wrapText(documentData.generationDisclaimer, CONTENT_WIDTH - 20, 7.5);
      const generationNoteHeight = 14 + generationNoteLines.length * 9;
      page.drawRectangle({ x: MARGIN, y: y - generationNoteHeight, width: CONTENT_WIDTH, height: generationNoteHeight, color: white, borderColor: border, borderWidth: 1 });
      drawText(page, "Note", MARGIN + 8, y - 12, 7.8, true, accent);
      generationNoteLines.forEach((line, index) => drawText(page, line, MARGIN + 42, y - 12 - index * 9, 7.5, false, muted));
      y -= generationNoteHeight + 18;
    };

    const drawPaymentStagesSection = () => {
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
    };

    const boqColumns = [
      { label: "Sr No", x: MARGIN, width: 38 },
      { label: "Item Name", x: MARGIN + 38, width: 110 },
      { label: "Make", x: MARGIN + 148, width: 105 },
      { label: "Description", x: MARGIN + 253, width: 196 },
      { label: "Unit", x: MARGIN + 449, width: 38 },
      { label: "Quantity", x: MARGIN + 487, width: 44 },
    ];

    const drawBoqHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({ x: MARGIN, y: topY - 24, width: CONTENT_WIDTH, height: 24, color: primary });
      boqColumns.forEach((column) => {
        drawText(targetPage, column.label, column.x + 5, topY - 16, 8.2, true, white);
      });
    };

    drawText(page, "A Billing of Quantities", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawBoqHeader(page, y);
    y -= 28;

    boqRows.forEach((row, index) => {
      const srLines = wrapText(row.srNo, boqColumns[0].width - 10, 7.2, true);
      const itemLines = wrapText(row.itemName, boqColumns[1].width - 10, 8, true);
      const makeLines = wrapText(row.make || "-", boqColumns[2].width - 10, 7.6);
      const descriptionLines = wrapText(row.description, boqColumns[3].width - 10, 7.4);
      const unitLines = wrapText(row.unit || "-", boqColumns[4].width - 10, 7.5, true);
      const quantityLines = wrapText(row.quantity || "-", boqColumns[5].width - 10, 7.5, true);
      const lineCount = Math.max(srLines.length, itemLines.length, makeLines.length, descriptionLines.length, unitLines.length, quantityLines.length, 1);
      const rowHeight = 12 + lineCount * 9;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "A Billing of Quantities", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawBoqHeader(page, y);
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
      boqColumns.slice(1).forEach((column) => {
        page.drawLine({ start: { x: column.x, y }, end: { x: column.x, y: y - rowHeight }, thickness: 1, color: subtleLine });
      });

      srLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[0].x + 5, y - 13 - lineIndex * 9, 7.2, true, accent));
      itemLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[1].x + 5, y - 13 - lineIndex * 9, 8, true, accent));
      makeLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[2].x + 5, y - 13 - lineIndex * 9, 7.6, false, accent));
      descriptionLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[3].x + 5, y - 13 - lineIndex * 9, 7.4, false, muted));
      unitLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[4].x + 5, y - 13 - lineIndex * 9, 7.5, true, accent));
      quantityLines.forEach((line, lineIndex) => drawText(page, line, boqColumns[5].x + 5, y - 13 - lineIndex * 9, 7.5, true, accent));

      y -= rowHeight;
    });

    y -= 18;

    const scopeColumns = [
      { label: "Sr", x: MARGIN, width: 42 },
      { label: "Work Item / Activity", x: MARGIN + 42, width: 208 },
      { label: "Responsibility", x: MARGIN + 250, width: 122 },
      { label: "Remarks", x: MARGIN + 372, width: 159 },
    ];

    const drawScopeHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({
        x: MARGIN,
        y: topY - 24,
        width: CONTENT_WIDTH,
        height: 24,
        color: secondary,
      });
      scopeColumns.forEach((column) => {
        drawText(targetPage, column.label, column.x + 6, topY - 16, 8.5, true, white);
      });
    };

    if (y - 120 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Scope of Work Matrix", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawScopeHeader(page, y);
    y -= 28;

    scopeMatrixRows.forEach((row, index) => {
      if (row.isSection) {
        const sectionLines = wrapText(`${row.srNo} ${row.workItem}`, CONTENT_WIDTH - 12, 8.2, true);
        const rowHeight = 12 + Math.max(sectionLines.length, 1) * 10;

        if (y - rowHeight < FOOTER_TOP + 16) {
          ({ page, y } = createPage(true));
          drawText(page, "Scope of Work Matrix", MARGIN, y, 12.5, true, accent);
          y -= 10;
          drawScopeHeader(page, y);
          y -= 28;
        }

        page.drawRectangle({
          x: MARGIN,
          y: y - rowHeight,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: paleFill,
          borderColor: subtleLine,
          borderWidth: 1,
        });
        sectionLines.forEach((line, lineIndex) => drawText(page, line, MARGIN + 6, y - 14 - lineIndex * 10, 8.2, true, accent));
        y -= rowHeight;
        return;
      }

      const srLines = wrapText(row.srNo, scopeColumns[0].width - 12, 7.5, true);
      const workLines = wrapText(row.workItem, scopeColumns[1].width - 12, 7.5);
      const responsibilityLines = wrapText(row.responsibility, scopeColumns[2].width - 12, 7.5, true);
      const remarkLines = wrapText(row.remarks, scopeColumns[3].width - 12, 7.5);
      const lineCount = Math.max(srLines.length, workLines.length, responsibilityLines.length, remarkLines.length, 1);
      const rowHeight = 12 + lineCount * 10;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "Scope of Work Matrix", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawScopeHeader(page, y);
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
      [scopeColumns[1], scopeColumns[2], scopeColumns[3]].forEach((column) => {
        page.drawLine({
          start: { x: column.x, y },
          end: { x: column.x, y: y - rowHeight },
          thickness: 1,
          color: subtleLine,
        });
      });

      srLines.forEach((line, lineIndex) => drawText(page, line, scopeColumns[0].x + 6, y - 14 - lineIndex * 10, 7.5, true, accent));
      workLines.forEach((line, lineIndex) => drawText(page, line, scopeColumns[1].x + 6, y - 14 - lineIndex * 10, 7.5, false, accent));
      responsibilityLines.forEach((line, lineIndex) => drawText(page, line, scopeColumns[2].x + 6, y - 14 - lineIndex * 10, 7.5, true, accent));
      remarkLines.forEach((line, lineIndex) => drawText(page, line, scopeColumns[3].x + 6, y - 14 - lineIndex * 10, 7.5, false, muted));
      y -= rowHeight;
    });

    y -= 18;

    if (technicalConsiderationsWriteup) {
      drawWriteupSection(technicalConsiderationsWriteup.title, technicalConsiderationsWriteup.content);
    }

    const summaryWidth = 250;
    const summaryHeight = 168;
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
    drawText(page, "Solar Roof Top System Pricing", PAGE_WIDTH - MARGIN - summaryWidth + 10, y - 16, 10, true, white);

    const summaryRows = [
      [`Solar Power Generating System With GST@${effectiveTaxPercent.toFixed(2)}%`, formatCurrency(systemTotalWithTax)],
      ["Solar System & Installation Cost", formatCurrency(systemInstallationCost)],
      ["Tax / GST", formatCurrency(taxTotalValue)],
      ["Total Amount / Total Kw", formatCurrency(totalAmountPerKw)],
      ["Registration Charges", formatCurrency(Number(documentData.gedaRegistrationCharges || 0))],
      ["Net Metering Charges", formatCurrency(Number(documentData.netMeteringCharges || 0))],
      ["Meter / Modem Charges", formatCurrency(Number(documentData.meterCharges || 0))],
      ["Grand Total", formatCurrency(proposalGrandTotal)],
    ];
    let summaryY = y - 40;
    summaryRows.forEach(([label, value], index) => {
      const emphasized = index === summaryRows.length - 1;
      const labelLines = wrapText(label, 126, 8.8, emphasized);
      labelLines.forEach((line, lineIndex) => {
        drawText(page, line, PAGE_WIDTH - MARGIN - summaryWidth + 10, summaryY - lineIndex * 10, 8.8, emphasized, accent);
      });
      drawRightAligned(
        page,
        value,
        PAGE_WIDTH - MARGIN - summaryWidth + 136,
        summaryWidth - 146,
        summaryY,
        8.8,
        emphasized,
        emphasized ? secondary : accent
      );
      summaryY -= Math.max(labelLines.length, 1) * 10 + 4;
    });
    y -= summaryHeight + 16;

    drawPaymentStagesSection();

    drawGenerationSection();

    const installationColumns = [
      { label: "Steps", x: MARGIN, width: 58 },
      { label: "Procedure", x: MARGIN + 58, width: 122 },
      { label: "Description", x: MARGIN + 180, width: 235 },
      { label: "Time Period (Approx)", x: MARGIN + 415, width: 116 },
    ];

    const drawInstallationHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({ x: MARGIN, y: topY - 24, width: CONTENT_WIDTH, height: 24, color: secondary });
      installationColumns.forEach((column) => {
        drawText(targetPage, column.label, column.x + 6, topY - 16, 8.2, true, white);
      });
    };

    if (y - 220 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Solar Plant Installation : Procedure & Time frame", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawInstallationHeader(page, y);
    y -= 28;

    documentData.installationProcedureSteps.forEach((step, index) => {
      const stepLines = wrapText(step.step, installationColumns[0].width - 12, 7.2, true);
      const procedureLines = wrapText(step.procedure, installationColumns[1].width - 12, 7.2, true);
      const descriptionLines = wrapText(step.description, installationColumns[2].width - 12, 7.2);
      const timeLines = wrapText(step.timePeriod, installationColumns[3].width - 12, 7.2, true);
      const rowHeight = 12 + Math.max(stepLines.length, procedureLines.length, descriptionLines.length, timeLines.length, 1) * 9;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "Solar Plant Installation : Procedure & Time frame", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawInstallationHeader(page, y);
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
      installationColumns.slice(1).forEach((column) => {
        page.drawLine({
          start: { x: column.x, y },
          end: { x: column.x, y: y - rowHeight },
          thickness: 1,
          color: subtleLine,
        });
      });

      stepLines.forEach((line, lineIndex) => drawText(page, line, installationColumns[0].x + 6, y - 12 - lineIndex * 9, 7.2, true, accent));
      procedureLines.forEach((line, lineIndex) => drawText(page, line, installationColumns[1].x + 6, y - 12 - lineIndex * 9, 7.2, true, accent));
      descriptionLines.forEach((line, lineIndex) => drawText(page, line, installationColumns[2].x + 6, y - 12 - lineIndex * 9, 7.2, false, muted));
      timeLines.forEach((line, lineIndex) => drawText(page, line, installationColumns[3].x + 6, y - 12 - lineIndex * 9, 7.2, true, accent));
      y -= rowHeight;
    });

    const procedureNoteLines = wrapText(documentData.installationProcedureNote, CONTENT_WIDTH - 20, 7.5);
    const procedureNoteHeight = 14 + procedureNoteLines.length * 9;
    if (y - procedureNoteHeight < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }
    page.drawRectangle({ x: MARGIN, y: y - procedureNoteHeight, width: CONTENT_WIDTH, height: procedureNoteHeight, color: white, borderColor: border, borderWidth: 1 });
    drawText(page, "Note", MARGIN + 8, y - 12, 7.8, true, accent);
    procedureNoteLines.forEach((line, index) => drawText(page, line, MARGIN + 42, y - 12 - index * 9, 7.5, false, muted));
    y -= procedureNoteHeight + 18;

    const roiRows = [
      ["Project Capacity", "kW", `${documentData.totalKw.toFixed(2)}`, "Size of plant"],
      ["Total Cost", "INR", formatCurrency(roiInstallationCost), "Total EPC cost"],
      [
        "Average Daily Generation",
        "kWh / kWp / day",
        documentData.roiAverageDailyGenerationUnitsPerKw.toFixed(2),
        "Based on site data",
      ],
      ["Average Yearly Shutdown", "Days", documentData.roiShutdownDays.toFixed(0), "Plant or grid-side maintenance downtime"],
      ["Electricity Tariff (Year 1)", "INR / kWh", formatCurrency(documentData.electricityTariffYear1), "Current grid rate"],
      ["Tariff Escalation", "%", documentData.roiTariffEscalationPercent.toFixed(2), "Expected yearly increase"],
      [
        "Annual Power Degradation (After 1st Year)",
        "%",
        documentData.roiAnnualPowerDegradationAfterYear1Percent.toFixed(2),
        "Module efficiency drop after Year 1",
      ],
      [
        "Annual Power Degradation (From 3rd Year onward)",
        "%",
        documentData.roiAnnualPowerDegradationFromYear3OnwardPercent.toFixed(2),
        "Module efficiency drop from Year 3 onward",
      ],
      [
        "O&M Cost (Year 1)",
        "% / INR",
        `${documentData.roiOperationMaintenancePercentYear1.toFixed(2)} | ${formatCurrency(roiOperationMaintenanceCostYear1)}`,
        "Year 1 maintenance cost as % of total cost",
      ],
      ["O&M Cost Escalation", "%", documentData.roiOperationMaintenanceEscalationPercent.toFixed(2), "Inflation in O&M"],
      ["Project Life", "Years", documentData.roiProjectLifeYears.toFixed(0), "Standard plant life used for ROI projection"],
    ];

    const roiColumns = [
      { label: "Parameter", x: MARGIN, width: 182 },
      { label: "Unit", x: MARGIN + 182, width: 72 },
      { label: "Value", x: MARGIN + 254, width: 122 },
      { label: "Notes", x: MARGIN + 376, width: 155 },
    ];

    const drawRoiHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({ x: MARGIN, y: topY - 24, width: CONTENT_WIDTH, height: 24, color: primary });
      roiColumns.forEach((column) => drawText(targetPage, column.label, column.x + 6, topY - 16, 8.2, true, white));
    };

    if (y - 260 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Solar Plant ROI Calculator", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawRoiHeader(page, y);
    y -= 28;

    roiRows.forEach((row, index) => {
      const parameterLines = wrapText(row[0], roiColumns[0].width - 12, 7.2, true);
      const unitLines = wrapText(row[1], roiColumns[1].width - 12, 7.2);
      const valueLines = wrapText(row[2], roiColumns[2].width - 12, 7.2, true);
      const noteLines = wrapText(row[3], roiColumns[3].width - 12, 7.2);
      const rowHeight = 12 + Math.max(parameterLines.length, unitLines.length, valueLines.length, noteLines.length, 1) * 9;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "Solar Plant ROI Calculator", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawRoiHeader(page, y);
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
      roiColumns.slice(1).forEach((column) => {
        page.drawLine({
          start: { x: column.x, y },
          end: { x: column.x, y: y - rowHeight },
          thickness: 1,
          color: subtleLine,
        });
      });

      parameterLines.forEach((line, lineIndex) => drawText(page, line, roiColumns[0].x + 6, y - 12 - lineIndex * 9, 7.2, true, accent));
      unitLines.forEach((line, lineIndex) => drawText(page, line, roiColumns[1].x + 6, y - 12 - lineIndex * 9, 7.2, false, accent));
      valueLines.forEach((line, lineIndex) => drawText(page, line, roiColumns[2].x + 6, y - 12 - lineIndex * 9, 7.2, true, accent));
      noteLines.forEach((line, lineIndex) => drawText(page, line, roiColumns[3].x + 6, y - 12 - lineIndex * 9, 7.2, false, muted));
      y -= rowHeight;
    });

    const roiResultCards = [
      { label: "Year 1 Generation", value: `${roiYear1GenerationKwh.toFixed(0)} kWh` },
      { label: "Year 1 Gross Savings", value: formatCurrency(roiYear1GrossSavings) },
      { label: "Year 1 Net Savings", value: formatCurrency(roiYear1NetSavings) },
      {
        label: "Estimated Payback",
        value: roiEstimatedPaybackYears === null ? "Beyond projection" : `${roiEstimatedPaybackYears.toFixed(2)} years`,
      },
      { label: "Lifetime Net Savings", value: formatCurrency(roiLifetimeNetSavings) },
    ];

    const roiCardGap = 10;
    const roiCardWidth = (CONTENT_WIDTH - roiCardGap * 2) / 3;
    const roiCardHeight = 42;
    if (y - 94 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    for (let index = 0; index < roiResultCards.length; index += 3) {
      const rowCards = roiResultCards.slice(index, index + 3);
      rowCards.forEach((card, cardIndex) => {
        const cardX = MARGIN + cardIndex * (roiCardWidth + roiCardGap);
        page.drawRectangle({ x: cardX, y: y - roiCardHeight, width: roiCardWidth, height: roiCardHeight, color: white, borderColor: border, borderWidth: 1 });
        drawText(page, card.label, cardX + 8, y - 14, 7, true, muted);
        drawWrapped(page, card.value, cardX + 8, y - 27, roiCardWidth - 16, 8.5, true, accent, 10);
      });
      y -= roiCardHeight + 10;
    }

    y -= 8;

    const roiProjectionColumns = [
      { label: "Year", x: MARGIN, width: 32 },
      { label: "Generation", x: MARGIN + 32, width: 66 },
      { label: "Tariff", x: MARGIN + 98, width: 58 },
      { label: "Revenue", x: MARGIN + 156, width: 76 },
      { label: "O&M", x: MARGIN + 232, width: 72 },
      { label: "Net", x: MARGIN + 304, width: 72 },
      { label: "Cumulative", x: MARGIN + 376, width: 86 },
      { label: "Payback", x: MARGIN + 462, width: 69 },
    ];

    const drawRoiProjectionHeader = (targetPage: PDFPage, topY: number) => {
      targetPage.drawRectangle({ x: MARGIN, y: topY - 24, width: CONTENT_WIDTH, height: 24, color: secondary });
      roiProjectionColumns.forEach((column) => {
        if (column.label === "Payback") {
          drawText(targetPage, column.label, column.x + 10, topY - 16, 7.2, true, white);
          return;
        }

        drawRightAligned(targetPage, column.label, column.x, column.width, topY - 16, 7.2, true, white);
      });
    };

    if (y - 170 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "ROI Calculation Table", MARGIN, y, 12.5, true, accent);
    y -= 10;
    drawRoiProjectionHeader(page, y);
    y -= 28;

    roiProjectionRows.forEach((row, index) => {
      const rowHeight = 22;

      if (y - rowHeight < FOOTER_TOP + 16) {
        ({ page, y } = createPage(true));
        drawText(page, "ROI Calculation Table", MARGIN, y, 12.5, true, accent);
        y -= 10;
        drawRoiProjectionHeader(page, y);
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
      roiProjectionColumns.slice(1).forEach((column) => {
        page.drawLine({ start: { x: column.x, y }, end: { x: column.x, y: y - rowHeight }, thickness: 1, color: subtleLine });
      });

      drawRightAligned(page, row.year.toString(), roiProjectionColumns[0].x, roiProjectionColumns[0].width, y - 14, 6.8, true, accent);
      drawRightAligned(page, row.generationKwh.toFixed(0), roiProjectionColumns[1].x, roiProjectionColumns[1].width, y - 14, 6.8, false, accent);
      drawRightAligned(page, row.tariffPerKwh.toFixed(2), roiProjectionColumns[2].x, roiProjectionColumns[2].width, y - 14, 6.8, false, accent);
      drawRightAligned(page, formatCurrency(row.annualRevenue), roiProjectionColumns[3].x, roiProjectionColumns[3].width, y - 14, 6.8, false, accent);
      drawRightAligned(page, formatCurrency(row.operationMaintenanceCost), roiProjectionColumns[4].x, roiProjectionColumns[4].width, y - 14, 6.8, false, accent);
      drawRightAligned(page, formatCurrency(row.netSavings), roiProjectionColumns[5].x, roiProjectionColumns[5].width, y - 14, 6.8, true, accent);
      drawRightAligned(page, formatCurrency(row.cumulativeSavings), roiProjectionColumns[6].x, roiProjectionColumns[6].width, y - 14, 6.8, true, accent);
      drawText(page, row.paybackAchieved ? "Yes" : "No", roiProjectionColumns[7].x + 21, y - 14, 6.8, true, row.paybackAchieved ? secondary : primary);
      y -= rowHeight;
    });

    y -= 16;

    const roiChartHeight = 176;
    if (y - roiChartHeight * 2 - 26 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Graphical Representation Of Yearly Generation V/S Tariff", MARGIN, y, 11.5, true, accent);
    y -= 12;
    drawDualAxisChartCard(page, {
      x: MARGIN,
      y,
      width: CONTENT_WIDTH,
      height: roiChartHeight,
      title: "Yearly Generation vs Tariff",
      data: roiProjectionRows.map((row) => ({
        label: row.year.toString(),
        barValue: row.generationKwh,
        lineValue: row.tariffPerKwh,
      })),
      barColor: secondary,
      lineColor: primary,
      leftFormatter: (value) => `${(value / 1000).toFixed(1)}k`,
      rightFormatter: (value) => value.toFixed(2),
      barLegend: "Generation (kWh)",
      lineLegend: "Tariff (Rs./kWh)",
    });
    y -= roiChartHeight + 18;

    if (y - roiChartHeight - 18 < FOOTER_TOP + 16) {
      ({ page, y } = createPage(true));
    }

    drawText(page, "Graphical Representation of Annual V/S Cumulative Savings", MARGIN, y, 11.5, true, accent);
    y -= 12;
    drawDualAxisChartCard(page, {
      x: MARGIN,
      y,
      width: CONTENT_WIDTH,
      height: roiChartHeight,
      title: "Annual Net Savings vs Cumulative Savings",
      data: roiProjectionRows.map((row) => ({
        label: row.year.toString(),
        barValue: row.netSavings,
        lineValue: row.cumulativeSavings,
      })),
      barColor: primary,
      lineColor: secondary,
      leftFormatter: (value) => `${(value / 1000).toFixed(0)}k`,
      rightFormatter: (value) => `${(value / 1000).toFixed(0)}k`,
      barLegend: "Annual Net Savings",
      lineLegend: "Cumulative Savings",
    });
    y -= roiChartHeight + 18;

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

    remainingWriteups.forEach((writeup: QuotationWriteupEntry) => {
      drawWriteupSection(writeup.title, writeup.content);
    });

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
