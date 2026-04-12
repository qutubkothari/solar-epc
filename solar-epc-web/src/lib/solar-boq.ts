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

export type SolarBoqDisplayParts = {
  itemType: string;
  ratingOrCapacity: string;
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

const EXACT_HEAD_BY_NORMALIZED = Object.fromEntries(
  SOLAR_BOQ_SEQUENCE.map((row) => [normalize(row.itemHead), row.itemHead])
) as Record<string, string>;

const DIRECT_CATEGORY_HEAD_MAP: Record<string, string> = {
  "solar module": "SOLAR MODULE",
  "solar modules": "SOLAR MODULE",
  "solar inverter": "SOLAR INVERTER",
  inverters: "SOLAR INVERTER",
  "solar structure": "SOLAR STRUCTURE",
  "module mounting structure": "SOLAR STRUCTURE",
  "mounting structure": "SOLAR STRUCTURE",
  "solar structure accessories": "SOLAR STRUCTURE Accessories",
  "electrical protection panels": "ELECTRICAL PROTECTION Panels",
  acdb: "ELECTRICAL PROTECTION Panels",
  dcdb: "ELECTRICAL PROTECTION Panels",
  "ac cable": "AC CABLE",
  "ac cable 2": "AC CABLE",
  "dc cable": "DC CABLE",
  "electrical installations": "ELECTRICAL INSTALLATIONS",
  conduits: "ELECTRICAL INSTALLATIONS",
  conduite: "ELECTRICAL INSTALLATIONS",
  "cable tray": "ELECTRICAL INSTALLATIONS",
  "pv installations": "PV INSTALLATIONS",
  connectors: "PV INSTALLATIONS",
  "mc4 connector": "PV INSTALLATIONS",
  "civil work": "CIVIL WORK",
  "civil works": "CIVIL WORK",
  charges: "CHARGES",
  miscellaneous: "MISCELLANEOUS",
};

const includesAny = (haystack: string, terms: string[]) => terms.some((term) => haystack.includes(term));

export const resolveBoqItemHead = (item: SolarBoqItem) => {
  const category = normalize(item.category);
  const name = normalize(item.name);
  const description = normalize(item.description);
  const haystack = [category, name, description, normalize(item.brand)].join(" ");

  if (EXACT_HEAD_BY_NORMALIZED[category]) {
    return EXACT_HEAD_BY_NORMALIZED[category];
  }

  if (category === "walkway" || category === "walk way") {
    return includesAny(haystack, ["c clamp", "m clamp", "fitting"]) ? "WALKWAY FITTINGS" : "WALKWAY";
  }

  if (category === "earthing") {
    if (includesAny(haystack, ["module to module", "ring lug", "4 sqmm"])) {
      return "MODULE TO MODULE EARTHING CU.CABLE";
    }
    if (includesAny(haystack, ["chemical bag", "pit cover", "clamp", "lug"])) {
      return "EARTHING ACCESSORIES";
    }
    if (includesAny(haystack, ["electrode", "earth road", "earth rod", "pipe in pipe", "pipe in strip", "solid electrode", "boaring"])) {
      return "EARTHING SOLUTION";
    }
    if (includesAny(haystack, ["cable", "strip", "wire", "flex cable"])) {
      return "EARTHING CONNECTIVITY";
    }
  }

  if (category === "cables") {
    if (includesAny(haystack, ["module to module", "ring lug", "4 sqmm"])) {
      return "MODULE TO MODULE EARTHING CU.CABLE";
    }
    if (includesAny(haystack, ["dc cable", "dc 1c", "pv cable"])) {
      return "DC CABLE";
    }
    if (includesAny(haystack, ["ac cable", "ac 2 core", "ac 4 core", "ac 3 5 core", "aluminium armoured cable", "copper cable"])) {
      return "AC CABLE";
    }
    if (includesAny(haystack, ["earthing", "earth strip", "earth cable"])) {
      return "EARTHING CONNECTIVITY";
    }
  }

  if (category === "lightning arrestor") {
    return "ELECTRICAL PROTECTION ITEMS";
  }

  if (category === "la cable strip") {
    return "LIGHTNING ARRESTOR ACCESSORIES";
  }

  if (category === "isolation") {
    return "ELECTRICAL PROTECTION ITEMS";
  }

  if (category === "boq item") {
    if (includesAny(haystack, ["structure", "mono rail", "hdgi", "rail"])) {
      return "SOLAR STRUCTURE";
    }
    if (includesAny(haystack, ["charge", "commissioning", "transport", "ifp"])) {
      return "CHARGES";
    }
  }

  if (category === "other") {
    if (includesAny(haystack, ["ancore", "anchor", "base plate", "j boult", "j hook", "wedge"])) {
      return "SOLAR STRUCTURE Accessories";
    }
    if (includesAny(haystack, ["charge", "commissioning", "transport", "ifp", "fire", "safety"])) {
      return "CHARGES";
    }
    if (includesAny(haystack, ["isolator", "isolation", "lightning arrestor"])) {
      return "ELECTRICAL PROTECTION ITEMS";
    }
    if (includesAny(haystack, ["pvc pipe", "conduit"])) {
      return "ELECTRICAL INSTALLATIONS";
    }
    if (includesAny(haystack, ["miss"])) {
      return "MISCELLANEOUS";
    }
  }

  if (DIRECT_CATEGORY_HEAD_MAP[category]) {
    return DIRECT_CATEGORY_HEAD_MAP[category];
  }

  if (includesAny(haystack, ["mc4 connector", "mc4 connectors"])) {
    return "PV INSTALLATIONS";
  }

  return null;
};

const cleanName = (value?: string | null) => (value || "").replace(/\s+/g, " ").trim();

const normalizeRatingPart = (value: string) =>
  value
    .replace(/^rating\s*\/\s*capacity\s*:\s*/i, "")
    .replace(/^capacity\s*[:-]\s*/i, "")
    .replace(/^inv\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

const extractDescriptionRating = (description?: string | null) => {
  const safeDescription = cleanName(description);
  if (!safeDescription) {
    return "";
  }

  const match = safeDescription.match(/rating\s*\/\s*capacity\s*:\s*([^|]+)/i);
  return match ? normalizeRatingPart(match[1]) : "";
};

const extractTrailingSpec = (name: string) => {
  const parts = name.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return "";
  }

  const trailing = parts[parts.length - 1];
  return /\d/.test(trailing) ? normalizeRatingPart(trailing) : "";
};

const extractFallbackRating = (item: Pick<SolarBoqItem, "name" | "description">) => {
  const text = `${cleanName(item.name)} ${cleanName(item.description)}`;
  const patterns = [
    /(\d+(?:\.\d+)?)\s*TO\s*(\d+(?:\.\d+)?)(?:\s*(?:WP|W|KW|KVA|MM))?\b/i,
    /(\d+(?:\.\d+)?)\s*WP\b/i,
    /(\d+(?:\.\d+)?)\s*KW\b/i,
    /(\d+(?:\.\d+)?)\s*KVA\b/i,
    /(\d+(?:\.\d+)?)\s*VOLT\b/i,
    /(\d+(?:\.\d+)?\s*[XC]\s*\d+(?:\.\d+)?\s*SQMM)\b/i,
    /(\d+(?:\.\d+)?\s*MM\s*X\s*\d+(?:\.\d+)?\s*MTR)\b/i,
    /(\d+(?:\.\d+)?\s*MM)\b/i,
    /(?:^|\s|-)(\d{3,4})(?:\s|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeRatingPart(match[0]);
    }
  }

  return "";
};

const extractRatingOrCapacity = (item: Pick<SolarBoqItem, "name" | "description">) => {
  const parts = [
    extractTrailingSpec(cleanName(item.name)),
    extractDescriptionRating(item.description),
    extractFallbackRating(item),
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(" | ");
};

const stripRatingFromItemType = (value: string, ratingOrCapacity: string) => {
  if (!ratingOrCapacity) {
    return value.trim();
  }

  let next = value;
  for (const ratingPart of ratingOrCapacity.split("|").map((part) => part.trim()).filter(Boolean)) {
    const escapedRating = ratingPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    next = next
      .replace(new RegExp(`(?:-|–|—|/)?\\s*${escapedRating}\\s*$`, "i"), "")
      .replace(new RegExp(`(?:-|–|—|/)\\s*${escapedRating}(?:\\s*(?:-|–|—|/))?`, "i"), " ");
  }

  return next
    .replace(/\bINV\b\s*$/i, "")
    .replace(/\bINV\b\s*[-/|]?\s*/gi, " ")
    .replace(/\s*[-/|]+\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const getBoqDisplayParts = (item: SolarBoqItem): SolarBoqDisplayParts => {
  const resolvedHead = resolveBoqItemHead(item);
  const rawName = cleanName(item.name);
  const ratingOrCapacity = extractRatingOrCapacity(item);

  if (resolvedHead === "SOLAR MODULE") {
    return {
      itemType: stripRatingFromItemType(rawName.replace(/^\d+(?:\.\d+)?\s*WP\s*/i, "").trim(), ratingOrCapacity) || rawName,
      ratingOrCapacity,
    };
  }

  if (resolvedHead === "SOLAR INVERTER") {
    const normalizedName = stripRatingFromItemType(rawName.replace(/^INV\s*-\s*/i, "").trim(), ratingOrCapacity);
    return {
      itemType: normalizedName || rawName,
      ratingOrCapacity,
    };
  }

  return {
    itemType: stripRatingFromItemType(rawName, ratingOrCapacity) || rawName,
    ratingOrCapacity,
  };
};

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
  return items.filter((item) => resolveBoqItemHead(item) === row.itemHead);
};