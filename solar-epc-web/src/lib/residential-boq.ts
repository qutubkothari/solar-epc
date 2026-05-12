import { SolarBoqRowConfig, SolarBoqItem, normalizeBoqText } from "./solar-boq";

export const RESIDENTIAL_BOQ_SEQUENCE: SolarBoqRowConfig[] = [
  { sequence: 1, itemHead: "MODULE", categoryAliases: ["SOLAR MODULE", "Solar Modules", "MODULE"], includeTerms: ["module", "topcon", "bifacial", "mono"], mandatory: true, selectionMode: "multiple" },
  { sequence: 2, itemHead: "INVERTER", categoryAliases: ["SOLAR INVERTER", "INVERTER", "Inverters"], includeTerms: ["inverter"], mandatory: true, selectionMode: "multiple" },
  { sequence: 3, itemHead: "STRUCTURE", categoryAliases: ["SOLAR STRUCTURE", "MODULE MOUNTING STRUCTURE", "STRUCTURE"], includeTerms: ["structure", "pipe", "hdgi"], mandatory: true, selectionMode: "multiple" },
  { sequence: 4, itemHead: "ACDB", categoryAliases: ["ACDB", "ELECTRICAL PROTECTION PANELS"], includeTerms: ["acdb"], mandatory: true, selectionMode: "single" },
  { sequence: 5, itemHead: "DCDB", categoryAliases: ["DCDB", "ELECTRICAL PROTECTION PANELS"], includeTerms: ["dcdb"], mandatory: true, selectionMode: "single" },
  { sequence: 6, itemHead: "CABLING", categoryAliases: ["CABLING", "Cables", "AC CABLE", "DC CABLE"], includeTerms: ["cable", "sqmm", "wire"], mandatory: true, selectionMode: "multiple" },
  { sequence: 7, itemHead: "EARTHING KIT", categoryAliases: ["EARTHING KIT", "Earthing", "EARTHING SOLUTION"], includeTerms: ["earthing kit", "earthing"], mandatory: true, selectionMode: "multiple" },
  { sequence: 8, itemHead: "CIVIL WORK", categoryAliases: ["CIVIL WORK"], includeTerms: ["civil"], mandatory: false, selectionMode: "single" },
  { sequence: 9, itemHead: "TRANSPORT", categoryAliases: ["TRANSPORT", "CHARGES"], includeTerms: ["transport"], mandatory: false, selectionMode: "single" },
  { sequence: 10, itemHead: "METER FEES", categoryAliases: ["METER FEES"], includeTerms: ["meter fee"], mandatory: false, selectionMode: "single" },
  { sequence: 11, itemHead: "ELECTRIFICATION", categoryAliases: ["ELECTRIFICATION"], includeTerms: ["electrification"], mandatory: false, selectionMode: "single" },
  { sequence: 12, itemHead: "FABRICATION", categoryAliases: ["FABRICATION"], includeTerms: ["fabrication"], mandatory: false, selectionMode: "single" },
  { sequence: 13, itemHead: "OTHER MISC.", categoryAliases: ["OTHER MISC.", "MISCELLANEOUS"], includeTerms: ["misc"], mandatory: false, selectionMode: "single" },
  { sequence: 14, itemHead: "COMISSIONING CHARGES", categoryAliases: ["COMISSIONING CHARGES", "CHARGES"], includeTerms: ["commissioning"], mandatory: false, selectionMode: "single" },
];

const EXACT_HEAD_BY_NORMALIZED = Object.fromEntries(
  RESIDENTIAL_BOQ_SEQUENCE.map((row) => [normalizeBoqText(row.itemHead), row.itemHead])
) as Record<string, string>;

export const resolveResidentialBoqItemHead = (item: SolarBoqItem) => {
  const category = normalizeBoqText(item.category);
  if (EXACT_HEAD_BY_NORMALIZED[category]) {
    return EXACT_HEAD_BY_NORMALIZED[category];
  }
  
  const haystack = [category, normalizeBoqText(item.name), normalizeBoqText(item.description)].join(" ");
  
  if (haystack.includes("module") && !haystack.includes("mounting")) return "MODULE";
  if (haystack.includes("inverter")) return "INVERTER";
  if (haystack.includes("structure") || haystack.includes("pipe") || haystack.includes("base plate") || haystack.includes("boult")) return "STRUCTURE";
  if (haystack.includes("acdb")) return "ACDB";
  if (haystack.includes("dcdb")) return "DCDB";
  if (haystack.includes("cable") || haystack.includes("sqmm")) return "CABLING";
  if (haystack.includes("earthing")) return "EARTHING KIT";
  if (haystack.includes("civil")) return "CIVIL WORK";
  if (haystack.includes("transport")) return "TRANSPORT";
  if (haystack.includes("meter")) return "METER FEES";
  if (haystack.includes("electrification")) return "ELECTRIFICATION";
  if (haystack.includes("fabrication")) return "FABRICATION";
  if (haystack.includes("commissioning") || haystack.includes("comissioning")) return "COMISSIONING CHARGES";
  
  return "OTHER MISC.";
};

export const getResidentialBoqRowItems = (items: SolarBoqItem[], row: SolarBoqRowConfig) => {
  return items.filter((item) => resolveResidentialBoqItemHead(item) === row.itemHead);
};
