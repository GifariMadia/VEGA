-- PostgreSQL schema for Vega IT Budget and GL tracking
-- Step 1: core database schema for COA, budgets, GL transactions, upload batches, audit trail,
-- departments, sections, fiscal periods, and COA aliases.

BEGIN;

CREATE TABLE IF NOT EXISTS department_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    department_id BIGINT NOT NULL REFERENCES department_master(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coa_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    department VARCHAR(150) NOT NULL,
    section_code VARCHAR(40),
    status VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending', 'Closed')),
    register_system VARCHAR(80) NOT NULL,
    in_scope BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_batches (
    id BIGSERIAL PRIMARY KEY,
    upload_type VARCHAR(30) NOT NULL CHECK (upload_type IN ('Budget', 'Monthly GL')),
    fiscal_year VARCHAR(20) NOT NULL,
    target_month VARCHAR(10),
    file_name VARCHAR(255) NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    accepted_rows INTEGER NOT NULL DEFAULT 0,
    rejected_rows INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Replaced', 'Rejected')),
    replaced_batch_id BIGINT REFERENCES upload_batches(id) ON DELETE SET NULL,
    replace_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    fiscal_year VARCHAR(20) NOT NULL,
    coa_code VARCHAR(50) NOT NULL REFERENCES coa_master(code) ON DELETE RESTRICT,
    month VARCHAR(10) NOT NULL CHECK (month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    budget_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    upload_batch_id BIGINT NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fiscal_year, coa_code, month, upload_batch_id)
);

CREATE TABLE IF NOT EXISTS gl_transactions (
    id BIGSERIAL PRIMARY KEY,
    fiscal_year VARCHAR(20) NOT NULL,
    period_month VARCHAR(10) NOT NULL CHECK (period_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    coa_code VARCHAR(50) NOT NULL REFERENCES coa_master(code) ON DELETE RESTRICT,
    actual_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    debit NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit NUMERIC(18,2) NOT NULL DEFAULT 0,
    doc_no VARCHAR(120),
    posting_date DATE,
    vendor_name VARCHAR(200),
    description TEXT,
    department VARCHAR(150),
    section_code VARCHAR(40),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    upload_batch_id BIGINT NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_notes (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(80),
    category VARCHAR(30) NOT NULL CHECK (category IN ('Upload', 'Replacement', 'Budget Revision', 'System', 'Policy')),
    related_batch_id BIGINT REFERENCES upload_batches(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
    id BIGSERIAL PRIMARY KEY,
    fiscal_year VARCHAR(20) NOT NULL,
    month_name VARCHAR(10) NOT NULL CHECK (month_name IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    month_number SMALLINT NOT NULL CHECK (month_number BETWEEN 1 AND 12),
    starts_on DATE,
    ends_on DATE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fiscal_year, month_name),
    UNIQUE (fiscal_year, month_number)
);

CREATE TABLE IF NOT EXISTS coa_aliases (
    id BIGSERIAL PRIMARY KEY,
    coa_code VARCHAR(50) NOT NULL REFERENCES coa_master(code) ON DELETE CASCADE,
    alias_value VARCHAR(120) NOT NULL,
    alias_type VARCHAR(30) NOT NULL DEFAULT 'alternate',
    source_system VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (coa_code, alias_value)
);

CREATE INDEX IF NOT EXISTS idx_coa_master_category
    ON coa_master (category);

CREATE INDEX IF NOT EXISTS idx_coa_master_department
    ON coa_master (department);

CREATE INDEX IF NOT EXISTS idx_coa_master_section_code
    ON coa_master (section_code);

CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year_coa
    ON budgets (fiscal_year, coa_code);

CREATE INDEX IF NOT EXISTS idx_budgets_month
    ON budgets (month);

CREATE INDEX IF NOT EXISTS idx_budgets_upload_batch_id
    ON budgets (upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_gl_fiscal_year_coa_period
    ON gl_transactions (fiscal_year, coa_code, period_month);

CREATE INDEX IF NOT EXISTS idx_gl_upload_batch_id
    ON gl_transactions (upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_gl_doc_no
    ON gl_transactions (doc_no);

CREATE INDEX IF NOT EXISTS idx_upload_batches_fiscal_year
    ON upload_batches (fiscal_year, upload_type);

CREATE INDEX IF NOT EXISTS idx_upload_batches_status
    ON upload_batches (status);

CREATE INDEX IF NOT EXISTS idx_audit_notes_related_batch
    ON audit_notes (related_batch_id);

CREATE INDEX IF NOT EXISTS idx_audit_notes_category
    ON audit_notes (category);

CREATE INDEX IF NOT EXISTS idx_section_master_department
    ON section_master (department_id);

CREATE INDEX IF NOT EXISTS idx_coa_aliases_alias_value
    ON coa_aliases (alias_value);

CREATE UNIQUE INDEX IF NOT EXISTS ux_upload_batches_active_budget
    ON upload_batches (fiscal_year)
    WHERE upload_type = 'Budget' AND status = 'Active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_upload_batches_active_gl_month
    ON upload_batches (fiscal_year, target_month)
    WHERE upload_type = 'Monthly GL' AND status = 'Active';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_department_master_updated_at
BEFORE UPDATE ON department_master
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_section_master_updated_at
BEFORE UPDATE ON section_master
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_coa_master_updated_at
BEFORE UPDATE ON coa_master
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_upload_batches_updated_at
BEFORE UPDATE ON upload_batches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gl_transactions_updated_at
BEFORE UPDATE ON gl_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fiscal_periods_updated_at
BEFORE UPDATE ON fiscal_periods
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
