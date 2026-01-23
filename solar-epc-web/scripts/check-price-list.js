const XLSX = require('xlsx');

const wb = XLSX.readFile('../EPC.xlsx');
const ws = wb.Sheets['PRICE LIST'];
const data = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log('PRICE LIST Structure (first 30 rows):');
console.log('=====================================\n');

data.slice(0, 30).forEach((row, i) => {
  const srNo = row[0] || '';
  const itemName = row[1] || '';
  const unit = row[3] || '';
  const rate = row[4] || '';
  const gst = row[5] || '';
  
  if (srNo || itemName) {
    console.log(`Row ${i+1}:`);
    console.log(`  A (Sr No): ${srNo}`);
    console.log(`  B (Item Name): ${itemName}`);
    console.log(`  D (Unit): ${unit}`);
    console.log(`  E (Rate): ${rate}`);
    console.log(`  F (GST): ${gst}`);
    console.log('');
  }
});
