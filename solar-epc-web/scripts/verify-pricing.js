const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyPricing() {
  console.log("\n=== SOLAR MODULE & INVERTER ITEMS (RS/WATT) ===");
  const wattItems = await prisma.item.findMany({
    where: { pricingUnit: "RS_PER_WATT" },
    select: {
      srNo: true,
      name: true,
      unitPrice: true,
      taxPercent: true,
      pricingUnit: true,
      uom: true,
      category: true,
    },
    orderBy: { srNo: "asc" },
    take: 10,
  });

  wattItems.forEach((item) => {
    const gst = (item.taxPercent * 100).toFixed(0);
    const total = item.unitPrice * (1 + item.taxPercent);
    console.log(
      `${item.srNo}. ${item.name} - ₹${item.unitPrice}/Watt + ${gst}% GST = ₹${total.toFixed(2)}/Watt [${item.category}]`
    );
  });

  console.log("\n=== MOUNTING STRUCTURE ITEMS (RS/KW) ===");
  const kwItems = await prisma.item.findMany({
    where: { pricingUnit: "RS_PER_KW" },
    select: {
      srNo: true,
      name: true,
      unitPrice: true,
      taxPercent: true,
      pricingUnit: true,
      uom: true,
      category: true,
    },
    orderBy: { srNo: "asc" },
    take: 10,
  });

  kwItems.forEach((item) => {
    const gst = (item.taxPercent * 100).toFixed(0);
    const total = item.unitPrice * (1 + item.taxPercent);
    console.log(
      `${item.srNo}. ${item.name} - ₹${item.unitPrice}/kW + ${gst}% GST = ₹${total.toFixed(2)}/kW [${item.category}]`
    );
  });

  console.log("\n=== FLAT PRICING ITEMS (PER_UNIT) ===");
  const unitItems = await prisma.item.findMany({
    where: { pricingUnit: "PER_UNIT" },
    select: {
      srNo: true,
      name: true,
      unitPrice: true,
      taxPercent: true,
      pricingUnit: true,
      uom: true,
      category: true,
    },
    orderBy: { srNo: "asc" },
    take: 10,
  });

  unitItems.forEach((item) => {
    const gst = (item.taxPercent * 100).toFixed(0);
    const total = item.unitPrice * (1 + item.taxPercent);
    console.log(
      `${item.srNo}. ${item.name} - ₹${item.unitPrice}/${item.uom || "unit"} + ${gst}% GST = ₹${total.toFixed(2)} [${item.category}]`
    );
  });

  console.log("\n=== PRICING SUMMARY ===");
  const summary = await prisma.item.groupBy({
    by: ["pricingUnit"],
    _count: true,
  });

  summary.forEach((s) => {
    console.log(`${s.pricingUnit}: ${s._count} items`);
  });
}

verifyPricing()
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
