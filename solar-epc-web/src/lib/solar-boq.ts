export type SolarBoqItem = {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  unitPrice: number;
  taxPercent: number;
  marginPercent: number;
  uom?: string | null;
  category?: string | null;
  pricingUnit?: string | null;
};

export type SolarBoqRowConfig = {
  sequence: number;
  itemHead: string;
  categoryAliases: string[];
  includeTerms?: string[];
  excludeTerms?: string[];
};

export type SolarBoqContext = {
  actualSystemWatts: number;
  actualSystemKw: number;
  numberOfModules: number;
};

export const SOLAR_BOQ_SEQUENCE: SolarBoqRowConfig[] = [
  {
    sequence: 1,
    itemHead: "SOLAR MODULE",
    categoryAliases: ["SOLAR MODULE", "Solar Modules"],
    includeTerms: ["module", "topcon", "bifacial", "mono facial", "mono"],
  },
  {
    sequence: 2,
    itemHead: "SOLAR INVERTER",
    categoryAliases: ["SOLAR INVERTER", "INVERTER", "Inverters"],
    includeTerms: ["inverter", "inv -", "hybrid", "on grid"],
  },
  {
    sequence: 3,
    itemHead: "SOLAR STRUCTURE",
    categoryAliases: ["SOLAR STRUCTURE", "MODULE MOUNTING STRUCTURE", "Mounting Structure"],
    includeTerms: ["structure", "rail", "mounting"],
  },
  {
    sequence: 4,
    itemHead: "SOLAR STRUCTURE Accessories",
    categoryAliases: ["SOLAR STRUCTURE ACCESSORIES", "FASTENERS", "ANCORE FASTNER", "BASE PLATE", "J BOULT"],
    includeTerms: ["fastener", "fastner", "anchor", "base plate", "j bolt", "clamp"],
  },
  {
    sequence: 5,
    itemHead: "ELECTRICAL PROTECTION Panels",
    categoryAliases: ["ELECTRICAL PROTECTION PANELS", "ACDB", "DCDB"],
    includeTerms: ["acdb", "dcdb", "panel"],
  },
  {
    sequence: 6,
    itemHead: "AC CABLE",
    categoryAliases: ["AC CABLE", "AC CABLE- 2", "Cables"],
    includeTerms: ["ac", "cable"],
    excludeTerms: ["dc cable"],
  },
  {
    sequence: 7,
    itemHead: "DC CABLE",
    categoryAliases: ["DC CABLE", "Cables"],
    includeTerms: ["dc cable", "dc wire", "pv cable"],
    excludeTerms: ["ac cable", "ac wire"],
  },
  {
    sequence: 8,
    itemHead: "ELECTRICAL PROTECTION ITEMS",
    categoryAliases: ["ELECTRICAL PROTECTION ITEMS", "ISOLATION"],
    includeTerms: ["isolat", "mccb", "breaker", "protection"],
  },
  {
    sequence: 9,
    itemHead: "LIGHTNING ARRESTOR ACCESSORIES",
    categoryAliases: ["LIGHTNING ARRESTOR ACCESSORIES", "LIGHTNING ARRESTOR", "LA CABLE / STRIP", "Lightning Arrestor"],
    includeTerms: ["lightning", "arrestor", "la cable"],
  },
  {
    sequence: 10,
    itemHead: "EARTHING SOLUTION",
    categoryAliases: ["EARTHING SOLUTION", "EARTHING ROAD", "Earthing"],
    includeTerms: ["earthing", "earth pit", "earthing road", "chemical"],
  },
  {
    sequence: 11,
    itemHead: "EARTHING CONNECTIVITY",
    categoryAliases: ["EARTHING CONNECTIVITY", "EARTHING CABLE / STRIP", "Earthing"],
    includeTerms: ["connectivity", "strip", "earthing cable", "gi strip", "cu strip"],
  },
  {
    sequence: 12,
    itemHead: "EARTHING ACCESSORIES",
    categoryAliases: ["EARTHING ACCESSORIES", "Earthing"],
    includeTerms: ["accessories", "clamp", "lug", "electrode", "earth pit"],
  },
  {
    sequence: 13,
    itemHead: "MODULE TO MODULE EARTHING CU.CABLE",
    categoryAliases: ["MODULE TO MODULE EARTHING CU.CABLE", "Cables"],
    includeTerms: ["earthing wire", "cu cable", "copper cable"],
    excludeTerms: ["ac cable", "dc cable"],
  },
  {
    sequence: 14,
    itemHead: "ELECTRICAL INSTALLATIONS",
    categoryAliases: ["ELECTRICAL INSTALLATIONS", "CONDUITE", "CABLE TRAY", "Conduits"],
    includeTerms: ["conduit", "cable tray", "installation"],
  },
  {
    sequence: 15,
    itemHead: "WALKWAY",
    categoryAliases: ["WALKWAY", "WALK WAY", "Walkway"],
    includeTerms: ["walkway"],
  },
  {
    sequence: 16,
    itemHead: "WALKWAY FITTINGS",
    categoryAliases: ["WALKWAY FITTINGS", "Walkway"],
    includeTerms: ["walkway fitting", "walkway", "clamp"],
  },
  {
    sequence: 17,
    itemHead: "PV INSTALLATIONS",
    categoryAliases: ["PV INSTALLATIONS", "Other"],
    includeTerms: ["pv installation", "installation"],
  },
  {
    sequence: 18,
    itemHead: "CIVIL WORK",
    categoryAliases: ["CIVIL WORK", "Civil Works"],
    includeTerms: ["foundation", "civil", "cable laying"],
  },
  {
    sequence: 19,
    itemHead: "MISCELLANEOUS",
    categoryAliases: ["MISCELLANEOUS", "Other"],
    includeTerms: ["misc"],
  },
  {
    sequence: 20,
    itemHead: "CHARGES",
    categoryAliases: ["CHARGES", "BOQ Item"],
    includeTerms: ["charge", "transport", "commissioning", "safety", "ifp"],
  },
];

