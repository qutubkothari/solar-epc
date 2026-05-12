const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/residential-quotation-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetToReplace = `      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module Wattage (W)</label>
          <input
            type="number"
            min="0"
            value={documentData.moduleWattage > 0 ? documentData.moduleWattage : ""}
            onChange={(event) =>
              setDocumentField("moduleWattage", Number(event.target.value || 0))
            }
            className={userInputClassName}
          />
        </div>`;

const replacement = `      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module Make</label>
          <select
            value={documentData.moduleMake || "Adani"}
            onChange={(e) => setDocumentField("moduleMake", e.target.value)}
            className={userInputClassName}
          >
            <option value="Adani">Adani</option>
            <option value="Pahal">Pahal</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module Type</label>
          <select
            value={documentData.moduleType || "Bi-facial"}
            onChange={(e) => setDocumentField("moduleType", e.target.value)}
            className={userInputClassName}
          >
            <option value="Bi-facial">Bi-facial</option>
            <option value="Topcon">Topcon</option>
            <option value="Mono Bi-Facial">Mono Bi-Facial</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module Wattage (Wp)</label>
          <select
            value={documentData.moduleWattage || 550}
            onChange={(e) => setDocumentField("moduleWattage", Number(e.target.value))}
            className={userInputClassName}
          >
            <option value={530}>530 Wp</option>
            <option value={535}>535 Wp</option>
            <option value={540}>540 Wp</option>
            <option value={545}>545 Wp</option>
            <option value={550}>550 Wp</option>
            <option value={565}>565 Wp</option>
            <option value={570}>570 Wp</option>
            <option value={575}>575 Wp</option>
            <option value={600}>600 Wp</option>
            <option value={620}>620 Wp</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">`;

content = content.replace(targetToReplace, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated form fields.");
