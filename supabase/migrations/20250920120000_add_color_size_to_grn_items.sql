-- Migration: Add color_id and size_id to goods_receive_note_items table
-- Created: 2025-09-20
-- Purpose: Enable variant tracking in goods receive notes to maintain data integrity
--          throughout the purchase-to-receive workflow

-- Safety check: Verify table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receive_note_items') THEN
        RAISE EXCEPTION 'Table goods_receive_note_items does not exist';
    END IF;
END $$;

-- Add color_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goods_receive_note_items' AND column_name = 'color_id') THEN
        ALTER TABLE goods_receive_note_items 
        ADD COLUMN color_id VARCHAR(50);
        
        RAISE NOTICE 'Added color_id column to goods_receive_note_items';
    ELSE
        RAISE NOTICE 'Column color_id already exists in goods_receive_note_items';
    END IF;
END $$;

-- Add size_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goods_receive_note_items' AND column_name = 'size_id') THEN
        ALTER TABLE goods_receive_note_items 
        ADD COLUMN size_id VARCHAR(50);
        
        RAISE NOTICE 'Added size_id column to goods_receive_note_items';
    ELSE
        RAISE NOTICE 'Column size_id already exists in goods_receive_note_items';
    END IF;
END $$;

-- Add foreign key constraint for color_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_grn_items_color_id') THEN
        ALTER TABLE goods_receive_note_items
        ADD CONSTRAINT fk_grn_items_color_id 
        FOREIGN KEY (color_id) REFERENCES product_colors(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint fk_grn_items_color_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_grn_items_color_id already exists';
    END IF;
END $$;

-- Add foreign key constraint for size_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_grn_items_size_id') THEN
        ALTER TABLE goods_receive_note_items
        ADD CONSTRAINT fk_grn_items_size_id 
        FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint fk_grn_items_size_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_grn_items_size_id already exists';
    END IF;
END $$;

-- Add performance indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grn_items_color_id') THEN
        CREATE INDEX idx_grn_items_color_id ON goods_receive_note_items(color_id);
        RAISE NOTICE 'Created index idx_grn_items_color_id';
    ELSE
        RAISE NOTICE 'Index idx_grn_items_color_id already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grn_items_size_id') THEN
        CREATE INDEX idx_grn_items_size_id ON goods_receive_note_items(size_id);
        RAISE NOTICE 'Created index idx_grn_items_size_id';
    ELSE
        RAISE NOTICE 'Index idx_grn_items_size_id already exists';
    END IF;
END $$;

-- Verification query
DO $$ 
BEGIN
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'Checking goods_receive_note_items table structure...';
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'goods_receive_note_items' 
AND table_schema = 'public'
AND column_name IN ('color_id', 'size_id')
ORDER BY column_name;

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE '=== Migration Completed Successfully ===';
    RAISE NOTICE 'Added color_id and size_id columns to goods_receive_note_items';
    RAISE NOTICE 'Added foreign key constraints to product_colors and product_sizes';
    RAISE NOTICE 'Added performance indexes for color_id and size_id';
END $$;