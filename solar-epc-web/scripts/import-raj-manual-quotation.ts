import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["error", "warn"] });

const quoteTitle = "Quotation 786-110 - RAJ NONWOVEN ENTERPRISE - 31.27 KW";
const issueDateIso = "2025-12-19T00:00:00.000Z";

const generationTable = [
  { month: "Jan", unitsPerDay: 4459.1 / 31, days: 31 },
  { month: "Feb", unitsPerDay: 4027.6 / 28, days: 28 },
  { month: "Mar", unitsPerDay: 4846.9 / 31, days: 31 },
  { month: "Apr", unitsPerDay: 4690.5 / 30, days: 30 },
  { month: "May", unitsPerDay: 4846.9 / 31, days: 31 },
  { month: "Jun", unitsPerDay: 4690.5 / 30, days: 30 },
  { month: "Jul", unitsPerDay: 3974.4 / 31, days: 31 },
  { month: "Aug", unitsPerDay: 3974.4 / 31, days: 31 },
  { month: "Sep", unitsPerDay: 3658.6 / 30, days: 30 },
  { month: "Oct", unitsPerDay: 4459.1 / 31, days: 31 },
  { month: "Nov", unitsPerDay: 4315.3 / 30, days: 30 },
  { month: "Dec", unitsPerDay: 4459.1 / 31, days: 31 },
];

const paymentStages = [
  {
    label: "Stage 1: Booking Amount",
    milestone: "At the time of order confirmation.",
    percentage: 10,
    remarks: "Ensures order confirmation and documentation.",
  },
  {
    label: "Stage 2: Approval Process",
    milestone: "After GEDA registration and feasibility approval.",
    percentage: 30,
    remarks: "Do not Covers registration and initial processing fees.",
  },
  {
    label: "Stage 3: Installation",
    milestone: "After delivery of materials and start of installation work.",
    percentage: 30,
    remarks: "For procurement of materials and labor costs.",
  },
  {
    label: "Stage 4: Testing & Inspection",
    milestone: "After successful installation and CEIG inspection approval.",
    percentage: 20,
    remarks: "Covers inspection, testing, and net metering processes.",
  },
  {
    label: "Stage 5: Project Handover",
    milestone: "On successful commissioning and handover of the solar plant.",
    percentage: 10,
    remarks: "Final settlement after completion of the project.",
  },
];

const installationProcedureSteps = [
  {
    step: "Step-1",
    procedure: "GEDA Registration",
    description: "Start Registration process By Collecting Required Documents",
    timePeriod: "1-2 working Days",
  },
  {
    step: "Step-2",
    procedure: "Document Verification",
    description: "Verification of uploaded documents after registration",
    timePeriod: "4-5 Working days",
  },
  {
    step: "Step-3",
    procedure: "Feasibility Approval",
    description: "DISCOM will Give Feasibility Approval & issue Estimate of solar Meter after Document verification",
    timePeriod: "10-15 Working days",
  },
  {
    step: "Step-4",
    procedure: "IFP Drawing Approval",
    description: "Applicable for above 10kw. In this step HTSS will make an Electrical drawing and upload on IFP Portal For further installation process.",
    timePeriod: "15-20 Working days",
  },
  {
    step: "Step-5",
    procedure: "Execution Work",
    description: "After Getting all Approvals we will start plant execution work",
    timePeriod: "15-20 Working days",
  },
  {
    step: "Step-6",
    procedure: "CEIG Inspection Approval",
    description: "Applicable for above 10kw. After Completing the Installation Process We will Apply for CEIG Inspection, CEIG inspector will physically come on site and verify all the parameters.",
    timePeriod: "15-20 Working days",
  },
  {
    step: "Step-7",
    procedure: "Net Metering Process",
    description: "Once we get CEIG Approval, we will prepare a file for net metering process and submit it to DISCOM for meter installation process",
    timePeriod: "30-45 Working days",
  },
  {
    step: "Step-8",
    procedure: "Commissioning & Testing",
    description: "After Installation and CEIG approval Testing procedure will be done by HTSS",
    timePeriod: "1-2 working Days",
  },
  {
    step: "Step-9",
    procedure: "Completion of project",
    description: "After testing, HTSS will handover the plant to the client",
    timePeriod: "1-2 working Days",
  },
];

