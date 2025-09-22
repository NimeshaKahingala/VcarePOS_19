import React, { useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Space,
  Select,
  Input,
  message,
} from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts } from '../../features/products/productsSlice';
import { fetchCategories } from '../../features/categories/categoriesSlice';
import { ProductCard } from '../common/ProductCard';
import { ActionButton } from '../common/ActionButton';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { CustomProductModal } from './CustomProductModal';
import { ProductAddonsModal } from './ProductAddonsModal';
import { ColorAndSizeSelectionModal } from './ColorAndSizeSelectionModal';
import { BarcodeSimulator } from './BarcodeSimulator';
import { addToCart } from '../../features/cart/cartSlice';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { BARCODE_SCANNER_CONFIG, DEFAULT_SCANNER_OPTIONS } from '../../config/barcodeConfig';

const { Option } = Select;
const { Search } = Input;

export function ProductGrid({ collapsed }) {
  const dispatch = useDispatch();
  const products = useSelector(state => state.products.productsList);
  const categories = useSelector(state => state.categories.categoriesList);
  const loading = useSelector(state => state.products.loading || state.categories.loading);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showColorSizeModal, setShowColorSizeModal] = useState(false);
  const [showCustomProductModal, setShowCustomProductModal] = useState(false);
  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [showBarcodeSimulator, setShowBarcodeSimulator] = useState(false);

  // Barcode scanner functionality
  const findProductByBarcode = useCallback((barcode) => {
    if (!Array.isArray(products)) return null;
    
    // Search for product by barcode (including variants)
    return products.find(product => 
      product.barcode === barcode || 
      product.sku === barcode ||
      (product.variants && product.variants.some(variant => 
        variant.barcode === barcode || variant.sku === barcode
      ))
    );
  }, [products]);

  const handleAddToCart = useCallback((product) => {
    if (product.colors && product.colors.length > 0) {
      // Show color and size selection modal
      setSelectedProduct(product);
      setShowColorSizeModal(true);
    } else if (product.isCustom) {
      dispatch(addToCart({ product }));
    } else {
      setSelectedProduct(product);
      setShowAddonsModal(true);
    }
  }, [dispatch]);

  const handleBarcodeScanned = useCallback((barcode) => {
    console.log('Barcode scanned:', barcode);
    
    const product = findProductByBarcode(barcode);
    
    if (product) {
      message.success(`Product found: ${product.name}`);
      handleAddToCart(product);
    } else {
      message.warning(`No product found with barcode: ${barcode}`);
    }
  }, [findProductByBarcode, handleAddToCart]);

  const handleScannerError = useCallback((error) => {
    console.error('Barcode scanner error:', error);
    message.error('Barcode scanner error: ' + error.message);
  }, []);

  // Initialize barcode scanner
  const { status: scannerStatus } = useBarcodeScanner({
    ...DEFAULT_SCANNER_OPTIONS,
    onScan: handleBarcodeScanned,
    onError: handleScannerError
  });

  React.useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Get categories from state, including only active ones
  const activeCategories = Array.isArray(categories) ? categories.filter(cat => cat?.isActive) : [];
  const categoryNames = ['All', ...activeCategories.map(cat => cat.name)];
  
  // Filter products
  const filteredProducts = Array.isArray(products) ? products
    .filter(product => {
      // Skip variants as they'll be shown through their parent product
      if (product.isVariant) return false;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }) : [];

  const handleColorAndSizeSelected = (selectedColor, selectedSize, _selectedSizeData) => {
    // Close color/size modal
    setShowColorSizeModal(false);
    
    // Create product with selected color and size
    const productWithColorAndSize = {
      ...selectedProduct,
      selectedColorId: selectedColor.id,
      selectedColor: selectedColor,
      selectedSize: selectedSize.name,
      selectedSizeData: selectedSize,
      // Use the raw materials from the selected color
      rawMaterials: selectedSize?.rawMaterials || []
    };
    
    // Show addons modal for the selected color/size combination
    setSelectedProduct(productWithColorAndSize);
    setShowAddonsModal(true);
  };

  const handleAddToCartWithAddons = (productWithAddons, quantity = 1) => {
    dispatch(addToCart({ 
      product: productWithAddons, 
      quantity,
      selectedColorId: productWithAddons.selectedColorId,
      selectedSize: productWithAddons.selectedSize,
      addons: productWithAddons.addons
    }));
  };

  const handleAddCustomProduct = (customProduct) => {
    addToCart(customProduct);
  };

  // Determine grid columns based on sidebar state
  const getColSpan = () => {
    if (collapsed) {
      // When collapsed, show 4 products per row
      return { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
    } else {
      // When expanded, show 3 products per row
      return { xs: 24, sm: 12, md: 8, lg: 8, xl: 8 };
    }
  };

  if (loading) {
    return (
      <Card 
        className="h-full"
        bodyStyle={{ padding: 0, height: 'calc(100vh - 200px)' }}
      >
        <div className="p-4">
          <LoadingSkeleton type="product-grid" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="h-full"
        bodyStyle={{ padding: 0, height: 'calc(100vh - 200px)' }}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold m-0">Products</h2>
              {/* Scanner status indicator */}
              {BARCODE_SCANNER_CONFIG.ENABLED && (
                <div className="text-sm text-gray-500 mt-1">
                  Scanner: <span className={`font-medium ${
                    scannerStatus === 'idle' ? 'text-green-600' :
                    scannerStatus === 'scanning' ? 'text-blue-600' :
                    scannerStatus === 'processing' ? 'text-yellow-600' :
                    scannerStatus === 'error' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {scannerStatus}
                  </span>
                </div>
              )}
            </div>
            <Space>
              <Search
                placeholder="Search by product name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={setSearchTerm}
                className="w-80"
                size="large"
              />
              {/* Barcode simulator for testing */}
              {BARCODE_SCANNER_CONFIG.ENABLED && (
                <ActionButton.Primary 
                  size="large"
                  onClick={() => setShowBarcodeSimulator(true)}
                  title="Open barcode scanner simulator for testing"
                >
                  Scanner Test
                </ActionButton.Primary>
              )}
              <ActionButton.Primary 
                size="large"
                icon="add"
                onClick={() => setShowCustomProductModal(true)}
              >
                Custom Product
              </ActionButton.Primary>
            </Space>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pt-4 border-b border-gray-200">
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="w-48"
            size="large"
          >
            {categoryNames.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
        </div>

        {/* Product Grid */}
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="No Products Found"
              description={
                searchTerm ? 
                  `No products found for "${searchTerm}"` : 
                  selectedCategory === 'All' ? 
                    'No products available' : 
                    `No products found in "${selectedCategory}" category`
              }
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredProducts.map((product) => (
                <Col key={product.id} {...getColSpan()}>
                  <ProductCard
                    product={{
                      ...product,
                      price: product.price,
                      hasColors: product.colors && product.colors.length > 0
                    }}
                    onAddToCart={handleAddToCart}
                    onClick={() => handleAddToCart(product)}
                    showDetails={true}
                    showPriceRange={false}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Card>

      {/* Color and Size Selection Modal */}
      <ColorAndSizeSelectionModal
        open={showColorSizeModal}
        onClose={() => setShowColorSizeModal(false)}
        product={selectedProduct}
        onColorAndSizeSelected={handleColorAndSizeSelected}
      />

      {/* Custom Product Modal */}
      <CustomProductModal
        open={showCustomProductModal}
        onClose={() => setShowCustomProductModal(false)}
        onAddToCart={handleAddCustomProduct}
      />

      {/* Product Addons Modal */}
      <ProductAddonsModal
        open={showAddonsModal}
        onClose={() => setShowAddonsModal(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCartWithAddons}
      />

      {/* Barcode Scanner Simulator */}
      <BarcodeSimulator
        visible={showBarcodeSimulator}
        onClose={() => setShowBarcodeSimulator(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}