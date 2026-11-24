# StrawSync — AI-Powered Agricultural Residue Liquidity & Smart Logistics Platform

> **Tagline:** Don't Burn It, Earn From It!

StrawSync is an AgriTech SaaS platform that connects farmers, biomass industries (bio-pellet plants, 2G ethanol refineries, thermal power stations), and rural logistics partners to convert agricultural residue (paddy straw / parali, wheat husk, mustard stalks, sugarcane bagasse) into economic value.

---

## 🎨 Visual Design Direction
- **Primary Color:** Forest Green (`#245C43`)
- **Secondary Green:** `#3F795A`
- **Background:** Warm off-white (`#F7F8F3`)
- **Cards:** Pure white (`#FFFFFF`)
- **Soft Accent:** Pale sage (`#E7EFE7`)
- **Typography:** Plus Jakarta Sans & Inter
- **Theme:** Clean, modern light theme designed for genuine Indian AgriTech startups.

---

## 🌟 Key Modules & Pages

1. **Landing Page (`/`):**
   - Hero section with live North India harvest map.
   - Core value proposition: "Don't Burn It, Earn From It!"
   - How StrawSync Works: **Predict, Match, Dispatch**.
   - Dual value proposition for Farmers and Industrial Buyers.
   - Interactive Residue Liquidity Calculator.
   - Verified impact metrics (Tonnes Diverted, Farmer Net Earnings, CO₂e Prevented).

2. **Authentication (`/auth`):**
   - Role-based sign-in and registration for **Farmer**, **Buyer**, **Logistics**, and **Admin**.
   - 1-Click instant demo logins for hackathon evaluation and testing.

3. **Farmer Hub (`/farmer`):**
   - Active & available residue tonnages and earnings overview.
   - Add New Residue Listing Modal with real-time agronomic estimation preview.
   - Status tracking (`Verified`, `Matched`, `Pending`, `Sold`).
   - Live dispatch timeline and escrow payout tracking.

4. **Buyer Dashboard (`/buyer`):**
   - Browse open farmgate supply with multi-criteria filters (Crop, Price, Moisture, Region).
   - Post Biomass Demand Request with budget ceilings and delivery deadlines.
   - Multi-Criteria Matching Engine ranking compatible farmgate lots.
   - Mathematical breakdown of Delivered Cost (Farmgate + Haulage Freight).
   - 1-Click "Send Purchase Request" which immediately reserves escrow and creates an active order.

5. **Logistics Dashboard (`/logistics`):**
   - Standard 4-tier agricultural fleet inventory (Tractor Trolleys, Eicher 14ft, Tata 22ft, Multi-Axle Haulers).
   - Interactive haulage route map showing farmgate-to-plant corridors.
   - Milestone progress updater: Assign Truck → En Route → Weighbridge Scale Slip → In Transit → Factory Gate Unloading → Settle Payouts.

6. **Admin Command (`/admin`):**
   - Central Pollution Control Board (CPCB) compliance tracking.
   - High-level KPIs, crop variety distribution charts, regional supply vs demand balance.
   - Residue listing verification desk and order management.
   - Urgent stubble clearance alerts to prevent field fires before winter wheat sowing deadlines.

---

## 🔬 Residue Liquidity Engine (`lib/engine.ts`)
- **Gross & Recoverable Biomass Estimation:**
  $$ \text{Gross Tonnes} = \text{Acres} \times \text{Residue Ratio} $$
  $$ \text{Recoverable Tonnes} = \text{Gross} \times \text{Recovery Rate} \times \text{Bale Efficiency} $$
- **Haversine Distance with Rural Road Winding Factor (1.22x).**
- **Vehicle Selection & Dynamic Freight Calculation:**
  $$ \text{Delivered Cost/Tonne} = \text{Farmgate Price} + \frac{(\text{Distance} \times \text{Rate/km}) + \text{Base Charge}}{\text{Matched Tonnes}} $$
- **Multi-Criteria Match Scoring (0 - 100):** Evaluates Proximity (30 pts), Quantity Fit (25 pts), Economic Margin (25 pts), and Moisture Compliance (20 pts).

---

## 🚀 How to Run

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Run
```bash
npm run build
npm run start
```
