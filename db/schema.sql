-- StrawSync Neon PostgreSQL Schema
-- Idempotent DDL for all platform domains

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'logistics', 'admin')),
  organization TEXT,
  location TEXT,
  lat DOUBLE PRECISION DEFAULT 30.3742,
  lng DOUBLE PRECISION DEFAULT 75.8712,
  upi_id TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  bank_holder_name TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmer_listings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  crop_type TEXT NOT NULL,
  crop_name TEXT,
  category TEXT DEFAULT 'crop_residue',
  original_quantity NUMERIC NOT NULL,
  weight_unit TEXT DEFAULT 'tonne',
  quantity_tonnes NUMERIC NOT NULL,
  estimated_gross_tonnes NUMERIC DEFAULT 0,
  price_per_unit NUMERIC NOT NULL,
  price_per_tonne NUMERIC NOT NULL,
  land_area NUMERIC DEFAULT 0,
  land_unit TEXT DEFAULT 'acre',
  land_area_acres NUMERIC DEFAULT 0,
  moisture_percentage NUMERIC DEFAULT 14,
  bale_type TEXT DEFAULT 'baled',
  quality_score TEXT DEFAULT 'A',
  location TEXT NOT NULL,
  district TEXT,
  state TEXT,
  lat DOUBLE PRECISION DEFAULT 30.3742,
  lng DOUBLE PRECISION DEFAULT 75.8712,
  image_url TEXT,
  status TEXT DEFAULT 'verified',
  harvest_date TEXT,
  collection_start_date TEXT,
  pickup_deadline TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_requests (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  company_name TEXT,
  contact_phone TEXT,
  crop_type TEXT NOT NULL,
  required_tonnes NUMERIC NOT NULL,
  fulfilled_tonnes NUMERIC DEFAULT 0,
  max_price_per_tonne NUMERIC NOT NULL,
  max_moisture_percentage NUMERIC DEFAULT 25,
  delivery_location TEXT NOT NULL,
  address TEXT,
  district TEXT,
  state TEXT,
  lat DOUBLE PRECISION DEFAULT 29.3909,
  lng DOUBLE PRECISION DEFAULT 76.9635,
  deadline_date TEXT,
  industry_type TEXT DEFAULT 'Bio-Pellet Plant',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  listing_id TEXT,
  demand_id TEXT,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  logistics_partner_id TEXT,
  logistics_partner_name TEXT,
  crop_type TEXT NOT NULL,
  quantity_tonnes NUMERIC NOT NULL,
  display_quantity NUMERIC,
  weight_unit TEXT DEFAULT 'tonne',
  price_per_tonne NUMERIC NOT NULL,
  farmgate_rate NUMERIC DEFAULT 0,
  freight_rate NUMERIC DEFAULT 0,
  total_delivered_rate NUMERIC DEFAULT 0,
  farmer_total_payout NUMERIC DEFAULT 0,
  logistics_total_payout NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  delivery_location TEXT NOT NULL,
  delivery_district TEXT,
  delivery_state TEXT,
  pickup_location TEXT,
  pickup_district TEXT,
  pickup_state TEXT,
  distance_km NUMERIC DEFAULT 50,
  vehicle_type TEXT,
  status TEXT NOT NULL,
  payment_status TEXT DEFAULT 'awaiting_logistics',
  payment_method TEXT,
  payment_reference TEXT,
  settled_payout_target TEXT,
  utr_number TEXT,
  vehicle_number TEXT,
  driver_name TEXT,
  pickup_coords JSONB,
  drop_coords JSONB,
  current_truck_coords JSONB,
  gps_progress_percent INTEGER DEFAULT 0,
  last_gps_updated_at TIMESTAMPTZ,
  weighbridge_slip_id TEXT,
  weighbridge_net_tonnes NUMERIC,
  tracking_timeline JSONB DEFAULT '[]'::jsonb,
  co2_saved_tonnes NUMERIC DEFAULT 0,
  estimated_delivery_date TEXT,
  cancelled_reason TEXT,
  dispute_notes TEXT,
  dispute_status TEXT DEFAULT 'none',
  adjustments NUMERIC DEFAULT 0,
  delivery_proof_url TEXT,
  delivery_proof_note TEXT,
  delivered_at TIMESTAMPTZ,
  buyer_confirmed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'order',
  order_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  mode TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  crop_name TEXT,
  land_area NUMERIC DEFAULT 0,
  land_unit TEXT DEFAULT 'acre',
  land_area_acres NUMERIC DEFAULT 0,
  bale_type TEXT DEFAULT 'baled',
  moisture_percent NUMERIC,
  quantity_value NUMERIC DEFAULT 0,
  weight_unit TEXT DEFAULT 'tonne',
  recoverable_tonnes NUMERIC DEFAULT 0,
  price_per_unit NUMERIC DEFAULT 0,
  price_per_tonne NUMERIC DEFAULT 0,
  distance_km NUMERIC,
  freight_total NUMERIC,
  material_total NUMERIC,
  estimated_value NUMERIC DEFAULT 0,
  co2_saved_tonnes NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT 'system',
  target_id TEXT,
  previous_value TEXT,
  details TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_listings_farmer ON farmer_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_listings_status ON farmer_listings(status);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_buyer ON buyer_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_saved_calculations_user ON saved_calculations(user_id);
