-- Function to create a publish table dynamically
CREATE OR REPLACE FUNCTION create_publish_table(
  p_country_id UUID,
  p_category_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_table_name TEXT;
  v_country_id_clean TEXT;
  v_category_id_clean TEXT;
BEGIN
  -- Generate table name (replace dashes with underscores)
  v_country_id_clean := REPLACE(p_country_id::TEXT, '-', '_');
  v_category_id_clean := REPLACE(p_category_id::TEXT, '-', '_');
  v_table_name := 'listing_publish_' || v_country_id_clean || '_' || v_category_id_clean;
  
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
GRANT EXECUTE ON FUNCTION create_publish_table(UUID, UUID) TO service_role;
