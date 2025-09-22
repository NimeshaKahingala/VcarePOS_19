
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../store/slices/cartSlice';


const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Debug logging for product card rendering
  console.log('E-commerce ProductCard: Rendering product', {
    productId: product.id,
    productName: product.name,
    stock: product.stock,
    hasColors: product.colors && product.colors.length > 0,
    colorsCount: product.colors?.length || 0
  });

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // For products with colors/sizes, redirect to product detail page
    if (product.colors && product.colors.length > 0) {
      navigate(`/products/${product.id}`);
      return;
    }

    // For simple products, add directly to cart
    dispatch(addToCart({
      product,
      quantity: 1,
      selectedColorId: null,
      selectedSize: null
    }));
  };

  const getStockStatus = () => {
    console.log('E-commerce ProductCard: Stock status calculation', {
      productId: product.id,
      stock: product.stock,
      stockType: typeof product.stock
    });
    
    if (product.stock === 0) return { text: 'Out of Stock', color: 'text-red-600' };
    if (product.stock <= 5) return { text: 'Low Stock', color: 'text-orange-600' };
    return { text: 'In Stock', color: 'text-green-600' };
  };

  const stockStatus = getStockStatus();

  return (
    <Link to={`/products/${product.id}`} className="product-card group">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
        <img
          src={product.image || 'https://images.pexels.com/photos/586344/pexels-photo-586344.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={product.name}
          className="h-48 w-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      
      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-primary-600">
            LKR {product.price.toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        </div>
        
        {product.colors && product.colors.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Colors:</span>
              <div className="flex space-x-1">
                {product.colors.slice(0, 4).map(color => (
                  <div
                    key={color.id}
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.colorCode || '#f0f0f0' }}
                    title={color.name}
                  />
                ))}
                {product.colors.length > 4 && (
                  <span className="text-xs text-gray-500">+{product.colors.length - 4}</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
            product.stock === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {product.stock === 0 
            ? 'Out of Stock' 
            : product.colors && product.colors.length > 0
              ? 'Select Options'
              : 'Add to Cart'
          }
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;