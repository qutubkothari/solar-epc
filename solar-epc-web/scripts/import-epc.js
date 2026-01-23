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
  
  // Helper function to determine category based on item name
  const getCategory = (name) => {
    if (!name) return 'Other';
    const n = String(name).toUpperCase();
    if (n.includes('FACIAL') || n.includes('MODULE') || n.includes('PANEL') || n.includes('TOPCON') || n.includes('MONO')) return 'Solar Modules';
    if (n.includes('INVERTER') || n.includes('INV -') || n.includes('INV-') || n.includes('SG')) return 'Inverters';
    if (n.includes('STRUCTURE') || n.includes('STR -') || n.includes('STR-') || n.includes('MONO RAIL') || n.includes('ELEVATED')) return 'Mounting Structure';
    if (n.includes('ACDB')) return 'ACDB';
    if (n.includes('DCDB')) return 'DCDB';
    if (n.includes('EARTHING') || n.includes('ERTH') || n.includes('GI STRIP')) return 'Earthing';
    if (n.includes('LIGHTNING') || n.includes('LA ') || n.includes('ESE ')) return 'Lightning Arrestor';
    if (n.includes('CABLE') || n.includes('DC 1C') || n.includes('AC ') && n.includes('SQMM') || n.includes('WIRE')) return 'Cables';
    if (n.includes('MC4') || n.includes('CONNECTOR')) return 'Connectors';
    if (n.includes('CABLE TRAY') || n.includes('FRP') && n.includes('TRAY')) return 'Cable Trays';
    if (n.includes('CONDUIT') || n.includes('CONDUITE') || n.includes('PVC PIPE')) return 'Conduits';
    if (n.includes('WALKWAY') || n.includes('WALK WAY')) return 'Walkway';
    if (n.includes('BASE PLATE') || n.includes('BOLT') || n.includes('CLAMP') || n.includes('FASTENER')) return 'Fasteners';
    if (n.includes('LA POLE')) return 'LA Poles';
    if (n.includes('NET METER')) return 'Net Meter';
    return 'Other';
  };
  
  // Determine pricing unit based on item unit
  const getPricingUnit = (unit) => {
    if (!unit) return 'PER_UNIT';
    const u = String(unit).toUpperCase().trim();
    if (u.includes('WP') || u.includes('WATT')) return 'RS_PER_WATT';
    if (u.includes('KW') || u.includes('Kw')) return 'RS_PER_KW';
    return 'PER_UNIT';
  };
  
  const inventory = items
    .map(({ record }) => ({
      srNo: record["SR NO"] || record["Sr No"] || null,
      name: record["ITEM NAME"],
      make: record["MAKE"],
      description: record["DESCRIPTION"],
      unit: record["UNIT"],
      rate: safeNumber(record["RATE"]),
    }))
    .filter((item) => {
      if (!item.name) return false;
      const name = String(item.name).trim();
      if (!name) return false;
      // Skip number-only names
      if (/^\d+\.?\d*$/.test(name)) return false;
      // Skip short names
      if (name.length < 3) return false;
      return true;
    });

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
    const unitStr = item.unit ? String(item.unit).trim() : null;
    
    const data = {
      name,
      description: item.description ? String(item.description).trim() : null,
      brand: item.make ? String(item.make).trim() : null,
      srNo: item.srNo ? parseInt(String(item.srNo).trim()) : null,
      unitPrice: item.rate ?? 0,
      taxPercent: 0.18, // Default 18% GST for inventory items
      marginPercent: 0,
      uom: unitStr,
      pricingUnit: getPricingUnit(unitStr),
      category: getCategory(name),
      isActive: true,
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
  const headerIndex = findHeaderRow(rows, ["sr no", "item name", "unit", "rate", "gst"]);
  
  console.log(`PRICE LIST: Found header at row ${headerIndex + 1}`);
  
  const { items } = rowsToObjects(rows, headerIndex);
  
  console.log(`PRICE LIST: Extracted ${items.length} total rows after header`);
  
  // Helper function to categorize solar EPC items
  const getCategory = (name) => {
    if (!name) return 'Other';
    const n = String(name).toUpperCase();
    if (n.includes('MODULE') || n.includes('PANEL') || n.includes('BI FACIAL') || n.includes('TOPCON') || n.includes('MONO')) return 'Solar Modules';
    if (n.includes('INVERTER') || n.includes('SG') && /\d+K/.test(n)) return 'Inverters';
    if (n.includes('STRUCTURE') || n.includes('ELEVATED') || n.includes('60 X 40') || n.includes('80 X 40')) return 'Mounting Structure';
    if (n.includes('ACDB')) return 'ACDB';
    if (n.includes('DCDB')) return 'DCDB';
    if (n.includes('EARTHING') || n.includes('EARTH') || n.includes('GI STRIP')) return 'Earthing';
    if (n.includes('LIGHTNING') || n.includes('LA ') || n.includes('ESE')) return 'Lightning Arrestor';
    if (n.includes('CABLE') || n.includes('DC 1C') || n.includes('SQMM') || n.includes('WIRE')) return 'Cables';
    if (n.includes('MC4') || n.includes('CONNECTOR')) return 'Connectors';
    if (n.includes('NET METER') || n.includes('NETMETER')) return 'Net Meter';
    if (n.includes('MONITORING') || n.includes('DATALOGGER')) return 'Monitoring';
    if (n.includes('CIVIL') || n.includes('FOUNDATION')) return 'Civil Works';
    if (n.includes('CABLE TRAY') || n.includes('FRP')) return 'Cable Trays';
    if (n.includes('CONDUIT') || n.includes('CONDUITE')) return 'Conduits';
    if (n.includes('WALKWAY')) return 'Walkway';
    if (n.includes('BOLT') || n.includes('CLAMP') || n.includes('FASTENER')) return 'Fasteners';
    return 'Other';
  };
  
  const priceItems = items
    .map(({ record }) => ({
      srNo: record["SR NO"] || record["Sr No"] || null,
      name: record["ITEM NAME"],
      unit: record["UNIT"],
      rate: safeNumber(record["RATE"]),
      gst: safeNumber(record["GST"]),
    }))
    .filter((item) => {
      // Skip if no name
      if (!item.name) return false;
      
      const name = String(item.name).trim();
      
      // Skip if name is empty after trimming
      if (!name) return false;
      
      // Skip if name is just a number (like "12", "100", "102")
      if (/^\d+\.?\d*$/.test(name)) return false;
      
      // Skip if name is very short (less than 3 characters)
      if (name.length < 3) return false;
      
      // Skip common placeholder/junk values
      const upperName = name.toUpperCase();
      if (upperName === 'N/A' || upperName === 'NA' || upperName === '-' || upperName === 'NULL') return false;
      
      return true;
    });
  
  console.log(`PRICE LIST: Filtered to ${priceItems.length} valid items`);

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
    const unitStr = item.unit ? String(item.unit).trim().toUpperCase() : null;
    
    // Determine pricing unit for solar EPC calculations
    let pricingUnit = 'PER_UNIT'; // Default
    if (unitStr) {
      if (unitStr.includes('RS/WATT') || unitStr.includes('RS/W')) {
        pricingUnit = 'RS_PER_WATT';
      } else if (unitStr.includes('RS/KW') || unitStr.includes('RS/Kw')) {
        pricingUnit = 'RS_PER_KW';
      }
    }
    
    const data = {
      name,
      description: null,
      srNo: item.srNo ? parseInt(String(item.srNo).trim()) : null,
      unitPrice: item.rate ?? 0,
      taxPercent: item.gst ?? 0,
      marginPercent: 0,
      uom: unitStr,
      pricingUnit,
      category: getCategory(name),
      isActive: true,
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

const importRawSheetTemplate = async (rows, sheetName, templateName) => {
  const data = rows.filter((row) => row.some((cell) => cell !== null && cell !== ""));
  const resolvedName = templateName || `Imported ${sheetName}`;
  const existing = await prisma.quotationTemplate.findFirst({ where: { name: resolvedName } });
  if (existing) {
    await prisma.quotationTemplate.update({
      where: { id: existing.id },
      data: { sourceSheet: sheetName, data: { rows: data } },
    });
    return "updated";
  }
  await prisma.quotationTemplate.create({
    data: {
      name: resolvedName,
      sourceSheet: sheetName,
      data: { rows: data },
    },
  });
  return "created";
};

/**
 * Import BOQ items from QUOTATION sheet columns U to AH
 * Column mapping (0-indexed from U=20):
 * U(0): Sr No, V(1): Item Head, W(2): Item Type, X(3): Item Name
 * Y(4): Make/Brand, Z(5): Description, AA(6): Unit
 * AB(7): Rate w/o GST, AC(8): Qty, AD(9): Total
 * AE(10): GST %, AF(11): Total GST, AG(12): Rate with GST, AH(13): Item Head
 */
const importBOQItems = async (rows) => {
  // BOQ data starts at row 4 (0-indexed row 3), header at row 3
  // Columns U-AH are indices 20-33
  const boqItems = [];
  
  for (let rowIdx = 3; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!row || row.length < 30) continue;
    
    // Extract columns U to AH (indices 20-33)
    const srNo = row[20]; // U - Sr No
    const itemHead = row[21]; // V - Item Head (category)
    const itemType = row[22]; // W - Item Type
    const itemName = row[23]; // X - Item Name
    const make = row[24]; // Y - Make/Brand
    const description = row[25]; // Z - Description
    const unit = row[26]; // AA - Unit
    const rateWithoutGst = safeNumber(row[27]); // AB - Rate w/o GST
    const qty = safeNumber(row[28]); // AC - Quantity
    const total = safeNumber(row[29]); // AD - Total
    const gstPercent = safeNumber(row[30]); // AE - GST %
    const totalGst = safeNumber(row[31]); // AF - Total GST
    const rateWithGst = safeNumber(row[32]); // AG - Rate with GST
    
    // Skip if no item name or if it's a subtotal/header row
    if (!itemName || String(itemName).toLowerCase().includes("sub total") || 
        String(itemName).toLowerCase().includes("final value") ||
        String(itemHead).toLowerCase().includes("sub total")) {
      continue;
    }
    
    // Skip header row
    if (String(itemName).toLowerCase() === "item name") continue;
    
    boqItems.push({
      name: String(itemName).trim(),
      category: itemHead ? String(itemHead).trim() : (itemType ? String(itemType).trim() : "BOQ Item"),
      itemType: itemType ? String(itemType).trim() : null,
      brand: make ? String(make).trim() : null,
      description: description ? String(description).trim() : null,
      unit: unit ? String(unit).trim() : null,
      rateWithoutGst,
      gstPercent: gstPercent ? gstPercent * 100 : null, // Convert 0.18 to 18
      rateWithGst,
      defaultQty: qty,
    });
  }
  
  if (boqItems.length === 0) return { created: 0, updated: 0 };
  
  // Get existing items by name
  const names = boqItems.map(item => item.name);
  const existing = await prisma.item.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const existingMap = new Map(existing.map(item => [item.name, item.id]));
  
  let created = 0;
  let updated = 0;
  
  for (const item of boqItems) {
    const data = {
      name: item.name,
      description: item.description || `${item.category} - ${item.brand || 'Standard'}`,
      unitPrice: item.rateWithoutGst || item.rateWithGst || 0,
      taxPercent: item.gstPercent || 18,
      marginPercent: 0,
      uom: item.unit || "Nos",
      category: item.category,
    };
    
    const existingId = existingMap.get(item.name);
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

const run = async () => {
  const filePath = path.resolve(__dirname, "..", "..", "EPC.xlsx");
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  const inventorySheet = workbook.Sheets["Inventry"];
  const dataSheet = workbook.Sheets["DATA"];
  const priceSheet = workbook.Sheets["PRICE LIST"];
  const proposalSheet = workbook.Sheets["QUOTATION"];
  const sheet1 = workbook.Sheets["Sheet1"];
  const sheet2 = workbook.Sheets["Sheet2"];

  // Import from Inventory first (detailed product catalog with makes/descriptions)
  if (inventorySheet) {
    const rows = XLSX.utils.sheet_to_json(inventorySheet, { header: 1, defval: null });
    const result = await importInventory(rows);
    console.log("Inventory import (detailed product catalog):", result);
  }

  // Then import from PRICE LIST (to update/add pricing for base items)
  if (priceSheet) {
    const rows = XLSX.utils.sheet_to_json(priceSheet, { header: 1, defval: null });
    const result = await importPriceList(rows);
    console.log("Price list import (base pricing):", result);
  }

  if (dataSheet) {
    const rows = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: null });
    const count = await importTechnicalData(rows, "DATA");
    console.log("Technical data rows imported:", count);
  }

  if (proposalSheet) {
    const rows = XLSX.utils.sheet_to_json(proposalSheet, { header: 1, defval: null });
    const status = await importRawSheetTemplate(rows, "QUOTATION", "Technical Proposal");
    console.log("Technical proposal template:", status);
    
    // Import BOQ items from columns U-AH
    const boqResult = await importBOQItems(rows);
    console.log("BOQ Items import (columns U-AH):", boqResult);
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
