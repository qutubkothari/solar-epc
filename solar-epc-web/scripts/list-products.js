const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listInverters() {
  const inverters = await prisma.item.findMany({
    where: { category: "Inverters" },
    select: { name: true, brand: true, unitPrice: true, uom: true, pricingUnit: true },
    orderBy: { name: "asc" },
  });

  console.log("\n=== INVERTERS (" + inverters.length + " models) ===\n");
  inverters.forEach((i) => {
    console.log(`${i.name}`);
    console.log(`  Brand: ${i.brand || "N/A"} | Price: ₹${i.unitPrice.toLocaleString()}/${i.uom || "unit"} | Pricing: ${i.pricingUnit || "N/A"}`);
  });

  const modules = await prisma.item.findMany({
    where: { category: "Solar Modules" },
    select: { name: true, brand: true, unitPrice: true, uom: true, pricingUnit: true },
    orderBy: { name: "asc" },
  });

  console.log("\n=== SOLAR MODULES (" + modules.length + " models) ===\n");
  modules.forEach((i) => {
    console.log(`${i.name}`);
    console.log(`  Brand: ${i.brand || "N/A"} | Price: ₹${i.unitPrice}/${i.uom || "unit"} | Pricing: ${i.pricingUnit || "N/A"}`);
  });
}

listInverters()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
