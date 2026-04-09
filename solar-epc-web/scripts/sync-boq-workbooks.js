/* eslint-disable no-console */
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BOQ_LIST_PATH = path.resolve(__dirname, "..", "..", "BOQ LIST.xlsx");
const BOQ_SEQUENCE_PATH = path.resolve(__dirname, "..", "..", "BOQ Sequence.xlsx");

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalize = (value) => clean(value).toLowerCase();

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const pricingUnitFromUom = (uom) => {
  const unit = clean(uom).toUpperCase();
  if (unit === "WP") return "RS_PER_WATT";
  if (unit === "KW") return "RS_PER_KW";
  return "PER_UNIT";
};

const deterministicSku = (itemHead, itemType, rating, make) =>
  [itemHead, itemType, rating, make]
    .map((value) => normalize(value).replace(/[^a-z0-9]+/g, "-"))
    .filter(Boolean)
    .join("__");

const getSequenceHeads = () => {
  const workbook = XLSX.readFile(BOQ_SEQUENCE_PATH, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, defval: null });

  return rows
    .slice(1)
    .map((row) => clean(row[1]))
    .filter(Boolean);
};

const getBoqWorkbookItems = (validHeads) => {
  const workbook = XLSX.readFile(BOQ_LIST_PATH, { cellDates: true });
  const sheet = workbook.Sheets["Sheet1"] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  return rows
    .slice(1)
    .map((row) => {
      const itemHead = clean(row[1]);
      const rawItemType = clean(row[2]);
      const rawRating = clean(row[3]);
      const make = clean(row[4]);
      const details = clean(row[5]);
      const uom = clean(row[6]);
      const rate = toNumber(row[7]);
      const gstRaw = toNumber(row[8]);

      const itemType = rawItemType || rawRating || itemHead;
      const rating = rawItemType ? rawRating : "";

      if (!validHeads.includes(itemHead) || !itemType) {
        return null;
      }

      const name = rating ? `${itemType} - ${rating}` : itemType;
      const descriptionParts = [];
      if (rating) descriptionParts.push(`Rating/Capacity: ${rating}`);
      if (details) descriptionParts.push(details);

      return {
        itemHead,
        itemType,
        rating,
        name,
        brand: make || null,
        description: descriptionParts.join(" | ") || null,
        uom: uom || "NOS",
        unitPrice: rate,
        taxPercent: gstRaw <= 1 ? gstRaw * 100 : gstRaw,
        pricingUnit: pricingUnitFromUom(uom),
        sku: deterministicSku(itemHead, itemType, rating, make),
      };
    })
    .filter(Boolean);
};

const sync = async () => {
  const validHeads = getSequenceHeads();
  const boqItems = getBoqWorkbookItems(validHeads);

  if (boqItems.length === 0) {
    throw new Error("No BOQ items found in workbook sync");
  }

  const existing = await prisma.item.findMany({
    where: {
      sku: {
        in: boqItems.map((item) => item.sku),
      },
    },
    select: {
      id: true,
      sku: true,
    },
  });

  const existingBySku = new Map(existing.map((item) => [item.sku, item.id]));

  await prisma.item.updateMany({
    data: {
      isActive: false,
    },
  });

  let created = 0;
  let updated = 0;

  for (const item of boqItems) {
    const data = {
      name: item.name,
      description: item.description,
      brand: item.brand,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent,
      marginPercent: 0,
      uom: item.uom,
      pricingUnit: item.pricingUnit,
      category: item.itemHead,
      sku: item.sku,
      isActive: true,
    };

    const existingId = existingBySku.get(item.sku);
    if (existingId) {
      await prisma.item.update({ where: { id: existingId }, data });
      updated += 1;
    } else {
      await prisma.item.create({ data });
      created += 1;
    }
  }

  console.log(`BOQ workbook sync complete. Created: ${created}, Updated: ${updated}, Active: ${boqItems.length}`);
};

sync()
  .catch((error) => {
    console.error("BOQ workbook sync failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });