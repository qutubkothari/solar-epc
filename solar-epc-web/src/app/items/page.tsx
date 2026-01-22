import { SectionHeader } from "@/components/section-header";

export default function ItemsPage() {
  const items = [
    {
      name: "550W Mono Panel",
      price: "AED 420",
      margin: "12%",
      tax: "5%",
      uom: "Unit",
    },
    {
      name: "10kW Inverter",
      price: "AED 3,800",
      margin: "10%",
      tax: "5%",
      uom: "Unit",
    },
    {
      name: "Mounting Structure",
      price: "AED 650",
      margin: "8%",
      tax: "5%",
      uom: "Set",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Item Master"
        subtitle="Manage standardized pricing, margin defaults, and tax rules."
        action={
          <button className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white">
            Add Item
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="w-full max-w-xs rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            placeholder="Search items"
          />
          <button className="rounded-xl border border-solar-border px-3 py-2 text-sm text-solar-ink">
            Import CSV
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-solar-border bg-solar-sand p-4"
            >
              <p className="text-sm font-semibold text-solar-ink">{item.name}</p>
              <div className="mt-3 space-y-1 text-xs text-solar-muted">
                <p>Unit Price: {item.price}</p>
                <p>Margin: {item.margin}</p>
                <p>Tax: {item.tax}</p>
                <p>UOM: {item.uom}</p>
              </div>
              <button className="mt-4 w-full rounded-xl border border-solar-border bg-white py-2 text-xs font-semibold text-solar-ink">
                Edit Item
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
