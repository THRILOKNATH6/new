-- ==================================================================================
-- BUNDLE MANAGEMENT - AUDIT TRAIL ENHANCEMENT
-- Adds audit fields to bundling table for consistency with system standards
-- ==================================================================================

-- Add audit fields to bundling table
ALTER TABLE bundling 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) REFERENCES employees(emp_id),
ADD COLUMN IF NOT EXISTS last_changed_by VARCHAR(20) REFERENCES employees(emp_id);

-- Add comment for documentation
COMMENT ON COLUMN bundling.created_by IS 'Employee who created this bundle';
COMMENT ON COLUMN bundling.last_changed_by IS 'Employee who last modified this bundle';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bundling'
ORDER BY ordinal_position;
