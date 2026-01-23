# SOLAR EPC BUSINESS MODEL ANALYSIS

## 🔆 UNDERSTANDING SOLAR INSTALLATIONS

### System Components:
1. **Solar Panels (Modules)** - Convert sunlight to DC electricity
   - Measured in Watt-peak (Wp)
   - Types: Bifacial, TOPCON, Mono PERC
   - Common sizes: 540W, 585W, 630W per panel
   
2. **Inverters** - Convert DC to AC electricity
   - Sized based on system capacity (kW)
   - String inverters vs Central inverters
   
3. **Mounting Structure** - Holds panels
   - MS structures (60x40, 40x40 dimensions)
   - Priced per kW of system
   
4. **Balance of System (BOS)**:
   - DC cables, AC cables
   - DCDB (DC Distribution Box), ACDB (AC Distribution Box)
   - Earthing, Lightning arrestor
   - Net meter for grid connection
   - Installation & commissioning

### Pricing Model in PRICE LIST:

**Rs/Watt items** (for panels & inverters):
- Module BI FACIAL: ₹16/Watt + 12% GST = ₹17.92/Watt
- Module TOPCON: ₹17/Watt + 12% GST = ₹19.04/Watt
- Inverter: ₹5.1/Watt + 12% GST = ₹5.712/Watt

**Rs/kW items** (for structures & BOS):
- Structure 60x40: ₹4000/kW + 18% GST = ₹4720/kW
- DCDB: ₹2500/kW
- Earthing: ₹800/kW
- Net Meter: ₹7000/unit (flat rate)

### How Quotations Work:

**Example: 15 kWp Solar System**
```
Client needs 15 kWp (15,000 Watt) system

Step 1: Choose panel wattage (say 630W panels)
        Panels needed = 15,000W / 630W = 24 panels
        
Step 2: Calculate costs:
        Panels: 15,000W × ₹16/W = ₹2,40,000 + 12% GST
        Inverter: 15,000W × ₹5.1/W = ₹76,500 + 12% GST
        Structure: 15 kW × ₹4000/kW = ₹60,000 + 18% GST
        DCDB: 15 kW × ₹2500/kW = ₹37,500 + 18% GST
        ... (other BOS items)
        
Step 3: Add installation, margins, generate quotation
```

## 🚨 CURRENT SYSTEM PROBLEMS

### Problem 1: PRICE LIST Not Being Used
- We have 117 items in PRICE LIST with proper units (Rs/Watt, Rs/kW)
- Current system uses Inventory sheet (108 items with flat prices)
- **Missing**: Price per Watt/kW calculation logic

### Problem 2: No System Capacity Calculator
- User has to manually calculate panels needed
- No auto-calculation: System kWp → Number of panels
- **Missing**: `System Capacity ÷ Panel Wattage = Qty of Panels`

### Problem 3: Wrong Pricing Logic
- Items priced as flat ₹X per unit
- Should be: `Qty × Rate/Watt × System_Wattage` for panels/inverters
- Should be: `System_kW × Rate/kW` for structures/BOS

### Problem 4: No Component Templates
- Every quotation built from scratch
- **Missing**: System size templates (5kW, 10kW, 25kW, 50kW, 100kW)
- **Missing**: Auto-BOM based on capacity

## ✅ SOLUTION ARCHITECTURE

### 1. Create PriceList Model
```prisma
model PriceListItem {
  id          String   @id @default(cuid())
  srNo        Int
  itemName    String
  unit        String   // "RS/WATT", "Rs/Kw", "Per Unit"
  rate        Decimal
  gstPercent  Decimal
  totalWithGst Decimal
  category    String?  // "Panel", "Inverter", "Structure", "BOS"
}
```

### 2. Import PRICE LIST Data
- Replace current inventory import
- Store with proper units (Rs/Watt, Rs/kW)

### 3. System Capacity Calculator
```
Input: System size (kWp), Panel wattage (W)
Output: 
  - Number of panels
  - Inverter size
  - Auto-populated BOS items
```

### 4. Smart Quotation Builder
- Select system capacity (5/10/25/50/100 kW)
- Auto-calculate all components
- User can override/customize
- Proper unit-based pricing

### 5. BOQ Auto-Generator
For 15 kWp system with 630W panels:
```
Solar Panels (BI FACIAL 630W) | 24 nos | ₹16/W | Qty: 15000W | Total: ₹2,68,800
Inverter (15kW)              | 1 nos  | ₹5.1/W | Qty: 15000W | Total: ₹85,680
Structure (60x40)            | 15 kW  | ₹4000/kW |             | Total: ₹70,800
DCDB                         | 15 kW  | ₹2500/kW |             | Total: ₹44,250
... (auto-populated BOS)
```

## 🎯 IMPLEMENTATION PLAN

Phase 1: Data Foundation
- [ ] Import PRICE LIST (117 items) instead of Inventory
- [ ] Add `unit` field to Item model ("RS/WATT", "Rs/Kw", "Per Unit")
- [ ] Add `pricePerUnit` boolean flag

Phase 2: Quotation Calculator
- [ ] System Capacity input (kWp)
- [ ] Panel selection (wattage) → Auto-calculate quantity
- [ ] Smart item selection (filters by category)
- [ ] Auto-calculate based on unit type

Phase 3: Templates
- [ ] Create standard system sizes (5/10/25/50/100 kWp)
- [ ] Auto-populate BOS items
- [ ] One-click quotation generation

Phase 4: Technical Proposal Integration
- [ ] System design calculator (panel layout)
- [ ] Generation estimation (kWp × sun hours × PR)
- [ ] Auto-fill all technical specs from quotation
