/* eslint-disable no-console */
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const normalize = (value) => String(value ?? "").trim().toLowerCase();
const isEmptyRow = (row) => row.every((cell) => cell === null || cell === "");

const findHeaderRow = (rows, keywords) => {
  for (let i = 0; i < rows.length; i += 1) {
    const rowText = rows[i].map((cell) => normalize(cell)).join(" ");
    if (keywords.every((keyword) => rowText.includes(keyword))) {
      return i;
    }
  }
  return -1;
};

const toHeaderKey = (value, index) => {
  const key = String(value ?? "").trim();
  if (!key) return `column_${index}`;
  return key.replace(/\s+/g, " ");
};

const rowsToObjects = (rows, headerIndex) => {
  if (headerIndex < 0) return { headers: [], items: [] };
  const headers = rows[headerIndex].map((cell, index) => toHeaderKey(cell, index));
  const items = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx] ?? null;
    });
    items.push({ rowIndex: i + 1, record });
  }
  return { headers, items };
};

const safeNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/[^0-9.+-]/g, ""));
  return Number.isNaN(num) ? null : num;
};

const importInventory = async (rows) => {
  const headerIndex = findHeaderRow(rows, ["sr no", "item name", "make", "description", "unit", "rate"]);
  const { items } = rowsToObjects(rows, headerIndex);
  const inventory = items
    .map(({ record }) => ({
      name: record["ITEM NAME"],
      make: record["MAKE"],
      description: record["DESCRIPTION"],
      unit: record["UNIT"],
      rate: safeNumber(record["RATE"]),
    }))
    .filter((item) => item.name);

  if (inventory.length === 0) return { created: 0, updated: 0 };

  const names = inventory.map((item) => String(item.name).trim());
  const existing = await prisma.item.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const existingMap = new Map(existing.map((item) => [item.name, item.id]));

  let created = 0;
  let updated = 0;

  for (const item of inventory) {
    const name = String(item.name).trim();
    const data = {
      name,
      description: item.description ? String(item.description).trim() : null,
      unitPrice: item.rate ?? 0,
      taxPercent: 0,
      marginPercent: 0,
      uom: item.unit ? String(item.unit).trim() : null,
      category: "Inventory",
    };
    const existingId = existingMap.get(name);
    if (existingId) {
      await prisma.item.update({ where: { id: existingId }, data });
      updated += 1;
    } else {
      await prisma.item.create({ data });
      created += 1;
    }
  }

  return { created, updated };
};

const importPriceList = async (rows) => {
  const headerIndex = findHeaderRow(rows, ["item name", "unit", "rate", "gst"]);
  const { items } = rowsToObjects(rows, headerIndex);
  const priceItems = items
    .map(({ record }) => ({
      name: record["ITEM NAME"],
      unit: record["UNIT"],
      rate: safeNumber(record["RATE"]),
      gst: safeNumber(record["GST"]),
    }))
    .filter((item) => item.name);

  if (priceItems.length === 0) return { created: 0, updated: 0 };

  const names = priceItems.map((item) => String(item.name).trim());
  const existing = await prisma.item.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const existingMap = new Map(existing.map((item) => [item.name, item.id]));

  let created = 0;
  let updated = 0;

  for (const item of priceItems) {
    const name = String(item.name).trim();
    const data = {
      name,
      description: null,
      unitPrice: item.rate ?? 0,
      taxPercent: item.gst ?? 0,
      marginPercent: 0,
      uom: item.unit ? String(item.unit).trim() : null,
      category: "Price List",
    };
    const existingId = existingMap.get(name);
    if (existingId) {
      await prisma.item.update({ where: { id: existingId }, data });
      updated += 1;
    } else {
      await prisma.item.create({ data });
      created += 1;
    }
  }

  return { created, updated };
};

const importTechnicalData = async (rows, sheetName) => {
  const headerIndex = findHeaderRow(rows, ["structure", "module", "month"]);
  if (headerIndex < 0) return 0;
  const { headers, items } = rowsToObjects(rows, headerIndex);
  const datasetRows = items
    .map(({ rowIndex, record }) => ({
      rowIndex,
      data: record,
    }))
    .filter(({ data }) => Object.values(data).some((value) => value !== null && value !== ""));

  if (datasetRows.length === 0) return 0;

  const payload = datasetRows.map((row) => ({
    sourceSheet: sheetName,
    rowIndex: row.rowIndex,
    data: { headers, values: row.data },
  }));

  await prisma.technicalDataset.createMany({ data: payload });
  return payload.length;
};

const importQuotationTemplate = async (rows, sheetName, templateName) => {
  const headerIndex = findHeaderRow(rows, ["sr no", "item name", "unit"]);
  const { headers, items } = rowsToObjects(rows, headerIndex);
  const dataRows = items.map(({ record }) => record);

  const existing = await prisma.quotationTemplate.findFirst({
    where: { name: templateName },
  });
  if (existing) {
    await prisma.quotationTemplate.update({
      where: { id: existing.id },
      data: { sourceSheet: sheetName, data: { headers, rows: dataRows } },
    });
    return "updated";
  }

  await prisma.quotationTemplate.create({
    data: {
      name: templateName,
      sourceSheet: sheetName,
      data: { headers, rows: dataRows },
    },
  });
  return "created";
};

const importRawSheetTemplate = async (rows, sheetName) => {
  const data = rows.filter((row) => row.some((cell) => cell !== null && cell !== ""));
  const templateName = `Imported ${sheetName}`;
  const existing = await prisma.quotationTemplate.findFirst({ where: { name: templateName } });
  if (existing) {
    await prisma.quotationTemplate.update({
      where: { id: existing.id },
      data: { sourceSheet: sheetName, data: { rows: data } },
    });
    return "updated";
  }
  await prisma.quotationTemplate.create({
    data: {
      name: templateName,
      sourceSheet: sheetName,
      data: { rows: data },
    },
  });
  return "created";
};

const run = async () => {
  const filePath = path.resolve(__dirname, "..", "..", "EPC.xlsx");
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  const inventorySheet = workbook.Sheets["Inventry"];
  const dataSheet = workbook.Sheets["DATA"];
  const priceSheet = workbook.Sheets["PRICE LIST"];
  const sheet1 = workbook.Sheets["Sheet1"];
  const sheet2 = workbook.Sheets["Sheet2"];

  if (inventorySheet) {
    const rows = XLSX.utils.sheet_to_json(inventorySheet, { header: 1, defval: null });
    const result = await importInventory(rows);
    console.log("Inventory import:", result);
  }

  if (priceSheet) {
    const rows = XLSX.utils.sheet_to_json(priceSheet, { header: 1, defval: null });
    const result = await importPriceList(rows);
    console.log("Price list import:", result);
  }

  if (dataSheet) {
    const rows = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: null });
    const count = await importTechnicalData(rows, "DATA");
    console.log("Technical data rows imported:", count);
  }

  if (sheet1) {
    const rows = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: null });
    const status = await importQuotationTemplate(
      rows,
      "Sheet1",
      "Industrial HT Consumer Solar Quotation Format"
    );
    console.log("Quotation template Sheet1:", status);
  }

  if (sheet2) {
    const rows = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null });
    const status = await importRawSheetTemplate(rows, "Sheet2");
    console.log("Quotation template Sheet2:", status);
  }
};

run()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
