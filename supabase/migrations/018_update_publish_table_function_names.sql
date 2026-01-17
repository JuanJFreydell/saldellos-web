-- Update function to create publish tables using country and category names instead of IDs
CREATE OR REPLACE FUNCTION create_publish_table(
  p_country_name TEXT,
  p_category_name TEXT
) RETURNS TEXT AS $$
DECLARE
  v_table_name TEXT;
  v_country_name_clean TEXT;
  v_category_name_clean TEXT;
BEGIN
  -- Sanitize names for table names: lowercase first, then replace non-alphanumeric with underscores
  -- IMPORTANT: LOWER must be applied BEFORE REGEXP_REPLACE, otherwise uppercase letters get removed
  v_country_name_clean := REGEXP_REPLACE(LOWER(p_country_name), '[^a-z0-9]', '_', 'g');
  v_category_name_clean := REGEXP_REPLACE(LOWER(p_category_name), '[^a-z0-9]', '_', 'g');
  
  -- Remove multiple consecutive underscores
  v_country_name_clean := REGEXP_REPLACE(v_country_name_clean, '_+', '_', 'g');
  v_category_name_clean := REGEXP_REPLACE(v_category_name_clean, '_+', '_', 'g');
  
  -- Remove leading/trailing underscores
  v_country_name_clean := TRIM(BOTH '_' FROM v_country_name_clean);
  v_category_name_clean := TRIM(BOTH '_' FROM v_category_name_clean);
  
  v_table_name := 'listing_publish_' || v_country_name_clean || '_' || v_category_name_clean;
  
  -- Create the table if it doesn't exist
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      listing_id UUID PRIMARY KEY,
      description TEXT,
      title TEXT NOT NULL,
      subcategory TEXT,
      category TEXT,
      price TEXT,
      thumbnail TEXT,
      coordinates TEXT,
      neighborhood TEXT,
      city TEXT,
      country TEXT,
      country_id UUID NOT NULL,
      category_id UUID NOT NULL,
      subcategory_id UUID,
      city_id UUID,
      neighborhood_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', v_table_name);
  
  -- Create indexes
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_city ON %I(city_id)', 
    REPLACE(v_table_name, 'listing_publish_', ''), v_table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_neighborhood ON %I(neighborhood_id)', 
    REPLACE(v_table_name, 'listing_publish_', ''), v_table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_title ON %I(title)', 
    REPLACE(v_table_name, 'listing_publish_', ''), v_table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_country_category ON %I(country_id, category_id)', 
    REPLACE(v_table_name, 'listing_publish_', ''), v_table_name);
  
  RETURN v_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION create_publish_table(TEXT, TEXT) TO service_role;
