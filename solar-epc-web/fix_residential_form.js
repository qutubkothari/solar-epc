const fs = require('fs');
const path = 'src/components/residential-quotation-form.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove getBoqRowItems from solar-boq import
content = content.replace('  getBoqRowItems,\n', '');

// Add getResidentialBoqRowItems to residential-boq import
content = content.replace('resolveResidentialBoqItemHead } from "@/lib/residential-boq";', 'resolveResidentialBoqItemHead, getResidentialBoqRowItems } from "@/lib/residential-boq";');

// Replace getBoqRowItems with getResidentialBoqRowItems
content = content.replace(/getBoqRowItems\(/g, 'getResidentialBoqRowItems(');

fs.writeFileSync(path, content);
console.log('Fixed residential-quotation-form.tsx');
