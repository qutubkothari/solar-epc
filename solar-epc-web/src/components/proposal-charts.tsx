"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";

type ProposalChartsProps = {
  systemCapacity: number;
  annualGeneration: number;
  avgMonthlyUnits: number;
  avgMonthlyBill: number;
  currentTariff: number;
  systemCost: number;
  subsidyAmount: number;
  degradationRate: number;
};

export function ProposalCharts({
  systemCapacity,
  annualGeneration,
  avgMonthlyUnits,
  avgMonthlyBill,
  currentTariff,
  systemCost,
  subsidyAmount,
  degradationRate,
}: ProposalChartsProps) {
  // Calculate monthly generation (assuming fairly distributed)
  const monthlyGeneration = annualGeneration / 12;

  // Monthly Generation vs Consumption Chart Data
  const monthlyData = [
    { month: "Jan", generation: monthlyGeneration * 0.85, consumption: avgMonthlyUnits },
    { month: "Feb", generation: monthlyGeneration * 0.9, consumption: avgMonthlyUnits },
    { month: "Mar", generation: monthlyGeneration * 1.05, consumption: avgMonthlyUnits },
    { month: "Apr", generation: monthlyGeneration * 1.15, consumption: avgMonthlyUnits },
    { month: "May", generation: monthlyGeneration * 1.2, consumption: avgMonthlyUnits },
    { month: "Jun", generation: monthlyGeneration * 1.15, consumption: avgMonthlyUnits },
    { month: "Jul", generation: monthlyGeneration * 0.95, consumption: avgMonthlyUnits },
    { month: "Aug", generation: monthlyGeneration * 0.9, consumption: avgMonthlyUnits },
    { month: "Sep", generation: monthlyGeneration * 1.0, consumption: avgMonthlyUnits },
    { month: "Oct", generation: monthlyGeneration * 1.1, consumption: avgMonthlyUnits },
    { month: "Nov", generation: monthlyGeneration * 1.0, consumption: avgMonthlyUnits },
    { month: "Dec", generation: monthlyGeneration * 0.9, consumption: avgMonthlyUnits },
  ];

  // Monthly Savings Chart Data
  const monthlySavingsData = monthlyData.map((m) => ({
    month: m.month,
    savings: Math.min(m.generation, m.consumption) * currentTariff,
  }));

  // 25-Year Cumulative Savings with Degradation
  const yearlyData = [];
  let cumulativeSavings = 0;
  const netCost = systemCost - subsidyAmount;

  for (let year = 1; year <= 25; year++) {
    const degradationFactor = 1 - (degradationRate / 100) * (year - 1);
    const yearlyGeneration = annualGeneration * degradationFactor;
    const yearlySavings = Math.min(yearlyGeneration, avgMonthlyUnits * 12) * currentTariff;
    cumulativeSavings += yearlySavings;

    yearlyData.push({
      year: `Y${year}`,
      savings: Math.round(yearlySavings),
      cumulative: Math.round(cumulativeSavings),
      investment: netCost,
    });
  }

  // ROI/Payback Chart Data
  const paybackData = yearlyData.slice(0, 10).map((y) => ({
    year: y.year,
    cumulative: y.cumulative,
    investment: y.investment,
    netGain: y.cumulative - y.investment,
  }));

  return (
    <div className="space-y-8">
      {/* Monthly Generation vs Consumption */}
      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h3 className="mb-4 text-lg font-bold text-solar-ink">
          Monthly Generation vs Consumption
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: "Units (kWh)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value) => Math.round(Number(value || 0)).toLocaleString("en-IN") + " kWh"}
            />
            <Legend />
            <Bar dataKey="generation" fill="#f59e0b" name="Solar Generation" />
            <Bar dataKey="consumption" fill="#6366f1" name="Your Consumption" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Savings */}
      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h3 className="mb-4 text-lg font-bold text-solar-ink">Estimated Monthly Savings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlySavingsData}>
            <defs>
              <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: "Savings (₹)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorSavings)"
              name="Monthly Savings"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 25-Year Cumulative Savings */}
      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h3 className="mb-4 text-lg font-bold text-solar-ink">
          25-Year Cumulative Savings (with {degradationRate}% Annual Degradation)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: "Amount (₹)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              strokeWidth={3}
              name="Cumulative Savings"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="investment"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Net Investment"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ROI and Payback Period */}
      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h3 className="mb-4 text-lg font-bold text-solar-ink">Return on Investment (10 Years)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={paybackData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: "Amount (₹)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
            <Legend />
            <Bar dataKey="cumulative" fill="#10b981" name="Cumulative Savings" />
            <Bar dataKey="investment" fill="#ef4444" name="Investment" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-solar-muted">Payback Period</p>
            <p className="mt-1 text-lg font-bold text-green-700">
              {Math.ceil(netCost / (annualGeneration * currentTariff))} Years
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-solar-muted">25-Year ROI</p>
            <p className="mt-1 text-lg font-bold text-blue-700">
              {Math.round(((yearlyData[24].cumulative - netCost) / netCost) * 100)}%
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-solar-muted">Total 25Y Savings</p>
            <p className="mt-1 text-lg font-bold text-solar-amber">
              {formatCurrency(yearlyData[24].cumulative)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
