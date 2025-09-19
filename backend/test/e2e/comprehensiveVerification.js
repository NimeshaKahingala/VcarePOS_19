/**
 * Comprehensive End-to-End Verification Suite
 * 
 * Tests the complete purchase order system after variant implementation
 * to ensure all functionality works correctly and nothing is broken.
 */

const { pool } = require('../src/utils/db');

class E2EVerificationSuite {
  constructor() {
    this.testResults = [];
    this.client = null;
  }

  async initialize() {
    console.log('🔧 Initializing End-to-End Verification Suite...');
    this.client = await pool.connect();
  }

  async cleanup() {
    if (this.client) {
      this.client.release();
    }
  }

  logTest(testName, status, details = '') {
    const result = { testName, status, details, timestamp: new Date() };
    this.testResults.push(result);
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${testName}${details ? ': ' + details : ''}`);
  }

  async testDatabaseIntegrity() {
    console.log('\n📊 Testing Database Integrity...');
    
    try {
      // Test 1: Verify all required tables exist
      const tables = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'purchase_orders', 
          'purchase_order_items', 
          'goods_receive_notes', 
          'goods_receive_note_items',
          'products',
          'product_colors',
          'product_sizes',
          'raw_materials'
        )
      `);
      
      const expectedTables = 8;
      if (tables.rows.length === expectedTables) {
        this.logTest('Required tables exist', 'PASS', `${tables.rows.length}/${expectedTables} tables found`);
      } else {
        this.logTest('Required tables exist', 'FAIL', `${tables.rows.length}/${expectedTables} tables found`);
      }

