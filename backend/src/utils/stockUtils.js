/**
 * Stock Management Utilities
 * 
 * Provides standardized functions for inventory stock updates across the application.
 * This ensures consistency in how different types of items (products, materials, variants)
 * have their stock quantities managed.
 * 
 * Strategy:
 * - Raw materials: Update raw_materials.stock_quantity
 * - Products without variants: Update products.stock (aggregate level)
 * - Products with size variants: Update product_sizes.stock (granular level)
 * 
 * @author VcarePOS System
 * @created 2025-09-20
 */

/**
 * Updates inventory stock for various item types
 * @param {Object} client - Database client
 * @param {Object} item - Item object with type, itemId, and variant info
 * @param {number} quantity - Quantity to add/subtract
 * @param {string} operation - 'add' or 'subtract'
 * @returns {Promise<void>}
 */
async function updateInventoryStock(client, item, quantity, operation = 'add') {
  if (!client) {
    throw new Error('Database client is required');
  }
  
  if (!item || !item.type || !item.itemId) {
    throw new Error('Item must have type and itemId properties');
  }
  
  if (typeof quantity !== 'number' || quantity < 0) {
    throw new Error('Quantity must be a positive number');
  }
  
  const operator = operation === 'add' ? '+' : '-';
  
  try {
    if (item.type === 'material') {
      // Raw materials - update stock_quantity
      await client.query(
        `UPDATE raw_materials SET stock_quantity = stock_quantity ${operator} $1 WHERE id = $2`,
        [quantity, item.itemId]
      );
      
      console.log(`Updated raw material stock: ${item.itemId} ${operation} ${quantity}`);
      
    } else if (item.type === 'product') {
      if (item.size && item.size.id) {
        // Product with size variant - update product_sizes.stock
        await client.query(
          `UPDATE product_sizes SET stock = stock ${operator} $1 WHERE id = $2`,
          [quantity, item.size.id]
        );
        
        console.log(`Updated product size stock: ${item.size.id} ${operation} ${quantity}`);
        
        // Also update aggregate product stock for consistency
        await client.query(
          `UPDATE products SET stock = (
            SELECT COALESCE(SUM(ps.stock), 0) 
            FROM product_sizes ps 
            WHERE ps.product_id = $1
          ) WHERE id = $1`,
          [item.itemId]
        );
        
        console.log(`Updated aggregate product stock for: ${item.itemId}`);
        
      } else {
        // Product without variants - update products.stock
        await client.query(
          `UPDATE products SET stock = stock ${operator} $1 WHERE id = $2`,
          [quantity, item.itemId]
        );
        
        console.log(`Updated product stock: ${item.itemId} ${operation} ${quantity}`);
      }
    } else {
      throw new Error(`Unknown item type: ${item.type}`);
    }
    
  } catch (error) {
    console.error(`Error updating stock for item ${item.itemId}:`, error.message);
    throw error;
  }
}

/**
 * Safely extracts color ID from item object
 * @param {Object} item - Item object
 * @returns {string|null} Color ID or null
 */
function getSafeColorId(item) {
  return item?.color?.id || null;
}

/**
 * Safely extracts size ID from item object
 * @param {Object} item - Item object
 * @returns {string|null} Size ID or null
 */
function getSafeSizeId(item) {
  return item?.size?.id || null;
}

/**
 * Safely extracts variant name from variant object
 * @param {Object} variant - Variant object (color or size)
 * @returns {string} Variant name or 'N/A'
 */
function getSafeVariantName(variant) {
  return variant?.name || 'N/A';
}

/**
 * Validates that an item has the required properties for stock operations
 * @param {Object} item - Item object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateItemForStockOperation(item) {
  if (!item) {
    throw new Error('Item is required');
  }
  
  if (!item.type) {
    throw new Error('Item type is required');
  }
  
  if (!item.itemId) {
    throw new Error('Item itemId is required');
  }
  
  if (!['product', 'material'].includes(item.type)) {
    throw new Error(`Invalid item type: ${item.type}. Must be 'product' or 'material'`);
  }
  
  // If it's a product with a size, validate size structure
  if (item.type === 'product' && item.size && !item.size.id) {
    throw new Error('Product with size variant must have size.id');
  }
  
  return true;
}

/**
 * Bulk stock update for multiple items
 * @param {Object} client - Database client
 * @param {Array} items - Array of items to update
 * @param {string} operation - 'add' or 'subtract'
 * @returns {Promise<Array>} Array of update results
 */
async function bulkUpdateInventoryStock(client, items, operation = 'add') {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  const results = [];
  
  for (const item of items) {
    try {
      validateItemForStockOperation(item);
      await updateInventoryStock(client, item, item.quantity || 0, operation);
      results.push({ success: true, itemId: item.itemId });
    } catch (error) {
      console.error(`Failed to update stock for item ${item.itemId}:`, error.message);
      results.push({ success: false, itemId: item.itemId, error: error.message });
    }
  }
  
  return results;
}

/**
 * Gets current stock level for an item
 * @param {Object} client - Database client
 * @param {Object} item - Item object
 * @returns {Promise<number>} Current stock level
 */
async function getCurrentStock(client, item) {
  validateItemForStockOperation(item);
  
  if (item.type === 'material') {
    const result = await client.query(
      'SELECT stock_quantity FROM raw_materials WHERE id = $1',
      [item.itemId]
    );
    return result.rows[0]?.stock_quantity || 0;
    
  } else if (item.type === 'product') {
    if (item.size && item.size.id) {
      const result = await client.query(
        'SELECT stock FROM product_sizes WHERE id = $1',
        [item.size.id]
      );
      return result.rows[0]?.stock || 0;
    } else {
      const result = await client.query(
        'SELECT stock FROM products WHERE id = $1',
        [item.itemId]
      );
      return result.rows[0]?.stock || 0;
    }
  }
  
  return 0;
}

module.exports = {
  updateInventoryStock,
  getSafeColorId,
  getSafeSizeId,
  getSafeVariantName,
  validateItemForStockOperation,
  bulkUpdateInventoryStock,
  getCurrentStock
};