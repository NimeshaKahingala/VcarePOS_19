/*
  # Update User Permissions Migration
  
  This migration updates existing users' permissions to include the new 
  'ecommerce-orders' module that was added after the initial user creation.
  
  1. Changes
    - Add 'ecommerce-orders' permissions to all existing users based on their roles
    - Admin: full access (view, edit, delete)
    - Manager: view only (no edit, no delete) 
    - Cashier: view only (no edit, no delete)
  
  2. Safety
    - Uses JSON operations to safely merge new permissions
    - Preserves any existing custom permissions
    - Only updates users that don't already have ecommerce-orders permissions
  
  3. Rollback
    - Includes rollback commands to remove ecommerce-orders permissions
*/

-- Add ecommerce-orders permissions to admin users
UPDATE users 
SET permissions = permissions || '{"ecommerce-orders": {"view": true, "edit": true, "delete": true}}'::jsonb
WHERE role = 'admin' 
  AND (permissions->>'ecommerce-orders' IS NULL OR permissions->'ecommerce-orders' IS NULL);

-- Add ecommerce-orders permissions to manager users  
UPDATE users 
SET permissions = permissions || '{"ecommerce-orders": {"view": true, "edit": false, "delete": false}}'::jsonb
WHERE role = 'manager' 
  AND (permissions->>'ecommerce-orders' IS NULL OR permissions->'ecommerce-orders' IS NULL);

-- Add ecommerce-orders permissions to cashier users
UPDATE users 
SET permissions = permissions || '{"ecommerce-orders": {"view": true, "edit": false, "delete": false}}'::jsonb
WHERE role = 'cashier' 
  AND (permissions->>'ecommerce-orders' IS NULL OR permissions->'ecommerce-orders' IS NULL);

-- Log the migration in audit trail
INSERT INTO audit_trail (
  id, user_id, user_name, action, module, description, details, timestamp
) VALUES (
  'AUDIT-' || EXTRACT(EPOCH FROM NOW())::text,
  'SYSTEM',
  'Migration System',
  'UPDATE',
  'user-management',
  'Updated user permissions to include ecommerce-orders module',
  '{"migration": "20250919120000_update_user_permissions", "affected_users": "all users by role"}'::jsonb,
  CURRENT_TIMESTAMP
);

-- Verify the update was successful
DO $$
DECLARE
  admin_count INTEGER;
  manager_count INTEGER;
  cashier_count INTEGER;
BEGIN
  -- Count users with ecommerce-orders permissions by role
  SELECT COUNT(*) INTO admin_count 
  FROM users 
  WHERE role = 'admin' AND permissions->'ecommerce-orders' IS NOT NULL;
  
  SELECT COUNT(*) INTO manager_count 
  FROM users 
  WHERE role = 'manager' AND permissions->'ecommerce-orders' IS NOT NULL;
  
  SELECT COUNT(*) INTO cashier_count 
  FROM users 
  WHERE role = 'cashier' AND permissions->'ecommerce-orders' IS NOT NULL;
  
  -- Log verification results
  RAISE NOTICE 'Permission update completed: Admin users: %, Manager users: %, Cashier users: %', 
    admin_count, manager_count, cashier_count;
END $$;

/*
  ROLLBACK COMMANDS (for reference, not executed):
  
  -- Remove ecommerce-orders permissions from all users
  UPDATE users SET permissions = permissions - 'ecommerce-orders';
  
  -- Remove audit trail entry
  DELETE FROM audit_trail WHERE description LIKE '%ecommerce-orders module%';
*/