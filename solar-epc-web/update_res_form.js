const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/residential-quotation-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Imports
content = content.replace(
  'SOLAR_BOQ_SEQUENCE,',
  ''
).replace(
  '} from "@/lib/solar-boq";',
  '} from "@/lib/solar-boq";\nimport { RESIDENTIAL_BOQ_SEQUENCE, resolveResidentialBoqItemHead } from "@/lib/residential-boq";'
);

// 2. Replace SOLAR_BOQ_SEQUENCE with RESIDENTIAL_BOQ_SEQUENCE
content = content.replace(/SOLAR_BOQ_SEQUENCE/g, 'RESIDENTIAL_BOQ_SEQUENCE');

// 3. Add Meter Phase, DISCOM, and Plant Type inputs
const solarSysConfigStart = content.indexOf('<div className="grid gap-4 md:grid-cols-4">');
if (solarSysConfigStart !== -1) {
  const newInputs = `
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Meter Phase</label>
          <select
            value={documentData.meterPhase}
            onChange={(e) => setDocumentField("meterPhase", e.target.value)}
            className={userInputClassName}
          >
            <option value="Single Phase">Single Phase</option>
            <option value="Three Phase">Three Phase</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">DISCOM</label>
          <select
            value={documentData.discom}
            onChange={(e) => setDocumentField("discom", e.target.value)}
            className={userInputClassName}
          >
            <option value="MGVCL">MGVCL</option>
            <option value="UGVCL">UGVCL</option>
            <option value="PGVCL">PGVCL</option>
            <option value="DGVCL">DGVCL</option>
            <option value="TORRENT">TORRENT</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Plant Type</label>
          <select
            value={documentData.plantType}
            onChange={(e) => setDocumentField("plantType", e.target.value)}
            className={userInputClassName}
          >
            <option value="ON GRID">ON GRID</option>
            <option value="OFF GRID">OFF GRID</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </div>
`;
  content = content.replace(
    '<div className="grid gap-4 md:grid-cols-4">',
    '<div className="grid gap-4 md:grid-cols-4 mb-4">' + newInputs + '      </div>\n      <div className="grid gap-4 md:grid-cols-4">'
  );
}

// 4. Update the item category resolution if it uses resolveBoqItemHead
content = content.replace(/resolveBoqItemHead/g, 'resolveResidentialBoqItemHead');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated residential-quotation-form.tsx");
