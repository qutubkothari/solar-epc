const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkItems() {
  console.log("\n=== CHECKING ITEMS DATABASE ===\n");
  
  const items = await prisma.item.findMany({
    take: 20,
    orderBy: { srNo: "asc" },
  });

  console.log(`Total items found: ${items.length}\n`);
  
  items.forEach((item) => {
    console.log(`${item.srNo || 'NULL'}. ${item.name}`);
    console.log(`   Price: ₹${item.unitPrice} | Unit: ${item.uom || 'N/A'} | Category: ${item.category || 'N/A'}`);
    console.log(`   Pricing: ${item.pricingUnit || 'N/A'} | Brand: ${item.brand || 'N/A'}`);
    console.log("");
  });

  const count = await prisma.item.count();
  console.log(`\nTotal items in database: ${count}`);
}

checkItems()
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
