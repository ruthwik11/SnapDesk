-- ==============================================================================
-- SnapDesk Enterprise PostgreSQL Schema for Supabase
-- Autonomous Visual Damage Triage & Multi-Tenant Policy Enforcement Platform
-- ==============================================================================

-- 1. Businesses / Tenants
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  display_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Accounts (Role Separated: Business Admin, Staff, Customer)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('business_admin', 'business_staff', 'customer')),
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) DEFAULT 0.00,
  return_window_days INTEGER DEFAULT 14,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Policy Versions
CREATE TABLE IF NOT EXISTS public.policy_versions (
  version_id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  name TEXT,
  raw_text TEXT,
  rules JSONB DEFAULT '{}'::jsonb,
  prompts JSONB DEFAULT '{}'::jsonb,
  clauses JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'published',
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Decision Threshold Versions
CREATE TABLE IF NOT EXISTS public.threshold_versions (
  version_id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  policy_version_id TEXT REFERENCES public.policy_versions(version_id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dispute Cases / Tickets
CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  postal_code TEXT,
  product_id TEXT,
  product_name TEXT,
  product_cost_reported NUMERIC(10,2),
  product_cost_verified NUMERIC(10,2),
  written_complaint TEXT,
  voice_transcript TEXT,
  status TEXT DEFAULT 'pending',
  outcome TEXT,
  outcome_status TEXT,
  handling_badge TEXT,
  policy_version_id TEXT,
  threshold_version_id TEXT,
  damage_report_id TEXT,
  media_assets JSONB DEFAULT '[]'::jsonb,
  measurements JSONB DEFAULT '{}'::jsonb,
  decision JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SAM 3.1 Visual Damage Reports
CREATE TABLE IF NOT EXISTS public.damage_reports (
  report_id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name TEXT,
  title TEXT,
  status TEXT,
  assessment_status TEXT,
  damage_ratio NUMERIC(6,4) DEFAULT 0,
  damage_ratio_formatted TEXT,
  product_found BOOLEAN DEFAULT TRUE,
  contents_damaged BOOLEAN DEFAULT FALSE,
  video_timestamps JSONB DEFAULT '[]'::jsonb,
  measurements JSONB DEFAULT '{}'::jsonb,
  regions JSONB DEFAULT '[]'::jsonb,
  overall_findings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Human Review Escalations
CREATE TABLE IF NOT EXISTS public.human_reviews (
  review_id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  reviewer_name TEXT,
  action TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Immutable Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor TEXT,
  action TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for Sub-Millisecond Scoped Queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_cases_business_id ON public.cases(business_id);
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON public.cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_policy_versions_business ON public.policy_versions(business_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_threshold_versions_business ON public.threshold_versions(business_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON public.audit_logs(business_id, timestamp DESC);

-- ==============================================================================
-- Initial Multi-Tenant Seed Data (Businesses & Baseline Policies)
-- ==============================================================================
INSERT INTO public.businesses (id, name, category, display_description, contact_email, contact_phone, active)
VALUES
  ('biz_apex', 'Apex Logistics & Retail', 'E-Commerce & Logistics', 'National express parcel delivery and consumer logistics.', 'support@apexlogistics.com', '+1-800-555-0199', TRUE),
  ('biz_nordic', 'Nordic Home Appliances', 'Consumer Electronics & Appliances', 'Premium Scandinavian kitchen and home laundry appliances.', 'claims@nordichome.com', '+1-800-555-0288', TRUE),
  ('biz_velocity', 'Velocity Fleet Rentals', 'Automotive & Mobility Rentals', 'Commercial fleet and premium vehicle rentals across 40 locations.', 'audit@velocityrentals.com', '+1-800-555-0377', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.policy_versions (version_id, business_id, version_number, name, raw_text, rules, prompts, clauses, status)
VALUES
  ('pol_apex_v1', 'biz_apex', 1, 'Apex Parcel Transit Guarantee v1.0',
   '1. COVERAGE PERIOD: Claims must be reported within 14 calendar days of delivery confirmation.\n2. CONTENT DAMAGE (Clause 4.1): If contents inside packaging sustain physical fracture, leakage, or functional impairment, an immediate full refund is granted.\n3. PACKAGING DAMAGE (Clause 4.2): Superficial cardboard crushing or tearing affecting 30% or less of outer surface qualifies for packaging replacement or store credit.\n4. SEVERE PACKAGING CRUSH (Clause 4.3): Outer carton crush exceeding 30% qualifies for complete item replacement.\n5. HIGH-VALUE ESCALATION (Clause 8.2): Any shipment valued over $200.00 requires human specialist audit.\n6. EXCLUSIONS: Damage caused after package opening or improper customer handling is not covered.',
   '{"refund_if_contents_damaged": true, "packaging_replace_max_ratio": 0.30, "handoff_order_value": 200, "min_confidence": 0.70, "reporting_window_days": 14}'::jsonb,
   '{"product": "cardboard box", "damage": ["crushed corner", "torn cardboard", "dented box", "puncture hole"], "contents": ["broken item", "damaged contents", "spilled contents"]}'::jsonb,
   '{"refund": "Clause 4.1: Direct item/contents damage confirmed by visual evidence qualifies for immediate refund.", "replace_packaging": "Clause 4.2: Superficial outer packaging damage (<=30% surface area) with intact contents qualifies for packaging replacement.", "replace_item": "Clause 4.3: Severe packaging deformation (>30% surface area) qualifies for complete item replacement.", "handoff_high_value": "Clause 8.2: High-value orders exceeding $200.00 threshold must be routed to human review.", "handoff_uncertain": "Clause 9.1: Insufficient visual confidence (<70%) or missing product boundaries requires specialist escalation."}'::jsonb,
   'published'
  ),
  ('pol_nordic_v1', 'biz_nordic', 1, 'Nordic Appliance Defect & Warranty Policy v1.0',
   '1. WARRANTY PERIOD: Visual flaws upon unboxing must be reported within 30 days.\n2. CRITICAL STRUCTURAL DEFECTS (Clause 3.1): Cracked glass panels, chassis fractures, electrical burns, or liquid leaks qualify for immediate refund or expedited unit replacement.\n3. COSMETIC BLEMISHES (Clause 3.2): Minor superficial surface scratches or scuffs occupying 15% or less of panel surface qualify for cosmetic credit.\n4. EXTENSIVE COSMETIC DAMAGE (Clause 3.3): Surface defects exceeding 15% qualify for full unit replacement.\n5. HIGH VALUE LIMIT (Clause 7.4): Appliances valued above $500.00 require human inspection.\n6. EXCLUSIONS: Normal wear, user drop damage, or improper electrical voltage are excluded.',
   '{"refund_if_contents_damaged": true, "packaging_replace_max_ratio": 0.15, "handoff_order_value": 500, "min_confidence": 0.75, "reporting_window_days": 30}'::jsonb,
   '{"product": "appliance", "damage": ["scratch", "dent", "cracked glass", "scuffed surface"], "contents": ["cracked screen", "exposed wire", "liquid leak"]}'::jsonb,
   '{"refund": "Clause 3.1: Critical structural, functional, or electrical defect qualifies for immediate refund.", "replace_packaging": "Clause 3.2: Minor superficial cosmetic defect (<=15% surface area) qualifies for cosmetic allowance credit.", "replace_item": "Clause 3.3: Substantial cosmetic defect (>15% surface area) qualifies for complete unit replacement.", "handoff_high_value": "Clause 7.4: High-value consumer appliances exceeding $500.00 threshold mandate human adjuster review.", "handoff_uncertain": "Clause 9.2: Visual ambiguity or confidence below 75% requires routing to appliance specialists."}'::jsonb,
   'published'
  ),
  ('pol_velocity_v1', 'biz_velocity', 1, 'Velocity Rental Check-In Policy v1.0',
   '1. CHECK-IN AUDIT: Returned vehicles must be photographed immediately upon drop-off.\n2. STRUCTURAL COLLISION (Clause 2.1): Smashed bumpers, frame dents, or shattered windshields trigger formal damage claims.\n3. ROAD WEAR (Clause 2.2): Minor panel scuffs and scratches occupying 10% or less of panel area are considered normal wear and waived with zero fee.\n4. ABRASION EXCESS (Clause 2.3): Scratches exceeding 10% ratio incur standard refurbishment charge.\n5. HIGH VALUE ESCALATION (Clause 6.1): Incidents or rental contracts exceeding $400.00 mandate supervisor review.',
   '{"refund_if_contents_damaged": true, "packaging_replace_max_ratio": 0.10, "handoff_order_value": 400, "min_confidence": 0.80, "reporting_window_days": 2}'::jsonb,
   '{"product": "vehicle panel", "damage": ["scratch", "dent", "scuff", "cracked bumper"], "contents": ["airbag deployed", "frame damage", "broken light"]}'::jsonb,
   '{"refund": "Clause 2.1: Pre-existing structural collision reported at check-in is waived.", "replace_packaging": "Clause 2.2: Minor superficial scuffs (<=10% panel area) qualify as standard wear-and-tear.", "replace_item": "Clause 2.3: Panel abrasion exceeding 10% incurs refurbishment repair charge.", "handoff_high_value": "Clause 6.1: Rental contracts exceeding $400.00 mandate supervisor sign-off.", "handoff_uncertain": "Clause 9.3: Glare, mud occlusion, or low confidence (<80%) requires fleet manager inspection."}'::jsonb,
   'published'
  )
ON CONFLICT (version_id) DO NOTHING;

INSERT INTO public.threshold_versions (version_id, business_id, policy_version_id, version_number, rules)
VALUES
  ('thresh_apex_v1', 'biz_apex', 'pol_apex_v1', 1, '{"packaging_replace_max_ratio": 0.30, "handoff_order_value": 200.0, "min_confidence": 0.70, "auto_refund_enabled": true, "auto_replacement_enabled": true}'::jsonb),
  ('thresh_nordic_v1', 'biz_nordic', 'pol_nordic_v1', 1, '{"packaging_replace_max_ratio": 0.15, "handoff_order_value": 500.0, "min_confidence": 0.75, "auto_refund_enabled": true, "auto_replacement_enabled": true}'::jsonb),
  ('thresh_velocity_v1', 'biz_velocity', 'pol_velocity_v1', 1, '{"packaging_replace_max_ratio": 0.10, "handoff_order_value": 400.0, "min_confidence": 0.80, "auto_refund_enabled": false, "auto_replacement_enabled": false}'::jsonb)
ON CONFLICT (version_id) DO NOTHING;