const requiredDocuments = [
  "Latest Electricity Bill",
  "Ownership proof",
  "Aadhar & Pan Card of Authorised Person",
  "Pan Card & Cancelled Cheque of firm",
  "Passport size photo of Authorised Person",
  "GST Certificate",
  "Undertaking on 300Rs stamp Paper",
  "Authorisation letter",
];

const toDataUrl = async (filePath: string) => {
  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).replace(".", "").toLowerCase() || "png";
  return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
};

const main = async () => {
  const logoPath = path.resolve("tmp", "raj-manual-extract", "assets", "embedded-page-1-image-1.png");
  const companyLogo = await toDataUrl(logoPath);

  const companySettings = await db.companySettings.upsert({
    where: { id: "default" },
    update: {
      companyName: "HI - TECH SOLAR SOLUTION",
      companyTagline: "Solutions You Can Trust.",
      companyLogo,
      contactEmail: "hitechsolarsolu@gmail.com",
      contactPhone: "+91-8140535380",
      contactAddress: "OFFICE - 2nd Floor Gujarat Light, Nr Mahila Police Station, Godhra Road, Dahhod - 389151",
      footerText: "HI - TECH SOLAR SOLUTION",
    },
    create: {
      id: "default",
      companyName: "HI - TECH SOLAR SOLUTION",
      companyTagline: "Solutions You Can Trust.",
      companyLogo,
      primaryColor: "#F59E0B",
      secondaryColor: "#059669",
      accentColor: "#0F172A",
      contactEmail: "hitechsolarsolu@gmail.com",
      contactPhone: "+91-8140535380",
      contactAddress: "OFFICE - 2nd Floor Gujarat Light, Nr Mahila Police Station, Godhra Road, Dahhod - 389151",
      footerText: "HI - TECH SOLAR SOLUTION",
    },
  });

  let client = await db.client.findFirst({
    where: {
      name: "RAJ NONWOVEN ENTERPRISE",
    },
  });

  if (client) {
    client = await db.client.update({
      where: { id: client.id },
      data: {
        contactName: "JUZER BHAI",
        notes: "Imported from manual quotation 786-110 dated 19-12-2025.",
        status: "Quoted",
      },
    });
  } else {
    client = await db.client.create({
      data: {
        name: "RAJ NONWOVEN ENTERPRISE",
        contactName: "JUZER BHAI",
        notes: "Imported from manual quotation 786-110 dated 19-12-2025.",
        status: "Quoted",
      },
    });
  }

  let item = await db.item.findFirst({
    where: {
      name: "Solar Power Generating System",
      pricingUnit: "RS/KW",
    },
  });

  if (!item) {
    item = await db.item.create({
      data: {
        name: "Solar Power Generating System",
        description: "31.27 kW rooftop solar system supply and installation",
        brand: "HI-TECH SOLAR SOLUTION",
        unitPrice: 29000,
        taxPercent: 6,
        marginPercent: 0,
        uom: "KW",
        pricingUnit: "RS/KW",
        category: "Solar System",
        isActive: true,
      },
    });
  }

  const documentData = {
    consumerType: "LT Consumer",
    consumerNumber: "09902151795",
    preparedFor: "RAJ NONWOVEN ENTERPRISE",
    customerContactPerson: "JUZER BHAI",
    preparedBy: "Er. Ilyas Kaydawala",
    validityDays: 10,
    moduleWattage: 590,
    numberOfModules: 53,
    totalWatts: 31270,
    totalKw: 31.27,
    systemType: "On Grid",
    requiredAreaFactorSqftPerKw: 50,
    expectedGenerationUnitsPerKw: 4.59,
    electricityTariffYear1: 8,
    generationTable,
    generationDisclaimer:
      "Predicted Generation is Indicative only. It may vary depending upon weather condition & Module Condition. Savings Calculated @ INR 8/Unit",
    structureHeightSouth: "6 ft",
    structureHeightNorth: "8 Ft",
    arrayLayout: "South Facing, 14° Tilt, Portrait orientation",
    monitoringSystem: "Remote Monitoring System (Wi-Fi/GPRS), Web & Mobile Interface",
    netMeteringProvision: "System compatible and provision for Net Metering as per DISCOM norms",
    approvalsCompliance: "MNRE, DISCOM, CEIG, IEC/BIS Standards",
    projectCompletionTimeline: "3 -4 Weeks from Advance and Site Readiness",
    moduleWarranty: "30 years",
    inverterWarranty: "5 years from Manufacturer",
    structureWindSpeed: "Wind Speed Resistance as per IS 875: up to 120 kmph",
    gedaRegistrationCharges: 15340,
    netMeteringCharges: 62032,
    meterCharges: 0,
    installationProcedureSteps,
    installationProcedureNote:
      "The procedure and timeframe mentioned above are approximate and may vary depending on various factors such as weather conditions, document processing delays, payments delay and approvals from concerned authorities. These timelines are provided as a general guideline and are not fixed.",
    roiAverageDailyGenerationUnitsPerKw: 4,
    roiShutdownDays: 30,
    roiTariffEscalationPercent: 3,
    roiAnnualPowerDegradationAfterYear1Percent: 2,
    roiAnnualPowerDegradationFromYear3OnwardPercent: 0.5,
    roiOperationMaintenanceCostYear1: 9612.4,
    roiOperationMaintenancePercentYear1: 1,
    roiOperationMaintenanceEscalationPercent: 3,
    roiProjectLifeYears: 30,
    paymentStages,
    requiredDocuments,
    bankDetails: {
      bankName: "AU SMALL FINANCE BANK",
      accountName: "Hi-Tech Solar Solution",
      accountNumber: "1107865152531445",
      accountType: "CURRENT ACCOUNT",
      ifscCode: "AUBL0002158",
      branch: "DAHOD",
    },
  };

  const existingQuotation = await db.quotation.findFirst({
    where: {
      clientId: client.id,
      title: quoteTitle,
    },
    include: {
      versions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const subtotal = 906830;
  const taxTotal = 54410;
  const grandTotal = 961240;

  let quotationId = existingQuotation?.id;
  let versionId = existingQuotation?.versions[0]?.id;

  if (!existingQuotation) {
    const created = await db.quotation.create({
      data: {
        clientId: client.id,
        title: quoteTitle,
        status: "FINAL",
        createdAt: new Date(issueDateIso),
        updatedAt: new Date(issueDateIso),
        versions: {
          create: {
            version: "1.0",
            brand: "HI-TECH SOLAR SOLUTION",
            documentData,
            isFinal: true,
            subtotal,
            taxTotal,
            marginTotal: 0,
            grandTotal,
            createdAt: new Date(issueDateIso),
            items: {
              create: [
                {
                  itemId: item.id,
                  description: "Solar Power Generating System 31.27 KW",
                  quantity: 31.27,
                  rate: 29000,
                  marginPercent: 0,
                  taxPercent: 6,
                  lineTotal: grandTotal,
                },
              ],
            },
          },
        },
      },
      include: {
        versions: true,
      },
    });

    quotationId = created.id;
    versionId = created.versions[0]?.id;

    if (versionId) {
      await db.quotation.update({
        where: { id: created.id },
        data: { finalVersionId: versionId },
      });
    }
  } else if (versionId) {
    await db.quotation.update({
      where: { id: existingQuotation.id },
      data: {
        status: "FINAL",
        finalVersionId: versionId,
      },
    });

    await db.quotationVersion.update({
      where: { id: versionId },
      data: {
        brand: "HI-TECH SOLAR SOLUTION",
        documentData,
        isFinal: true,
        subtotal,
        taxTotal,
        marginTotal: 0,
        grandTotal,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        clientId: client.id,
        quotationId,
        versionId,
        companySettingsId: companySettings.id,
        companyLogoUpdated: true,
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });