export type RoiProjectionInputs = {
  totalKw: number;
  installationCost: number;
  averageDailyGenerationUnitsPerKw: number;
  yearlyShutdownDays: number;
  electricityTariffYear1: number;
  tariffEscalationPercent: number;
  annualPowerDegradationAfterYear1Percent: number;
  annualPowerDegradationFromYear3OnwardPercent: number;
  operationMaintenancePercentYear1: number;
  operationMaintenanceEscalationPercent: number;
  projectionYears: number;
};

export type RoiProjectionRow = {
  year: number;
  generationKwh: number;
  tariffPerKwh: number;
  annualRevenue: number;
  operationMaintenanceCost: number;
  netSavings: number;
  cumulativeSavings: number;
  paybackAchieved: boolean;
};

export type RoiProjectionResult = {
  rows: RoiProjectionRow[];
  year1GenerationKwh: number;
  year1GrossSavings: number;
  year1OperationMaintenanceCost: number;
  year1NetSavings: number;
  lifetimeNetSavings: number;
  estimatedPaybackYears: number | null;
  paybackYear: number | null;
};

const percentToFraction = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value > 1 ? value / 100 : value;
};

export const buildRoiProjection = (inputs: RoiProjectionInputs): RoiProjectionResult => {
  const projectionYears = Math.max(Math.round(Number(inputs.projectionYears || 0)), 1);
  const totalKw = Math.max(Number(inputs.totalKw || 0), 0);
  const installationCost = Math.max(Number(inputs.installationCost || 0), 0);
  const availableDays = Math.max(365 - Number(inputs.yearlyShutdownDays || 0), 0);
  const averageDailyGenerationUnitsPerKw = Math.max(Number(inputs.averageDailyGenerationUnitsPerKw || 0), 0);
  const electricityTariffYear1 = Math.max(Number(inputs.electricityTariffYear1 || 0), 0);
  const tariffEscalation = percentToFraction(Number(inputs.tariffEscalationPercent || 0));
  const degradationAfterYear1 = percentToFraction(Number(inputs.annualPowerDegradationAfterYear1Percent || 0));
  const degradationFromYear3Onward = percentToFraction(Number(inputs.annualPowerDegradationFromYear3OnwardPercent || 0));
  const operationMaintenancePercentYear1 = percentToFraction(Number(inputs.operationMaintenancePercentYear1 || 0));
  const operationMaintenanceEscalation = percentToFraction(Number(inputs.operationMaintenanceEscalationPercent || 0));

  const rows: RoiProjectionRow[] = [];
  const year1GenerationKwh = totalKw * averageDailyGenerationUnitsPerKw * availableDays;
  const year1OperationMaintenanceCost = installationCost * operationMaintenancePercentYear1;
  let previousGenerationKwh = year1GenerationKwh;
  let previousTariffPerKwh = electricityTariffYear1;
  let previousOperationMaintenanceCost = year1OperationMaintenanceCost;
  let cumulativeSavings = 0;
  let estimatedPaybackYears: number | null = null;
  let paybackYear: number | null = null;

  for (let year = 1; year <= projectionYears; year += 1) {
    const generationKwh =
      year === 1
        ? year1GenerationKwh
        : previousGenerationKwh * (1 - (year === 2 ? degradationAfterYear1 : degradationFromYear3Onward));
    const tariffPerKwh = year === 1 ? electricityTariffYear1 : previousTariffPerKwh * (1 + tariffEscalation);
    const operationMaintenanceCost =
      year === 1 ? year1OperationMaintenanceCost : previousOperationMaintenanceCost * (1 + operationMaintenanceEscalation);
    const annualRevenue = generationKwh * tariffPerKwh;
    const netSavings = annualRevenue - operationMaintenanceCost;
    const previousCumulativeSavings = cumulativeSavings;
    cumulativeSavings += netSavings;
    const paybackAchieved = cumulativeSavings >= installationCost;

    if (
      estimatedPaybackYears === null &&
      netSavings > 0 &&
      previousCumulativeSavings < installationCost &&
      cumulativeSavings >= installationCost
    ) {
      estimatedPaybackYears = year - 1 + (installationCost - previousCumulativeSavings) / netSavings;
      paybackYear = year;
    }

    rows.push({
      year,
      generationKwh,
      tariffPerKwh,
      annualRevenue,
      operationMaintenanceCost,
      netSavings,
      cumulativeSavings,
      paybackAchieved,
    });

    previousGenerationKwh = generationKwh;
    previousTariffPerKwh = tariffPerKwh;
    previousOperationMaintenanceCost = operationMaintenanceCost;
  }

  const year1GrossSavings = rows[0]?.annualRevenue ?? 0;
  const year1NetSavings = rows[0]?.netSavings ?? 0;

  return {
    rows,
    year1GenerationKwh,
    year1GrossSavings,
    year1OperationMaintenanceCost,
    year1NetSavings,
    lifetimeNetSavings: cumulativeSavings,
    estimatedPaybackYears,
    paybackYear,
  };
};