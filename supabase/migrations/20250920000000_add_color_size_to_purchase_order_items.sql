/*
  # Add Color and Size Columns to Purchase Order Items
  
  This migration adds color_id and size_id columns to the purchase_order_items table
  to support product variants in purchase orders.
  
  ## Changes Made:
  1. Add color_id column (nullable, references product_colors.id)
  2. Add size_id column (nullable, references product_sizes.id) 
  3. Add foreign key constraints with SET NULL on delete
  
  ## Background:
  The purchase order code is already expecting these columns for JOIN operations
  with product_colors and product_sizes tables. This migration adds the missing
  database schema to match the application code expectations.
  
  ## Safety:
  - Columns are nullable (existing records will have NULL values)
  - Foreign keys use ON DELETE SET NULL (safe deletion behavior)
  - No data migration needed (existing records remain valid)
  
  ## Rollback:
  To rollback this migration:
  ```sql
  ALTER TABLE purchase_order_items 
  DROP CONSTRAINT IF EXISTS purchase_order_items_color_id_fkey;
  
  ALTER TABLE purchase_order_items 
  DROP CONSTRAINT IF EXISTS purchase_order_items_size_id_fkey;
  
  ALTER TABLE purchase_order_items 
  DROP COLUMN IF EXISTS color_id,
  DROP COLUMN IF EXISTS size_id;
  ```
*/

-- Add color_id and size_id columns to purchase_order_items table
ALTER TABLE purchase_order_items 
ADD COLUMN color_id VARCHAR(50),
ADD COLUMN size_id VARCHAR(50);

-- Add foreign key constraint for color_id
-- Check if constraint already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_color_id_fkey'
    AND table_name = 'purchase_order_items'
  ) THEN
    ALTER TABLE purchase_order_items 
    ADD CONSTRAINT purchase_order_items_color_id_fkey 
    FOREIGN KEY (color_id) REFERENCES product_colors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for size_id  
-- Check if constraint already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_size_id_fkey'
    AND table_name = 'purchase_order_items'
  ) THEN
    ALTER TABLE purchase_order_items 
    ADD CONSTRAINT purchase_order_items_size_id_fkey 
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better query performance on the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_color_id 
ON purchase_order_items(color_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_size_id 
ON purchase_order_items(size_id);

-- Verification: Check that the new columns and constraints were created successfully
DO $$
DECLARE
  color_col_exists BOOLEAN;
  size_col_exists BOOLEAN;
  color_fk_exists BOOLEAN;
  size_fk_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' 
    AND column_name = 'color_id'
  ) INTO color_col_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' 
    AND column_name = 'size_id'
  ) INTO size_col_exists;
  
  -- Check if foreign keys exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_color_id_fkey'
    AND table_name = 'purchase_order_items'
  ) INTO color_fk_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_size_id_fkey'
    AND table_name = 'purchase_order_items'
  ) INTO size_fk_exists;
  
  -- Report results
  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '- color_id column added: %', color_col_exists;
  RAISE NOTICE '- size_id column added: %', size_col_exists;
  RAISE NOTICE '- color_id foreign key added: %', color_fk_exists;
  RAISE NOTICE '- size_id foreign key added: %', size_fk_exists;
  
  IF color_col_exists AND size_col_exists AND color_fk_exists AND size_fk_exists THEN
    RAISE NOTICE 'Migration completed successfully!';
  ELSE
    RAISE WARNING 'Migration may not have completed successfully. Please check the results above.';
  END IF;
END $$;