const normalize = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const inferSelectionUnit = (item: SolarBoqItem) => {
  if (item.pricingUnit === "RS_PER_WATT") {
    return "WP";
  }

  if (item.pricingUnit === "RS_PER_KW") {
    return "KW";
  }

  const rawUom = (item.uom || "").trim().toUpperCase();
  if (!rawUom) {
    return "NOS";
  }

  if (rawUom.startsWith("RS/")) {
    return "NOS";
  }

  return rawUom.replace(/\s+/g, " ");
};

export const isPercentageItem = (item: SolarBoqItem) => (item.uom || "").trim() === "%";

export const extractWattageFromItem = (item?: Pick<SolarBoqItem, "name" | "description"> | null) => {
  const text = `${item?.name || ""} ${item?.description || ""}`;
  const match = text.match(/(\d{3,4})\s*(?:W|WP)\b/i);
  return match ? Number(match[1]) : null;
};

export const getDefaultQuantity = (
  row: SolarBoqRowConfig,
  item: SolarBoqItem,
  context: SolarBoqContext
) => {
  if (isPercentageItem(item)) {
    return 1;
  }

  if (row.itemHead === "SOLAR MODULE" || item.pricingUnit === "RS_PER_WATT") {
    return context.actualSystemWatts;
  }

  if (item.pricingUnit === "RS_PER_KW") {
    return context.actualSystemKw;
  }

  if (row.itemHead === "SOLAR STRUCTURE" && inferSelectionUnit(item) === "KG") {
    return Number((context.actualSystemKw * 45).toFixed(2));
  }

  if (row.itemHead === "SOLAR INVERTER") {
    return 1;
  }

  return 1;
};

export const getBoqRowItems = (items: SolarBoqItem[], row: SolarBoqRowConfig) => {
  const aliases = row.categoryAliases.map(normalize);
  const includes = (row.includeTerms || []).map(normalize);
  const excludes = (row.excludeTerms || []).map(normalize);

  return items.filter((item) => {
    const category = normalize(item.category);
    const haystack = [item.name, item.description, item.category, item.brand].map(normalize).join(" ");
    const aliasMatch = aliases.includes(category);
    const includeMatch = includes.length === 0 || includes.some((term) => haystack.includes(term));
    const excludeMatch = excludes.some((term) => haystack.includes(term));
    return (aliasMatch || includeMatch) && !excludeMatch;
  });
};