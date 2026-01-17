-- Create a function to truncate publish tables
-- This allows us to clear all data from a publish table before rebuilding
CREATE OR REPLACE FUNCTION truncate_publish_table(table_name TEXT)
RETURNS void AS $$
BEGIN
  -- Validate that the table name starts with 'listing_publish_' for security
  IF table_name !~ '^listing_publish_' THEN
    RAISE EXCEPTION 'Invalid table name: table name must start with listing_publish_';
  END IF;
  
  -- Truncate the table (removes all rows)
  EXECUTE format('TRUNCATE TABLE %I', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION truncate_publish_table(TEXT) TO service_role;
