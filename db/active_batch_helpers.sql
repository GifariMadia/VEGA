DROP FUNCTION IF EXISTS get_active_budget_batch();
DROP FUNCTION IF EXISTS get_active_budget_batch(VARCHAR);
DROP FUNCTION IF EXISTS get_active_gl_batch();
DROP FUNCTION IF EXISTS get_active_gl_batch(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_active_budget_data();
DROP FUNCTION IF EXISTS get_active_budget_data(VARCHAR);
DROP FUNCTION IF EXISTS get_active_gl_data();
DROP FUNCTION IF EXISTS get_active_gl_data(VARCHAR, VARCHAR);


CREATE OR REPLACE FUNCTION get_active_budget_batch(p_fiscal_year VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    upload_type VARCHAR,
    fiscal_year VARCHAR,
    target_month VARCHAR,
    file_name VARCHAR,
    row_count INTEGER,
    accepted_rows INTEGER,
    rejected_rows INTEGER,
    total_amount NUMERIC,
    status VARCHAR,
    replaced_batch_id BIGINT,
    replace_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
    SELECT *
    FROM upload_batches
    WHERE upload_type = 'Budget'
      AND status = 'Active'
      AND (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_active_gl_batch(p_fiscal_year VARCHAR DEFAULT NULL, p_month VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    upload_type VARCHAR,
    fiscal_year VARCHAR,
    target_month VARCHAR,
    file_name VARCHAR,
    row_count INTEGER,
    accepted_rows INTEGER,
    rejected_rows INTEGER,
    total_amount NUMERIC,
    status VARCHAR,
    replaced_batch_id BIGINT,
    replace_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
    SELECT *
    FROM upload_batches
    WHERE upload_type = 'Monthly GL'
      AND status = 'Active'
      AND (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_month IS NULL OR target_month = p_month)
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_active_budget_data(p_fiscal_year VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    fiscal_year VARCHAR,
    coa_code VARCHAR,
    month VARCHAR,
    budget_amount NUMERIC,
    upload_batch_id BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
    SELECT b.id,
           b.fiscal_year,
           b.coa_code,
           b.month,
           b.budget_amount,
           b.upload_batch_id,
           b.created_at,
           b.updated_at
    FROM budgets b
    WHERE b.upload_batch_id = (
        SELECT id
        FROM get_active_budget_batch(p_fiscal_year)
    );
$$;

CREATE OR REPLACE FUNCTION get_active_gl_data(p_fiscal_year VARCHAR DEFAULT NULL, p_month VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    fiscal_year VARCHAR,
    period_month VARCHAR,
    coa_code VARCHAR,
    actual_amount NUMERIC,
    amount NUMERIC,
    debit NUMERIC,
    credit NUMERIC,
    doc_no VARCHAR,
    posting_date DATE,
    vendor_name VARCHAR,
    description TEXT,
    department VARCHAR,
    section_code VARCHAR,
    currency VARCHAR,
    upload_batch_id BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
    SELECT g.id,
           g.fiscal_year,
           g.period_month,
           g.coa_code,
           g.actual_amount,
           g.actual_amount AS amount,
           g.debit,
           g.credit,
           g.doc_no,
           g.posting_date,
           g.vendor_name,
           g.description,
           g.department,
           g.section_code,
           g.currency,
           g.upload_batch_id,
           g.created_at,
           g.updated_at
    FROM gl_transactions g
    WHERE g.upload_batch_id = (
        SELECT id
        FROM get_active_gl_batch(p_fiscal_year, p_month)
    );
$$;
