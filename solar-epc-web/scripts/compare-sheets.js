const XLSX = require('xlsx');

const wb = XLSX.readFile('../EPC.xlsx');
const ws = wb.Sheets['Inventry'];
const data = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log('INVENTORY Sheet Structure (first 40 rows):');
console.log('==========================================\n');

data.slice(0, 40).forEach((row, i) => {
  const srNo = row[0] || '';
  const itemName = row[1] || '';
  const make = row[2] || '';
  const desc = row[3] || '';
  const unit = row[4] || '';
  const rate = row[5] || '';
  
  if (srNo || itemName) {
    console.log(`Row ${i+1}:`);
    console.log(`  A (Sr No): ${srNo}`);
    console.log(`  B (Item Name): ${itemName}`);
    console.log(`  C (Make): ${make}`);
    console.log(`  D (Description): ${typeof desc === 'string' ? desc.substring(0, 80) : desc}`);
    console.log(`  E (Unit): ${unit}`);
    console.log(`  F (Rate): ${rate}`);
    console.log('');
  }
});

console.log('\n=== COMPARING PRICE LIST vs INVENTORY ===\n');

const priceListWs = wb.Sheets['PRICE LIST'];
const priceListData = XLSX.utils.sheet_to_json(priceListWs, {header: 1});

console.log('PRICE LIST items:', priceListData.length - 1, 'rows');
console.log('INVENTORY items:', data.length - 1, 'rows');

// Get item names from both
const priceListItems = priceListData.slice(1)
  .filter(row => row[1])
  .map(row => String(row[1]).trim().toLowerCase());

const inventoryItems = data.slice(1)
  .filter(row => row[1])
  .map(row => String(row[1]).trim().toLowerCase());

console.log('\nUnique PRICE LIST items:', new Set(priceListItems).size);
console.log('Unique INVENTORY items:', new Set(inventoryItems).size);

// Find items in Inventory but not in Price List
const inInventoryNotInPrice = [];
data.slice(1, 50).forEach(row => {
  const itemName = row[1];
  if (!itemName) return;
  const itemLower = String(itemName).trim().toLowerCase();
  if (!priceListItems.some(p => itemLower.includes(p) || p.includes(itemLower))) {
    if (itemName.length > 2 && !/^\d+\.?\d*$/.test(String(itemName).trim())) {
      inInventoryNotInPrice.push({
        name: itemName,
        make: row[2] || '',
        unit: row[4] || '',
        rate: row[5] || ''
      });
    }
  }
});

if (inInventoryNotInPrice.length > 0) {
  console.log('\n=== Items in INVENTORY not in PRICE LIST (first 20) ===\n');
  inInventoryNotInPrice.slice(0, 20).forEach((item, i) => {
    console.log(`${i+1}. ${item.name}`);
    console.log(`   Make: ${item.make} | Unit: ${item.unit} | Rate: ₹${item.rate}`);
  });
}
