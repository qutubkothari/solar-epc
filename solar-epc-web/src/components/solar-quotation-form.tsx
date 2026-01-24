"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { formatCurrency } from "@/lib/format";

type Client = {
  id: string;
  name: string;
};

type Item = {
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

type LineItem = {
  itemId: string;
  itemName: string;
  itemHead: string;
  itemType: string;
  make: string;
  description: string;
  unit: string;
  rateWithoutGst: number;
  quantity: number;
  total: number;
  gstPercent: number;
  totalGst: number;
  rateWithGst: number;
  pricingUnit?: string;
};

type SolarQuotationFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function SolarQuotationForm({ onClose, onSuccess }: SolarQuotationFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    version: "1.0",
  });

  // Solar System Configuration
  const [systemConfig, setSystemConfig] = useState({
    moduleWattage: 630, // Default: 630W panels
    systemCapacityKw: 15, // Default: 15 kW system
    moduleId: "", // Selected module from dropdown
    inverterId: "", // Selected inverter
    structureId: "", // Selected structure type
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [autoCalculating, setAutoCalculating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState("");

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

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  // Filter items by category for smart dropdowns
  const solarModules = items.filter(i => i.category === 'Solar Modules');
  const inverters = items.filter(i => i.category === 'Inverters');
  const structures = items.filter(i => i.category === 'Mounting Structure');

  const moduleOptions = solarModules.map(item => ({
    value: item.id,
    label: `${item.name} ${item.brand ? `- ${item.brand}` : ''}`,
    subtitle: `${formatCurrency(item.unitPrice)}/Watt • ${(item.taxPercent * 100).toFixed(0)}% GST`,
  }));

  const inverterOptions = inverters.map(item => ({
    value: item.id,
    label: `${item.name} ${item.brand ? `- ${item.brand}` : ''}`,
    subtitle: `${formatCurrency(item.unitPrice)}/Watt • ${(item.taxPercent * 100).toFixed(0)}% GST`,
  }));

  const structureOptions = structures.map(item => ({
    value: item.id,
    label: `${item.name} ${item.brand ? `- ${item.brand}` : ''}`,
    subtitle: `${formatCurrency(item.unitPrice)}/${item.uom || 'kW'} • ${(item.taxPercent * 100).toFixed(0)}% GST`,
  }));

  // Calculate derived values
  const systemCapacityWatts = systemConfig.systemCapacityKw * 1000;
  const numberOfModules = Math.ceil(systemCapacityWatts / systemConfig.moduleWattage);
  const actualSystemWatts = numberOfModules * systemConfig.moduleWattage;
  const actualSystemKw = actualSystemWatts / 1000;

  // Auto-generate Bill of Materials
  const generateBOM = () => {
    setAutoCalculating(true);
    const bom: LineItem[] = [];

    // 1. SOLAR MODULES
    const moduleItem = items.find(i => i.id === systemConfig.moduleId);
    if (moduleItem) {
      const qty = actualSystemWatts;
      const rate = Number(moduleItem.unitPrice);
      const total = qty * rate;
      const gst = total * Number(moduleItem.taxPercent);
      bom.push({
        itemId: moduleItem.id,
        itemName: moduleItem.name,
        itemHead: 'SOLAR MODULE',
        itemType: moduleItem.name,
        make: moduleItem.brand || '',
        description: moduleItem.description || '',
        unit: 'WP',
        rateWithoutGst: rate,
        quantity: qty,
        total,
        gstPercent: Number(moduleItem.taxPercent),
        totalGst: gst,
        rateWithGst: rate * (1 + Number(moduleItem.taxPercent)),
        pricingUnit: 'RS_PER_WATT',
      });
    }

    // 2. INVERTER
    const inverterItem = items.find(i => i.id === systemConfig.inverterId);
    if (inverterItem) {
      const qty = 1;
      const rate = Number(inverterItem.unitPrice);
      const baseTotal = rate; // Inverter is sold per unit, not per watt
      const gst = baseTotal * Number(inverterItem.taxPercent);
      bom.push({
        itemId: inverterItem.id,
        itemName: inverterItem.name,
        itemHead: 'INVERTER',
        itemType: 'ON GRID',
        make: inverterItem.brand || '',
        description: inverterItem.description || '',
        unit: 'Nos',
        rateWithoutGst: rate,
        quantity: qty,
        total: baseTotal,
        gstPercent: Number(inverterItem.taxPercent),
        totalGst: gst,
        rateWithGst: rate * (1 + Number(inverterItem.taxPercent)),
        pricingUnit: 'PER_UNIT',
      });
    }

    // 3. MOUNTING STRUCTURE
    const structureItem = items.find(i => i.id === systemConfig.structureId);
    if (structureItem) {
      const estimatedKg = actualSystemKw * 45; // ~45 kg/kW for structure
      const rate = Number(structureItem.unitPrice);
      const total = estimatedKg * rate;
      const gst = total * Number(structureItem.taxPercent);
      bom.push({
        itemId: structureItem.id,
        itemName: structureItem.name,
        itemHead: 'MODULE MOUNTING STRUCTURE',
        itemType: 'Elevated Structure',
        make: structureItem.brand || '',
        description: structureItem.description || '',
        unit: 'KG',
        rateWithoutGst: rate,
        quantity: estimatedKg,
        total,
        gstPercent: Number(structureItem.taxPercent),
        totalGst: gst,
        rateWithGst: rate * (1 + Number(structureItem.taxPercent)),
      });
    }

    // 4. AUTO-ADD BOS COMPONENTS (Balance of System)
    const bosItems = [
      { category: 'ACDB', unit: 'wp', qtyMultiplier: actualSystemWatts },
      { category: 'DCDB', unit: 'wp', qtyMultiplier: actualSystemWatts },
      { category: 'Earthing', unit: 'NOS', qtyMultiplier: 3 },
      { category: 'Lightning Arrestor', unit: 'NOS', qtyMultiplier: 1 },
      { category: 'Cables', unit: 'MTR', qtyMultiplier: actualSystemKw * 10 }, // ~10m per kW
      { category: 'Connectors', unit: 'NOS', qtyMultiplier: numberOfModules / 2 },
    ];

    bosItems.forEach(bos => {
      const bosItem = items.find(i => i.category === bos.category);
      if (bosItem) {
        const qty = bos.qtyMultiplier;
        const rate = Number(bosItem.unitPrice);
        const total = bosItem.pricingUnit === 'RS_PER_WATT' 
          ? actualSystemWatts * rate 
          : qty * rate;
        const gst = total * Number(bosItem.taxPercent);
        bom.push({
          itemId: bosItem.id,
          itemName: bosItem.name,
          itemHead: bos.category.toUpperCase(),
          itemType: bosItem.name,
          make: bosItem.brand || '',
          description: bosItem.description || '',
          unit: bos.unit,
          rateWithoutGst: rate,
          quantity: qty,
          total,
          gstPercent: Number(bosItem.taxPercent),
          totalGst: gst,
          rateWithGst: rate * (1 + Number(bosItem.taxPercent)),
          pricingUnit: bosItem.pricingUnit || undefined,
        });
      }
    });

    // 5. INSTALLATION & OTHER CHARGES (RS/KW)
    const kwBasedItems = items.filter(i => i.pricingUnit === 'RS_PER_KW');
    kwBasedItems.forEach(kwItem => {
      const qty = actualSystemKw;
      const rate = Number(kwItem.unitPrice);
      const total = qty * rate;
      const gst = total * Number(kwItem.taxPercent);
      bom.push({
        itemId: kwItem.id,
        itemName: kwItem.name,
        itemHead: kwItem.category?.toUpperCase() || 'OTHER',
        itemType: kwItem.name,
        make: kwItem.brand || '',
        description: kwItem.description || '',
        unit: 'KW',
        rateWithoutGst: rate,
        quantity: qty,
        total,
        gstPercent: Number(kwItem.taxPercent),
        totalGst: gst,
        rateWithGst: rate * (1 + Number(kwItem.taxPercent)),
        pricingUnit: 'RS_PER_KW',
      });
    });

    setLineItems(bom);
    setAutoCalculating(false);
  };

  // Auto-generate BOM when system config changes
  useEffect(() => {
    if (systemConfig.moduleId && systemConfig.inverterId && systemConfig.structureId) {
      generateBOM();
    }
  }, [systemConfig]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalGst = lineItems.reduce((sum, item) => sum + Number(item.totalGst || 0), 0);
  const grandTotal = subtotal + totalGst;

  // Update line item quantity
  const updateLineItemQty = (index: number, newQty: number) => {
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        
        const foundItem = items.find(i => i.id === item.itemId);
        if (!foundItem) return item;

        let total = 0;
        if (foundItem.pricingUnit === 'RS_PER_WATT') {
          total = actualSystemWatts * foundItem.unitPrice;
        } else if (foundItem.pricingUnit === 'RS_PER_KW') {
          total = newQty * foundItem.unitPrice;
        } else {
          total = newQty * foundItem.unitPrice;
        }

        const gst = total * foundItem.taxPercent;

        return {
          ...item,
          quantity: newQty,
          total,
          totalGst: gst,
        };
      })
    );
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add manual item
  const addManualItem = () => {
    if (!selectedItemToAdd) return;
    
    const foundItem = items.find(i => i.id === selectedItemToAdd);
    if (!foundItem) return;

    const qty = foundItem.pricingUnit === 'RS_PER_WATT' ? actualSystemWatts : 
                foundItem.pricingUnit === 'RS_PER_KW' ? actualSystemKw : 1;
    
    let total = 0;
    if (foundItem.pricingUnit === 'RS_PER_WATT') {
      total = actualSystemWatts * foundItem.unitPrice;
    } else if (foundItem.pricingUnit === 'RS_PER_KW') {
      total = qty * foundItem.unitPrice;
    } else {
      total = qty * foundItem.unitPrice;
    }

    const gst = total * foundItem.taxPercent;

    const newItem: LineItem = {
      itemId: foundItem.id,
      itemName: foundItem.name,
      itemHead: foundItem.category || 'OTHER',
      itemType: foundItem.name,
      make: foundItem.brand || '',
      description: foundItem.description || '',
      unit: foundItem.uom || 'NOS',
      rateWithoutGst: foundItem.unitPrice,
      quantity: qty,
      total,
      gstPercent: foundItem.taxPercent,
      totalGst: gst,
      rateWithGst: foundItem.unitPrice * (1 + foundItem.taxPercent),
      pricingUnit: foundItem.pricingUnit || undefined,
    };

    setLineItems((prev) => [...prev, newItem]);
    setSelectedItemToAdd("");
    setShowAddItem(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.clientId) {
      setErrorMessage("Please select a client");
      return;
    }

    if (!formData.title) {
      setErrorMessage("Please enter a quotation title");
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage("Please configure the solar system to generate BOM");
      return;
    }

    setLoading(true);

    try {
      // Create quotation with solar-specific structure
      const payload = {
        clientId: formData.clientId,
        title: formData.title,
        version: formData.version,
        systemCapacityKw: actualSystemKw,
        moduleWattage: systemConfig.moduleWattage,
        numberOfModules,
        items: lineItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.rateWithoutGst,
          taxPercent: item.gstPercent,
          marginPercent: 0,
        })),
      };

      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create quotation");
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title="New Solar EPC Quotation"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Client & Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clientOptions}
              value={formData.clientId}
              onChange={(value) => setFormData({ ...formData, clientId: value })}
              placeholder="Select client..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quotation Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Roof Top Solar System"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Solar System Configuration */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            ⚡ Solar System Configuration
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Capacity (kW) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={systemConfig.systemCapacityKw}
                onChange={(e) => setSystemConfig({ 
                  ...systemConfig, 
                  systemCapacityKw: parseFloat(e.target.value) || 0 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Wattage (W)
              </label>
              <input
                type="number"
                value={systemConfig.moduleWattage}
                onChange={(e) => setSystemConfig({ 
                  ...systemConfig, 
                  moduleWattage: parseInt(e.target.value) || 630 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-white border-2 border-blue-300 rounded-md">
                <div className="text-xs text-gray-600">No. of Modules</div>
                <div className="text-2xl font-bold text-blue-600">{numberOfModules}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solar Module <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={moduleOptions}
                value={systemConfig.moduleId}
                onChange={(value) => setSystemConfig({ ...systemConfig, moduleId: value })}
                placeholder="Select module..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inverter <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={inverterOptions}
                value={systemConfig.inverterId}
                onChange={(value) => setSystemConfig({ ...systemConfig, inverterId: value })}
                placeholder="Select inverter..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mounting Structure <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={structureOptions}
                value={systemConfig.structureId}
                onChange={(value) => setSystemConfig({ ...systemConfig, structureId: value })}
                placeholder="Select structure..."
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm text-green-800">
              <strong>System Summary:</strong> {actualSystemKw.toFixed(2)} kWp 
              ({numberOfModules} × {systemConfig.moduleWattage}W panels = {actualSystemWatts.toLocaleString()}W)
            </div>
          </div>
        </div>

        {/* Bill of Materials */}
        {lineItems.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">
                Bill of Materials ({lineItems.length} items)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100"
                >
                  + Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  {editMode ? '✓ Done Editing' : '✏️ Edit'}
                </button>
              </div>
            </div>

            {/* Add Item Section */}
            {showAddItem && (
              <div className="bg-blue-50 px-4 py-3 border-b flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Item to Add
                  </label>
                  <SearchableSelect
                    options={items.map(item => ({
                      value: item.id,
                      label: item.name,
                      subtitle: `${item.category || 'Other'} • ${formatCurrency(item.unitPrice)}${item.pricingUnit === 'RS_PER_WATT' ? '/W' : item.pricingUnit === 'RS_PER_KW' ? '/kW' : ''} • ${(item.taxPercent * 100).toFixed(0)}% GST`,
                    }))}
                    value={selectedItemToAdd}
                    onChange={setSelectedItemToAdd}
                    placeholder="Search items..."
                  />
                </div>
                <button
                  type="button"
                  onClick={addManualItem}
                  disabled={!selectedItemToAdd}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {editMode && <th className="px-2 py-2 w-10"></th>}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Make</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {editMode && (
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm">
                        <div className="font-medium text-gray-900">{item.itemHead}</div>
                        <div className="text-xs text-gray-500">{item.itemName}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{item.make}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        {editMode && !item.pricingUnit?.includes('WATT') ? (
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItemQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-right border border-gray-300 rounded"
                            step="0.01"
                          />
                        ) : (
                          <span>{item.quantity.toLocaleString()}</span>
                        )}
                        {' '}{item.unit}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        {formatCurrency(item.rateWithoutGst)}
                        {item.pricingUnit === 'RS_PER_WATT' && <div className="text-xs text-blue-600">/Watt</div>}
                        {item.pricingUnit === 'RS_PER_KW' && <div className="text-xs text-blue-600">/kW</div>}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-600">
                        {formatCurrency(item.totalGst)}
                        <div className="text-xs text-gray-400">
                          {(item.gstPercent * 100).toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(item.total + item.totalGst)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-right">
                      Subtotal:
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-right">
                      {formatCurrency(subtotal)}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-right">
                      {formatCurrency(totalGst)}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-right">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan={6} className="px-3 py-3 text-right text-lg font-bold text-blue-900">
                      Grand Total:
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-bold text-blue-900">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td colSpan={7} className="px-3 py-2 text-sm text-green-800">
                      <strong>Cost per Watt:</strong> {formatCurrency(grandTotal / actualSystemWatts)}/W
                      {' • '}
                      <strong>Cost per kW:</strong> {formatCurrency(grandTotal / actualSystemKw)}/kW
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || lineItems.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Quotation"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
