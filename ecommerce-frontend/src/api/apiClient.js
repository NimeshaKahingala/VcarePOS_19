const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('ecommerce_token');
};

// Helper function to make authenticated requests
const makeRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Clear token if unauthorized
    localStorage.removeItem('ecommerce_token');
    throw new Error('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Auth API
export const authApi = {
  register: async (userData) => {
    return makeRequest('/ecommerce/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  login: async (credentials) => {
    return makeRequest('/ecommerce/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  getCurrentCustomer: async () => {
    return makeRequest('/ecommerce/auth/me');
  },
};

// Products API
export const productsApi = {
  getAll: async () => {
    console.log('E-commerce API: Making request to /ecommerce/products');
    const result = await makeRequest('/ecommerce/products');
    console.log('E-commerce API: Received products response', {
      productCount: result.length,
      sampleProduct: result[0] ? {
        id: result[0].id,
        name: result[0].name,
        stock: result[0].stock,
        colorsCount: result[0].colors?.length || 0
      } : null
    });
    return result;
  },
  
  getById: async (productId) => {
    return makeRequest(`/ecommerce/products/${productId}`);
  },
};

// Orders API
export const ordersApi = {
  create: async (orderData, receiptDetails = null) => {
    const payload = { ...orderData };
    if (receiptDetails) {
      payload.receiptDetails = receiptDetails;
    }
    
    return makeRequest('/ecommerce/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  
  uploadTemporaryReceipt: async (file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    
    const token = getAuthToken();
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/ecommerce/receipts/temp-upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (response.status === 401) {
      localStorage.removeItem('ecommerce_token');
      throw new Error('Session expired. Please log in again.');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  getCustomerOrders: async (customerId) => {
    return makeRequest(`/ecommerce/users/${customerId}/orders`);
  },
  
  getById: async (orderId) => {
    return makeRequest(`/ecommerce/orders/${orderId}`);
  },
};