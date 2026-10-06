import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-vega-it-ops.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Supabase Database Schema & Row Level Security (RLS) Policy Definition
 * Reflects the architecture requested in prompt:
 * Tables: profiles, COA, budgets, GL transactions, uploads, audit notes.
 * Roles: Administrator full access; Staff/Viewer read-only; Upload/User Management admin-only.
 */
export const SUPABASE_SQL_SCHEMA_AND_RLS = `
-- ==========================================================
-- VEGA (Variance Evaluation & Graphical Analytics)
-- Supabase Schema & Row-Level Security (RLS) Architecture
-- ==========================================================

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Administrator', 'Staff', 'Viewer')),
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chart of Accounts (COA) Table
CREATE TABLE public.coa (
  code TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Hardware', 'Software', 'Network', 'Consulting', 'Maintenance', 'Training')),
  department TEXT NOT NULL,
  register_system TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Budgets Table
CREATE TABLE public.budgets (
  id TEXT PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  coa_code TEXT REFERENCES public.coa(code) ON DELETE RESTRICT,
  monthly_budget JSONB NOT NULL, -- { "Apr": 350000000, "May": ... }
  annual_total NUMERIC(15, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT NOT NULL
);

-- 4. GL Transactions (Actual Expenses)
CREATE TABLE public.gl_transactions (
  id TEXT PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  period_month TEXT NOT NULL CHECK (period_month IN ('Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar')),
  coa_code TEXT REFERENCES public.coa(code) ON DELETE RESTRICT,
  actual_amount NUMERIC(15, 2) NOT NULL,
  gl_document_no TEXT NOT NULL,
  posting_date DATE NOT NULL,
  vendor_name TEXT,
  description TEXT,
  upload_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Upload Batches
CREATE TABLE public.uploads (
  id TEXT PRIMARY KEY,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('Budget', 'Monthly GL')),
  fiscal_year TEXT NOT NULL,
  target_month TEXT,
  file_name TEXT NOT NULL,
  file_size TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Replaced')),
  replaced_at TIMESTAMPTZ,
  replaced_by TEXT,
  replace_reason TEXT,
  replaced_batch_id TEXT,
  row_count INT NOT NULL,
  accepted_rows INT NOT NULL,
  rejected_rows INT NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  previous_total_amount NUMERIC(15, 2)
);

-- 6. Audit Notes (Strictly Append-Only)
CREATE TABLE public.audit_notes (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  category TEXT NOT NULL,
  related_batch_id TEXT,
  content TEXT NOT NULL
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_notes ENABLE ROW LEVEL SECURITY;

-- Helper function to check current user role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Everyone can read profiles" 
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Administrators can insert/update profiles" 
  ON public.profiles FOR ALL TO authenticated 
  USING (public.get_current_role() = 'Administrator');

-- COA Policies (Read-only for all, write for Admin)
CREATE POLICY "All authenticated users can read COA" 
  ON public.coa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Administrators can modify COA" 
  ON public.coa FOR ALL TO authenticated 
  USING (public.get_current_role() = 'Administrator');

-- Budgets & GL Transactions Policies
CREATE POLICY "All authenticated users can read Budgets & Actuals" 
  ON public.budgets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Administrators can insert/update Budgets" 
  ON public.budgets FOR ALL TO authenticated 
  USING (public.get_current_role() = 'Administrator');

CREATE POLICY "All authenticated users can read GL Actuals" 
  ON public.gl_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Administrators can insert/update GL Actuals" 
  ON public.gl_transactions FOR ALL TO authenticated 
  USING (public.get_current_role() = 'Administrator');

-- Upload Batches Policies
CREATE POLICY "All authenticated users can read Upload Batches" 
  ON public.uploads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Administrators can execute Uploads or GANTI DATA" 
  ON public.uploads FOR INSERT TO authenticated 
  WITH CHECK (public.get_current_role() = 'Administrator');

CREATE POLICY "Only Administrators can supersede Uploads" 
  ON public.uploads FOR UPDATE TO authenticated 
  USING (public.get_current_role() = 'Administrator');

-- Audit Notes (Strictly Append-Only: No Update, No Delete allowed for ANY role)
CREATE POLICY "All authenticated users can read Audit Notes" 
  ON public.audit_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and Administrators can append Audit Notes" 
  ON public.audit_notes FOR INSERT TO authenticated 
  WITH CHECK (public.get_current_role() IN ('Administrator', 'Staff'));

-- Prohibit UPDATE and DELETE on audit_notes (Immutable compliance)
-- Note: By not creating UPDATE or DELETE policies, Supabase blocks all updates/deletions.
`;
