/**
 * Purchase Order Validation Middleware
 * 
 * Provides validation functions for purchase order operations including
 * variant validation, business rule enforcement, and data integrity checks.
 * 
 * @author VcarePOS System
 * @created 2025-09-20
 */

const { pool } = require('../utils/db');

/**
 * Validates that color and size variants exist in the database
 * @param {Array} items - Array of purchase order items
 * @returns {Promise<Array>} Array of validation errors (empty if valid)
 */
async function validateVariantsExist(items) {
  const errors = [];
  const client = await pool.connect();
  
  try {
    for (const item of items) {
      // Validate color exists if specified
      if (item.color && item.color.id) {
        const colorResult = await client.query(
          'SELECT id, name FROM product_colors WHERE id = $1',
          [item.color.id]
        );
        
        if (colorResult.rows.length === 0) {
          errors.push({
            field: 'color',
            value: item.color.id,
            message: `Color '${item.color.id}' does not exist`,
            itemId: item.itemId
          });
        }
      }
      
      // Validate size exists if specified
      if (item.size && item.size.id) {
        const sizeResult = await client.query(
          'SELECT id, name FROM product_sizes WHERE id = $1',
          [item.size.id]
        );
        
        if (sizeResult.rows.length === 0) {
          errors.push({
            field: 'size',
            value: item.size.id,
            message: `Size '${item.size.id}' does not exist`,
            itemId: item.itemId
          });
        }
      }
    }
  } finally {
    client.release();
  }
  
  return errors;
}

/**
 * Validates business rules for purchase order items
 * @param {Array} items - Array of purchase order items
 * @returns {Array} Array of validation errors (empty if valid)
 */
function validateBusinessRules(items) {
  const errors = [];
  
  for (const item of items) {
    // Business rule: materials should not have variants
    if (item.type === 'material') {
      if (item.color && item.color.id) {
        errors.push({
          field: 'color',
          message: 'Raw materials cannot have color variants',
          itemId: item.itemId,
          itemType: item.type
        });
      }
      
      if (item.size && item.size.id) {
        errors.push({
          field: 'size',
          message: 'Raw materials cannot have size variants',
          itemId: item.itemId,
          itemType: item.type
        });
      }
    }
    
    // Validate required fields
    if (!item.itemId) {
      errors.push({
        field: 'itemId',
        message: 'Item ID is required',
        itemId: item.itemId
      });
    }
    
    if (!item.type || !['product', 'material'].includes(item.type)) {
      errors.push({
        field: 'type',
        message: 'Item type must be either "product" or "material"',
        itemId: item.itemId
      });
    }
    
    if (!item.quantity || item.quantity <= 0) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be greater than 0',
        itemId: item.itemId
      });
    }
    
    if (!item.unitPrice || item.unitPrice <= 0) {
      errors.push({
        field: 'unitPrice',
        message: 'Unit price must be greater than 0',
        itemId: item.itemId
      });
    }
  }
  
  return errors;
}

/**
 * Validates that products exist in the database
 * @param {Array} items - Array of purchase order items
 * @returns {Promise<Array>} Array of validation errors (empty if valid)
 */
async function validateItemsExist(items) {
  const errors = [];
  const client = await pool.connect();
  
  try {
    for (const item of items) {
      if (item.type === 'product') {
        const productResult = await client.query(
          'SELECT id, name FROM products WHERE id = $1',
          [item.itemId]
        );
        
        if (productResult.rows.length === 0) {
          errors.push({
            field: 'itemId',
            value: item.itemId,
            message: `Product '${item.itemId}' does not exist`,
            itemId: item.itemId
          });
        }
      } else if (item.type === 'material') {
        const materialResult = await client.query(
          'SELECT id, name FROM raw_materials WHERE id = $1',
          [item.itemId]
        );
        
        if (materialResult.rows.length === 0) {
          errors.push({
            field: 'itemId',
            value: item.itemId,
            message: `Raw material '${item.itemId}' does not exist`,
            itemId: item.itemId
          });
        }
      }
    }
  } finally {
    client.release();
  }
  
  return errors;
}

/**
 * Comprehensive validation for purchase order items
 * @param {Array} items - Array of purchase order items
 * @returns {Promise<Object>} Validation result with isValid and errors
 */
async function validatePurchaseOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      errors: [{ message: 'Items array is required and cannot be empty' }]
    };
  }
  
  // Run all validations
  const businessRuleErrors = validateBusinessRules(items);
  const itemExistenceErrors = await validateItemsExist(items);
  const variantErrors = await validateVariantsExist(items);
  
  // Combine all errors
  const allErrors = [
    ...businessRuleErrors,
    ...itemExistenceErrors,
    ...variantErrors
  ];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Express middleware for validating purchase order items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePurchaseOrderItemsMiddleware = async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!items) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Items are required',
        errors: []
      });
    }
    
    const validation = await validatePurchaseOrderItems(items);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'One or more items failed validation',
        errors: validation.errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    return res.status(500).json({
      error: 'Validation error',
      message: 'An error occurred during validation'
    });
  }
};

/**
 * Validates vendor information
 * @param {Object} vendor - Vendor information
 * @returns {Array} Array of validation errors (empty if valid)
 */
function validateVendorInfo(vendor) {
  const errors = [];
  
  if (!vendor.vendorName || vendor.vendorName.trim().length === 0) {
    errors.push({
      field: 'vendorName',
      message: 'Vendor name is required'
    });
  }
  
  if (vendor.vendorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.vendorEmail)) {
    errors.push({
      field: 'vendorEmail',
      message: 'Vendor email must be a valid email address'
    });
  }
  
  if (vendor.vendorPhone && !/^[\+]?[\d\s\-\(\)]+$/.test(vendor.vendorPhone)) {
    errors.push({
      field: 'vendorPhone',
      message: 'Vendor phone must be a valid phone number'
    });
  }
  
  return errors;
}

module.exports = {
  validatePurchaseOrderItems,
  validatePurchaseOrderItemsMiddleware,
  validateVariantsExist,
  validateBusinessRules,
  validateItemsExist,
  validateVendorInfo
};