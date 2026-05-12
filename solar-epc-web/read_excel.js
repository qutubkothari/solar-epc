const xlsx = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "../Sample Residential Quotation.xlsx");
const workbook = xlsx.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  console.log("--- Sheet:", sheetName, "---");
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  // only print rows that have data
  let rowsPrinted = 0;
  data.forEach((row, i) => {
    if (row.length > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== "")) {
      console.log(`Row ${i+1}:`, row);
      rowsPrinted++;
    }
  });
  if (rowsPrinted === 0) {
    console.log("Empty sheet or no readable text.");
  }
  console.log("\n");
});