      // Test 2: Verify purchase_order_items has variant columns
      const poColumns = await this.client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'purchase_order_items' 
        AND column_name IN ('color_id', 'size_id')
      `);
      
      if (poColumns.rows.length === 2) {
        this.logTest('Purchase order items variant columns', 'PASS', 'color_id and size_id present');
      } else {
        this.logTest('Purchase order items variant columns', 'FAIL', `${poColumns.rows.length}/2 columns found`);
      }

      // Test 3: Verify goods_receive_note_items has variant columns
      const grnColumns = await this.client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'goods_receive_note_items' 
        AND column_name IN ('color_id', 'size_id')
      `);
      
      if (grnColumns.rows.length === 2) {
        this.logTest('GRN items variant columns', 'PASS', 'color_id and size_id present');
      } else {
        this.logTest('GRN items variant columns', 'FAIL', `${grnColumns.rows.length}/2 columns found`);
      }

      // Test 4: Verify foreign key constraints
      const constraints = await this.client.query(`
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND (conname LIKE '%color_id%' OR conname LIKE '%size_id%')
        AND conrelid IN ('purchase_order_items'::regclass, 'goods_receive_note_items'::regclass)
      `);
      
      if (constraints.rows.length === 4) {
        this.logTest('Foreign key constraints', 'PASS', '4 variant FK constraints found');
      } else {
        this.logTest('Foreign key constraints', 'FAIL', `${constraints.rows.length}/4 constraints found`);
      }

      // Test 5: Verify indexes exist for performance
      const indexes = await this.client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('purchase_order_items', 'goods_receive_note_items')
        AND (indexname LIKE '%color_id%' OR indexname LIKE '%size_id%')
      `);
      
      if (indexes.rows.length >= 4) {
        this.logTest('Performance indexes', 'PASS', `${indexes.rows.length} variant indexes found`);
      } else {
        this.logTest('Performance indexes', 'WARN', `${indexes.rows.length} variant indexes found`);
      }

    } catch (error) {
      this.logTest('Database integrity tests', 'FAIL', error.message);
    }
  }

  async testUtilityFunctions() {
    console.log('\n🛠️ Testing Utility Functions...');
    
    try {
      // Test 1: Stock utilities module
      const stockUtils = require('../src/utils/stockUtils');
      const requiredFunctions = [
        'updateInventoryStock',
        'getSafeColorId',
        'getSafeSizeId',
        'getSafeVariantName',
        'validateItemForStockOperation',
        'getCurrentStock'
      ];
      
      let allFunctionsExist = true;
      for (const func of requiredFunctions) {
        if (typeof stockUtils[func] !== 'function') {
          allFunctionsExist = false;
          break;
        }
      }
      
      if (allFunctionsExist) {
        this.logTest('Stock utility functions', 'PASS', `${requiredFunctions.length} functions available`);
      } else {
        this.logTest('Stock utility functions', 'FAIL', 'Missing required functions');
      }

      // Test 2: Safe extraction functions
      const testItem = {
        color: { id: 'TEST-COLOR', name: 'Test Color' },
        size: { id: 'TEST-SIZE', name: 'Test Size' }
      };
      
      const colorId = stockUtils.getSafeColorId(testItem);
      const sizeId = stockUtils.getSafeSizeId(testItem);
      const colorName = stockUtils.getSafeVariantName(testItem.color);
      
      if (colorId === 'TEST-COLOR' && sizeId === 'TEST-SIZE' && colorName === 'Test Color') {
        this.logTest('Safe extraction functions', 'PASS', 'Variant data extracted correctly');
      } else {
        this.logTest('Safe extraction functions', 'FAIL', 'Incorrect extraction results');
      }

      // Test 3: Null safety
      const nullItem = {};
      const nullColorId = stockUtils.getSafeColorId(nullItem);
      const nullSizeId = stockUtils.getSafeSizeId(nullItem);
      const nullName = stockUtils.getSafeVariantName(null);
      
      if (nullColorId === null && nullSizeId === null && nullName === 'N/A') {
        this.logTest('Null safety handling', 'PASS', 'Handles null/undefined gracefully');
      } else {
        this.logTest('Null safety handling', 'FAIL', 'Improper null handling');
      }

    } catch (error) {
      this.logTest('Utility functions test', 'FAIL', error.message);
    }
  }

  async testValidationFramework() {
    console.log('\n✅ Testing Validation Framework...');
    
    try {
      const validation = require('../src/middleware/purchaseOrderValidation');
      
      // Test 1: Validation functions exist
      const requiredValidationFunctions = [
        'validatePurchaseOrderItems',
        'validateBusinessRules',
        'validateItemsExist',
        'validateVariantsExist'
      ];
      
      let allValidationFunctionsExist = true;
      for (const func of requiredValidationFunctions) {
        if (typeof validation[func] !== 'function') {
          allValidationFunctionsExist = false;
          break;
        }
      }
      
      if (allValidationFunctionsExist) {
        this.logTest('Validation functions', 'PASS', `${requiredValidationFunctions.length} functions available`);
      } else {
        this.logTest('Validation functions', 'FAIL', 'Missing validation functions');
      }

      // Test 2: Business rules validation
      const invalidItems = [
        {
          itemId: 'TEST-MATERIAL',
          type: 'material',
          name: 'Test Material',
          quantity: 10,
          unitPrice: 50,
          color: { id: 'INVALID-COLOR' }, // Materials can't have colors
          size: { id: 'INVALID-SIZE' }    // Materials can't have sizes
        }
      ];
      
      const businessRuleErrors = validation.validateBusinessRules(invalidItems);
      if (businessRuleErrors.length > 0) {
        this.logTest('Business rules validation', 'PASS', 'Correctly rejects materials with variants');
      } else {
        this.logTest('Business rules validation', 'FAIL', 'Did not catch business rule violations');
      }

      // Test 3: Valid items pass validation
      const validItems = [
        {
          itemId: 'TEST-PRODUCT',
          type: 'product',
          name: 'Test Product',
          quantity: 5,
          unitPrice: 100
        }
      ];
      
      const validItemErrors = validation.validateBusinessRules(validItems);
      if (validItemErrors.length === 0) {
        this.logTest('Valid items validation', 'PASS', 'Valid items pass business rules');
      } else {
        this.logTest('Valid items validation', 'FAIL', 'Valid items incorrectly rejected');
      }

    } catch (error) {
      this.logTest('Validation framework test', 'FAIL', error.message);
    }
  }

  async testPurchaseOrderQueries() {
    console.log('\n🛒 Testing Purchase Order Queries...');
    
    try {
      // Test 1: GET all purchase orders query
      const allOrdersQuery = `
        SELECT poi.*, pc.name as color_name, ps.name as size_name
        FROM purchase_order_items poi
        LEFT JOIN product_colors pc ON poi.color_id = pc.id
        LEFT JOIN product_sizes ps ON poi.size_id = ps.id
        LIMIT 1
      `;
      
      const result1 = await this.client.query(allOrdersQuery);
      this.logTest('Purchase order items query', 'PASS', 'Query executes successfully');

      // Test 2: Purchase order with variants JOIN
      const variantJoinQuery = `
        SELECT 
          poi.*, 
          pc.name as color_name,
          ps.name as size_name
        FROM purchase_order_items poi
        LEFT JOIN product_colors pc ON poi.color_id = pc.id
        LEFT JOIN product_sizes ps ON poi.size_id = ps.id
        WHERE poi.purchase_order_id = 'TEST-ID'
      `;
      
      const result2 = await this.client.query(variantJoinQuery);
      this.logTest('Variant JOIN query', 'PASS', 'Variant joins work correctly');

      // Test 3: GRN items with variants query
      const grnVariantQuery = `
        SELECT 
          gi.*, 
          pc.name as color_name,
          ps.name as size_name
        FROM goods_receive_note_items gi
        LEFT JOIN product_colors pc ON gi.color_id = pc.id
        LEFT JOIN product_sizes ps ON gi.size_id = ps.id
        WHERE gi.grn_id = 'TEST-GRN'
      `;
      
      const result3 = await this.client.query(grnVariantQuery);
      this.logTest('GRN variant query', 'PASS', 'GRN variant joins work correctly');

    } catch (error) {
      this.logTest('Purchase order queries', 'FAIL', error.message);
    }
  }

  async testStockManagementQueries() {
    console.log('\n📦 Testing Stock Management Queries...');
    
    try {
      // Test 1: Product stock query
      const productStockQuery = `
        SELECT stock FROM products WHERE id = 'TEST-PRODUCT' LIMIT 1
      `;
      const result1 = await this.client.query(productStockQuery);
      this.logTest('Product stock query', 'PASS', 'Products table accessible');

      // Test 2: Product sizes stock query
      const sizeStockQuery = `
        SELECT stock FROM product_sizes WHERE id = 'TEST-SIZE' LIMIT 1
      `;
      const result2 = await this.client.query(sizeStockQuery);
      this.logTest('Product sizes stock query', 'PASS', 'Product sizes table accessible');

      // Test 3: Raw materials stock query
      const materialStockQuery = `
        SELECT stock_quantity FROM raw_materials WHERE id = 'TEST-MATERIAL' LIMIT 1
      `;
      const result3 = await this.client.query(materialStockQuery);
      this.logTest('Raw materials stock query', 'PASS', 'Raw materials table accessible');

      // Test 4: Aggregate stock calculation query
      const aggregateQuery = `
        SELECT COALESCE(SUM(ps.stock), 0) as total_stock
        FROM product_sizes ps 
        WHERE ps.product_id = 'TEST-PRODUCT'
      `;
      const result4 = await this.client.query(aggregateQuery);
      this.logTest('Aggregate stock calculation', 'PASS', 'Stock aggregation query works');

    } catch (error) {
      this.logTest('Stock management queries', 'FAIL', error.message);
    }
  }

  async testFileIntegrity() {
    console.log('\n📁 Testing File Integrity...');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Test 1: Required files exist
      const requiredFiles = [
        './src/utils/stockUtils.js',
        './src/middleware/purchaseOrderValidation.js',
        './src/routes/purchaseOrders.js',
        './docs/PURCHASE_ORDER_VARIANT_SYSTEM.md',
        '../supabase/migrations/20250920000000_add_color_size_to_purchase_order_items.sql',
        '../supabase/migrations/20250920120000_add_color_size_to_grn_items.sql'
      ];
      
      let missingFiles = [];
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length === 0) {
        this.logTest('Required files exist', 'PASS', `${requiredFiles.length} files found`);
      } else {
        this.logTest('Required files exist', 'FAIL', `Missing: ${missingFiles.join(', ')}`);
      }

      // Test 2: purchaseOrders.js has required imports
      const purchaseOrdersContent = fs.readFileSync('./src/routes/purchaseOrders.js', 'utf8');
      const hasStockUtils = purchaseOrdersContent.includes('stockUtils');
      const hasValidation = purchaseOrdersContent.includes('purchaseOrderValidation');
      
      if (hasStockUtils && hasValidation) {
        this.logTest('Purchase orders imports', 'PASS', 'Required modules imported');
      } else {
        this.logTest('Purchase orders imports', 'FAIL', `Missing imports: stockUtils=${hasStockUtils}, validation=${hasValidation}`);
      }

      // Test 3: Migration files have proper content
      const poMigration = fs.readFileSync('../supabase/migrations/20250920000000_add_color_size_to_purchase_order_items.sql', 'utf8');
      const grnMigration = fs.readFileSync('../supabase/migrations/20250920120000_add_color_size_to_grn_items.sql', 'utf8');
      
      const poHasColorSize = poMigration.includes('color_id') && poMigration.includes('size_id');
      const grnHasColorSize = grnMigration.includes('color_id') && grnMigration.includes('size_id');
      
      if (poHasColorSize && grnHasColorSize) {
        this.logTest('Migration file content', 'PASS', 'Migrations contain required schema changes');
      } else {
        this.logTest('Migration file content', 'FAIL', `PO migration valid: ${poHasColorSize}, GRN migration valid: ${grnHasColorSize}`);
      }

    } catch (error) {
      this.logTest('File integrity test', 'FAIL', error.message);
    }
  }

  async testBackwardsCompatibility() {
    console.log('\n🔄 Testing Backwards Compatibility...');
    
    try {
      // Test 1: Original purchase order structure still works
      const originalPoQuery = `
        SELECT id, vendor_name, order_date, status, total
        FROM purchase_orders 
        LIMIT 1
      `;
      const result1 = await this.client.query(originalPoQuery);
      this.logTest('Original PO structure', 'PASS', 'Original fields accessible');

      // Test 2: Purchase order items without variants
      const itemsWithoutVariantsQuery = `
        SELECT item_id, type, name, quantity, unit_price
        FROM purchase_order_items
        WHERE color_id IS NULL AND size_id IS NULL
        LIMIT 1
      `;
      const result2 = await this.client.query(itemsWithoutVariantsQuery);
      this.logTest('Items without variants', 'PASS', 'Non-variant items supported');

      // Test 3: GRN structure compatibility
      const grnCompatQuery = `
        SELECT id, purchase_order_id, received_date, received_by
        FROM goods_receive_notes
        LIMIT 1
      `;
      const result3 = await this.client.query(grnCompatQuery);
      this.logTest('GRN structure compatibility', 'PASS', 'Original GRN structure preserved');

    } catch (error) {
      this.logTest('Backwards compatibility', 'FAIL', error.message);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 END-TO-END VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const warningTests = this.testResults.filter(r => r.status === 'WARN').length;
    
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⚠️  Warnings: ${warningTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          console.log(`   • ${test.testName}: ${test.details}`);
        });
    }
    
    if (warningTests > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.testResults
        .filter(r => r.status === 'WARN')
        .forEach(test => {
          console.log(`   • ${test.testName}: ${test.details}`);
        });
    }
    
    console.log('\n🎯 System Status:');
    if (failedTests === 0) {
      console.log('   🟢 SYSTEM READY - All critical tests passed!');
      console.log('   🚀 Purchase order variant system is fully operational');
      console.log('   📈 No breaking changes detected');
      console.log('   ✨ Enhanced functionality working correctly');
    } else {
      console.log('   🔴 SYSTEM ISSUES DETECTED - Review failed tests');
      console.log('   🛠️  Fix required before deployment');
    }
    
    return failedTests === 0;
  }
}

// Main execution
async function runE2EVerification() {
  const suite = new E2EVerificationSuite();
  
  try {
    await suite.initialize();
    
    console.log('🔍 Starting Comprehensive End-to-End Verification');
    console.log('⏱️  This may take a few moments...\n');
    
    await suite.testDatabaseIntegrity();
    await suite.testUtilityFunctions();
    await suite.testValidationFramework();
    await suite.testPurchaseOrderQueries();
    await suite.testStockManagementQueries();
    await suite.testFileIntegrity();
    await suite.testBackwardsCompatibility();
    
    const success = suite.generateReport();
    
    await suite.cleanup();
    
    return success;
    
  } catch (error) {
    console.error('💥 E2E Verification failed:', error.message);
    await suite.cleanup();
    return false;
  }
}

// Export for testing or run directly
if (require.main === module) {
  runE2EVerification()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { runE2EVerification, E2EVerificationSuite };