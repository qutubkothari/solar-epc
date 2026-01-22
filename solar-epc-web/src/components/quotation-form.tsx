"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  unitPrice: number;
  taxPercent: number;
  marginPercent: number;
};

type QuotationFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function QuotationForm({ onClose, onSuccess }: QuotationFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
  });
  const [lineItems, setLineItems] = useState([
    { itemId: "", quantity: 1 },
  ]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const updateLineItem = (index: number, field: "itemId" | "quantity", value: string | number) => {
    setLineItems((prev) =>
      prev.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { itemId: "", quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const selectedLines = lineItems
    .filter((line) => line.itemId)
    .map((line) => {
      const item = items.find((entry) => entry.id === line.itemId);
      const unitPrice = Number(item?.unitPrice || 0);
      const marginPercent = item?.marginPercent || 0;
      const taxPercent = item?.taxPercent || 0;
      const quantity = Number(line.quantity) || 0;
      const marginAmount = unitPrice * (marginPercent / 100);
      const taxAmount = unitPrice * (taxPercent / 100);
      const lineTotal = (unitPrice + marginAmount + taxAmount) * quantity;
      return { item, quantity, lineTotal };
    });

  const totalValue = selectedLines.reduce((sum, line) => sum + line.lineTotal, 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: lineItems.filter((line) => line.itemId && line.quantity),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to create quotation. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while creating the quotation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h2 className="text-xl font-semibold text-solar-ink">New Quotation</h2>
        <p className="mt-1 text-sm text-solar-muted">
          Start a new quotation version for the selected client.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Client</label>
            <select
              required
              value={formData.clientId}
              onChange={(event) => setFormData({ ...formData, clientId: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Title</label>
            <input
              required
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
              placeholder="e.g., Al Qudra Villas Quotation"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Line Items</label>
            <div className="mt-2 space-y-3">
              {lineItems.map((line, index) => (
                <div key={`line-${index}`} className="flex flex-wrap gap-2">
                  <select
                    value={line.itemId}
                    onChange={(event) => updateLineItem(index, "itemId", event.target.value)}
                    className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => updateLineItem(index, "quantity", Number(event.target.value))}
                    className="w-24 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLineItem}
                className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-solar-border bg-solar-sand px-4 py-3 text-sm text-solar-ink">
            Estimated Total: <span className="font-semibold">AED {totalValue.toFixed(2)}</span>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-solar-amber py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
