const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearItems() {
  console.log("\n=== CLEARING ALL ITEMS ===\n");
  
  const count = await prisma.item.count();
  console.log(`Current items in database: ${count}`);
  
  console.log("Deleting all items...");
  await prisma.item.deleteMany({});
  
  const afterCount = await prisma.item.count();
  console.log(`Items remaining: ${afterCount}`);
  console.log("\n✅ All items deleted!");
}

clearItems()
  .catch((error) => {
    console.error("Clear failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
