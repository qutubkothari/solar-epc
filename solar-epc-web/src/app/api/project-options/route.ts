import { NextResponse } from "next/server";
import { extractWattageFromItem } from "@/lib/solar-boq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sanitize = (value?: string | null) => (value || "").trim();

const parseCapacityKw = (value?: string | null) => {
  const text = sanitize(value);
  const match = text.match(/(\d+(?:\.\d+)?)\s*k\s*w/i);
  return match ? Number(match[1]) : null;
};

type VersionCandidate = {
  quoteId: string;
  quoteTitle: string;
  quoteStatus: string;
  versionId: string;
  versionLabel: string;
  createdAt: Date;
  grandTotal: number;
  isFinal: boolean;
  items: Array<{
    quantity: unknown;
    description?: string | null;
    item: {
      name: string;
      description?: string | null;
      category?: string | null;
      pricingUnit?: string | null;
    };
  }>;
};

const selectBestVersion = (
  quotations: Array<{
    id: string;
    title: string;
    status: string;
    finalVersionId?: string | null;
    versions: Array<{
      id: string;
      version: string;
      isFinal: boolean;
      createdAt: Date;
      grandTotal: unknown;
      items: VersionCandidate["items"];
    }>;
  }>
) => {
  const candidates: VersionCandidate[] = quotations.flatMap((quote) =>
    quote.versions.map((version) => ({
      quoteId: quote.id,
      quoteTitle: quote.title,
      quoteStatus: quote.status,
      versionId: version.id,
      versionLabel: version.version,
      createdAt: version.createdAt,
      grandTotal: Number(version.grandTotal || 0),
      isFinal: version.isFinal || quote.finalVersionId === version.id,
      items: version.items,
    }))
  );

  const explicitFinal = candidates
    .filter((candidate) => candidate.isFinal)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

  if (explicitFinal) {
    return { stage: "FINAL" as const, candidate: explicitFinal };
  }

  const latest = candidates.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  return latest ? { stage: "LATEST" as const, candidate: latest } : null;
};

const deriveVersionSummary = (candidate: VersionCandidate | null) => {
  if (!candidate) {
    return {
      systemCapacityKw: null,
      panelCount: null,
      inverterCapacityKw: null,
    };
  }

  const moduleLine = candidate.items.find((line) => {
    const haystack = [line.item.name, line.item.description, line.description, line.item.category]
      .map((value) => sanitize(value).toLowerCase())
      .join(" ");
    return haystack.includes("module") || haystack.includes("panel");
  });

  const inverterLine = candidate.items.find((line) => {
    const haystack = [line.item.name, line.item.description, line.description, line.item.category]
      .map((value) => sanitize(value).toLowerCase())
      .join(" ");
    return haystack.includes("inverter");
  });

  let systemCapacityKw: number | null = null;
  let panelCount: number | null = null;
  let inverterCapacityKw: number | null = null;

  if (moduleLine) {
    const quantity = Number(moduleLine.quantity || 0);
    const wattage = extractWattageFromItem({
      name: moduleLine.item.name,
      description: moduleLine.description || moduleLine.item.description,
    });

    if (moduleLine.item.pricingUnit === "RS_PER_WATT" && quantity > 0) {
      systemCapacityKw = Number((quantity / 1000).toFixed(2));
      if (wattage && wattage > 0) {
        panelCount = Math.max(1, Math.round(quantity / wattage));
      }
    } else if (quantity > 0) {
      panelCount = Math.round(quantity);
      if (wattage && wattage > 0) {
        systemCapacityKw = Number(((quantity * wattage) / 1000).toFixed(2));
      }
    }
  }

  if (inverterLine) {
    inverterCapacityKw =
      parseCapacityKw(inverterLine.description) ||
      parseCapacityKw(inverterLine.item.description) ||
      parseCapacityKw(inverterLine.item.name);

    if (!inverterCapacityKw && inverterLine.item.pricingUnit === "RS_PER_KW") {
      inverterCapacityKw = Number(inverterLine.quantity || 0);
    }
  }

  return {
    systemCapacityKw,
    panelCount,
    inverterCapacityKw,
  };
};

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const inquiries = await db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        applicationData: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        executionAssets: true,
        quotations: {
          include: {
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
        },
      },
    });

    const projects = inquiries.map((inquiry) => {
      const bestVersion = selectBestVersion(inquiry.quotations);
      const summary = deriveVersionSummary(bestVersion?.candidate || null);
      const latestApplication = inquiry.applicationData[0];
      const applicationData = (latestApplication?.data as Record<string, string | undefined> | undefined) || {};

      return {
        inquiryId: inquiry.id,
        inquiryTitle: inquiry.title,
        siteAddress: inquiry.siteAddress,
        clientId: inquiry.clientId,
        clientName: inquiry.client?.name || "Unknown Client",
        clientEmail: inquiry.client?.email || null,
        clientPhone: inquiry.client?.phone || null,
        clientAddress: inquiry.client?.address || null,
        quotationStage: bestVersion?.stage || "NONE",
        quotationId: bestVersion?.candidate.quoteId || null,
        quotationTitle: bestVersion?.candidate.quoteTitle || null,
        quotationStatus: bestVersion?.candidate.quoteStatus || null,
        quotationVersionId: bestVersion?.candidate.versionId || null,
        quotationVersionLabel: bestVersion?.candidate.versionLabel || null,
        quotationGrandTotal: bestVersion?.candidate.grandTotal || null,
        systemCapacityKw: summary.systemCapacityKw,
        panelCount: summary.panelCount,
        inverterCapacityKw: summary.inverterCapacityKw,
        applicationId: latestApplication?.id || null,
        applicationData,
        assetCount: inquiry.executionAssets.length,
      };
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching project options:", error);
    return NextResponse.json({ error: "Failed to fetch project options" }, { status: 500 });
  }
}