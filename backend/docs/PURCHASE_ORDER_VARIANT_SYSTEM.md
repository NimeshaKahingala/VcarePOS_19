# Purchase Orders System - Variant Handling & Stock Management

## Overview

This document outlines the comprehensive improvements made to the purchase orders system to support product variants (colors and sizes) and standardize stock management across the application.

## Implementation Summary

### Database Schema Changes

#### 1. Purchase Order Items Enhancement
- **Migration**: `20250920000000_add_color_size_to_purchase_order_items.sql`
- **Changes**: Added `color_id` and `size_id` columns with foreign key constraints
- **Purpose**: Enable variant tracking in purchase orders

#### 2. Goods Receive Note Items Enhancement  
- **Migration**: `20250920120000_add_color_size_to_grn_items.sql`
- **Changes**: Added `color_id` and `size_id` columns with foreign key constraints
- **Purpose**: Maintain variant information throughout the receive process

### Stock Management Strategy

#### Standardized Stock Update Rules

1. **Raw Materials** (`type = 'material'`)
   - Update: `raw_materials.stock_quantity`
   - Logic: Direct quantity update
   - No variants supported

2. **Products with Size Variants** (`type = 'product'` + `size.id` present)
   - Update: `product_sizes.stock` (granular level)
   - Additional: Recalculate `products.stock` as sum of all variants
   - Logic: Variant-specific inventory tracking

3. **Products without Variants** (`type = 'product'` + no `size.id`)
   - Update: `products.stock` (aggregate level)
   - Logic: Simple product-level inventory

#### Stock Update Implementation

```javascript
// Centralized stock management function
await updateInventoryStock(client, item, quantity, operation);

// Where:
// - client: Database client
// - item: {type, itemId, size?, color?}
// - quantity: Amount to add/subtract
// - operation: 'add' or 'subtract'
```

### Validation Framework

#### Business Rules Enforced

1. **Materials Cannot Have Variants**
   - Raw materials (`type = 'material'`) cannot have `color_id` or `size_id`
   - Validation error returned if attempted

2. **Variant Existence Validation**
   - Color IDs must exist in `product_colors` table
   - Size IDs must exist in `product_sizes` table
   - Validation performed before purchase order creation/update

3. **Required Field Validation**
   - Item ID, type, quantity, and unit price required
   - Quantities and prices must be greater than 0

#### Validation Middleware

```javascript
// Applied to POST and PUT purchase order endpoints
validatePurchaseOrderItemsMiddleware
```

### API Enhancements

#### Purchase Order Endpoints

**POST /api/purchase-orders**
- ✅ Captures color/size variants in items
- ✅ Validates all variants exist
- ✅ Enforces business rules
- ✅ Uses standardized stock management on completion

**PUT /api/purchase-orders/:id**
- ✅ Updates with variant information preserved
- ✅ Validates variant existence
- ✅ Uses standardized stock management on completion

**GET /api/purchase-orders**
- ✅ Returns variant information in items
- ✅ Includes color/size names in response

**GET /api/purchase-orders/:id**
- ✅ Returns full variant information
- ✅ Includes variant details in GRN items

#### Goods Receive Note Enhancements

**POST /api/purchase-orders/:id/receive**
- ✅ Captures variant information from original purchase order
- ✅ Stores variants in GRN items
- ✅ Uses standardized stock management
- ✅ Updates correct inventory tables based on variants

### Data Flow

#### Purchase Order Creation
1. **Input Validation**: Variants existence, business rules
2. **Data Storage**: Purchase order items with `color_id`/`size_id`
3. **Response**: Full variant information included

#### Purchase Order Completion
1. **Stock Update**: Uses `updateInventoryStock()` utility
2. **Variant Handling**: Updates appropriate stock tables
3. **Consistency**: Aggregate product stock maintained

#### Goods Receive Process
1. **Variant Retrieval**: Gets color/size from original purchase order
2. **GRN Storage**: Stores variant information in GRN items
3. **Stock Update**: Uses standardized inventory management
4. **Data Integrity**: Full variant tracking maintained

### Utility Functions

#### Stock Management (`src/utils/stockUtils.js`)

```javascript
// Primary functions
updateInventoryStock(client, item, quantity, operation)
getCurrentStock(client, item)
bulkUpdateInventoryStock(client, items, operation)

// Helper functions
getSafeColorId(item)        // Returns item?.color?.id || null
getSafeSizeId(item)         // Returns item?.size?.id || null
getSafeVariantName(variant) // Returns variant?.name || 'N/A'
validateItemForStockOperation(item)
```

#### Validation (`src/middleware/purchaseOrderValidation.js`)

```javascript
// Validation functions
validatePurchaseOrderItems(items)
validatePurchaseOrderItemsMiddleware  // Express middleware
validateVariantsExist(items)
validateBusinessRules(items)
validateItemsExist(items)
validateVendorInfo(vendor)
```

### Error Handling

#### Null Safety
- All variant access uses safe extraction functions
- Graceful handling of missing variant information
- No null reference errors in production

#### Validation Errors
- Comprehensive error messages with context
- Field-specific validation feedback
- Business rule violation explanations

#### Transaction Safety
- All stock updates wrapped in database transactions
- Automatic rollback on any failure
- Consistent data state maintained

### Testing Considerations

#### Test Scenarios Required

1. **Purchase Order Variants**
   - Create PO with product variants
   - Create PO with materials (no variants)
   - Update PO with variant changes
   - Complete PO with mixed item types

2. **Goods Receive Notes**
   - Receive items with variants
   - Receive partial quantities
   - Receive mixed materials and products

3. **Stock Management**
   - Verify correct stock table updates
   - Test aggregate stock calculations
   - Validate variant-specific inventory

4. **Validation**
   - Test invalid variant IDs
   - Test materials with variants (should fail)
   - Test missing required fields

### Migration Notes

#### Execution Order
1. Execute purchase order items migration first
2. Execute GRN items migration second
3. Deploy updated code
4. Run validation scripts

#### Rollback Strategy
- Both migrations include safety checks
- Can be rolled back if needed
- Data integrity preserved during rollback

### Performance Considerations

#### Database Indexes
- Added indexes on `color_id` and `size_id` columns
- Foreign key constraints provide referential integrity
- Query performance optimized with LEFT JOINs

#### Query Optimization
- Efficient variant data retrieval
- Minimal additional database calls
- Batch operations where possible

### Future Enhancements

#### Potential Improvements
1. **Audit Trail**: Track variant changes in purchase orders
2. **Reporting**: Variant-specific inventory reports
3. **Bulk Operations**: Bulk variant updates
4. **Advanced Validation**: Product-specific variant requirements

#### Extensibility
- Framework supports additional variant types
- Validation system easily extensible
- Stock management can accommodate new item types

## Conclusion

The purchase orders system now provides:
- ✅ Complete variant tracking throughout purchase-to-receive workflow
- ✅ Consistent stock management across all item types
- ✅ Comprehensive validation and business rule enforcement
- ✅ Robust error handling and data integrity
- ✅ Performance-optimized database operations

This implementation ensures data consistency, prevents inventory tracking errors, and provides a solid foundation for future enhancements.

---

*Document Version: 1.0*  
*Last Updated: September 20, 2025*  
*Author: VcarePOS Development Team*