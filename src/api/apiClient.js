/**
 * API client for communicating with the backend
 * Optimized for Redux Saga workflow
 */

// Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 50000; // 50 seconds

/**
 * Creates an error object compatible with Redux Saga error handling
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} originalError - Original error object
 * @returns {Error} - Enhanced error object
 */
const createApiError = (message, statusCode = null, originalError = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isApiError = true;
  
  if (originalError) {
    error.originalError = originalError;
  }
  
  return error;
};

/**
 * Handle authentication error (401) by clearing credentials
 * This is called when an API call returns a 401 Unauthorized error
 * No token refresh is implemented as per requirements
 */
const handleAuthError = () => {
  // Clear auth data from localStorage
  localStorage.removeItem('vcare_token');
  localStorage.removeItem('vcare_token_exp');
  
  // Log the authentication failure
  console.warn('Authentication failed - credentials cleared');
};

/**
 * Make an API request with timeout and enhanced error handling for Sagas
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  // Get token from localStorage
  const token = localStorage.getItem('vcare_token');
  
  try {
    // Set default headers
    const headers = {
      'Content-Type': 'application/json', 
      ...options.headers
    };
    
    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Make request with timeout
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Handle 401 Unauthorized specifically
    if (response.status === 401) {
      handleAuthError();
      throw createApiError(
        'Authentication failed. Please log in again.',
        401
      );
    }
    
    // Parse response
    const data = await response.json();
    
    // Handle error responses from API
    if (!response.ok) {
      console.error(`API request failed for ${endpoint}:`, data);
      throw createApiError(
        data.message || 'Request failed', 
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    // Handle timeout
    if (error.name === 'AbortError') {
      throw createApiError('Request timeout', 408);
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw createApiError('Network error - unable to connect to server', 0);
    }
    
    // If already an API error, just rethrow
    if (error.isApiError) {
      throw error;
    }
    
    // Otherwise, create a new API error
    console.error(`API request error for ${endpoint}:`, error);
    throw createApiError(error.message || 'Something went wrong', null, error);
  }
}

// Auth API
export const authApi = {
  login: async (username, password) => {
    try {
      return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    } catch (error) {
      throw createApiError('Login failed. Please check your credentials and try again.', error.statusCode, error);
    }
  },
  
  logout: async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
      return { success: true };
    } catch (error) {
      console.error('API logout failed:', error);
      // We still return success as we want to clear local auth state regardless
      return { success: true };
    }
  },
  
  getCurrentUser: async () => {
    try {
      return await apiRequest('/auth/me');
    } catch (error) {
      throw createApiError('Failed to get current user. Please log in again.', error.statusCode, error);
    }
  },
  
  changePassword: async (currentPassword, newPassword) => {
    try {
      return await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
    } catch (error) {
      throw createApiError('Failed to change password. Please try again.', error.statusCode, error);
    }
  }
};

// Products API
export const productsApi = {
  getAll: async () => {
    return apiRequest('/products');
  },
  
  getById: async (id) => {
    return apiRequest(`/products/${id}`);
  },
  
  create: async (product) => {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  },
  
  update: async (id, product) => {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  },
  
  updateStock: async (id, quantity, operation, selectedSize) => {
    return apiRequest(`/products/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, operation, selectedSize })
    });
  }
};

// Raw Materials API
export const rawMaterialsApi = {
  getAll: async () => {
    return apiRequest('/raw-materials');
  },
  
  getById: async (id) => {
    return apiRequest(`/raw-materials/${id}`);
  },
  
  create: async (material) => {
    return apiRequest('/raw-materials', {
      method: 'POST',
      body: JSON.stringify(material)
    });
  },
  
  update: async (id, material) => {
    return apiRequest(`/raw-materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(material)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/raw-materials/${id}`, {
      method: 'DELETE'
    });
  },
  
  updateStock: async (id, quantity, operation) => {
    return apiRequest(`/raw-materials/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, operation })
    });
  }
};

// Transactions API
export const transactionsApi = {
  getAll: async () => {
    return apiRequest('/transactions');
  },
  
  getById: async (id) => {
    return apiRequest(`/transactions/${id}`);
  },
  
  create: async (transaction) => {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    });
  },
  
  updateStatus: async (id, status) => {
    return apiRequest(`/transactions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },
  
  processRefund: async (id, refundData) => {
    return apiRequest(`/transactions/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData)
    });
  }
};

// Coupons API
export const couponsApi = {
  getAll: async () => {
    return apiRequest('/coupons');
  },
  
  getById: async (id) => {
    return apiRequest(`/coupons/${id}`);
  },
  
  create: async (coupon) => {
    return apiRequest('/coupons', {
      method: 'POST',
      body: JSON.stringify(coupon)
    });
  },
  
  update: async (id, coupon) => {
    return apiRequest(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(coupon)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/coupons/${id}`, {
      method: 'DELETE'
    });
  },
  
  validate: async (code, amount) => {
    return apiRequest(`/coupons/validate/${code}?amount=${amount}`);
  }
};

// Taxes API
export const taxesApi = {
  getAll: async () => {
    return apiRequest('/taxes');
  },
  
  getById: async (id) => {
    return apiRequest(`/taxes/${id}`);
  },
  
  create: async (tax) => {
    return apiRequest('/taxes', {
      method: 'POST',
      body: JSON.stringify(tax)
    });
  },
  
  update: async (id, tax) => {
    return apiRequest(`/taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tax)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/taxes/${id}`, {
      method: 'DELETE'
    });
  },

  // Bulk operations
  bulkUpdateStatus: async (action, taxIds) => {
    return apiRequest('/taxes/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ action, taxIds })
    });
  },

  bulkDelete: async (taxIds) => {
    return apiRequest('/taxes/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ taxIds })
    });
  }
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    return apiRequest('/categories');
  },
  
  getById: async (id) => {
    return apiRequest(`/categories/${id}`);
  },
  
  create: async (category) => {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  },
  
  update: async (id, category) => {
    return apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/categories/${id}`, {
      method: 'DELETE'
    });
  }
};

// Users API
export const usersApi = {
  getAll: async () => {
    return apiRequest('/users');
  },
  
  getById: async (id) => {
    return apiRequest(`/users/${id}`);
  },
  
  create: async (user) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },
  
  update: async (id, user) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};

// Audit API
export const auditApi = {
  getAll: async () => {
    return apiRequest('/audit');
  },
  
  getById: async (id) => {
    return apiRequest(`/audit/${id}`);
  },
  
  getByUser: async (userId) => {
    return apiRequest(`/audit/user/${userId}`);
  },
  
  getByModule: async (module) => {
    return apiRequest(`/audit/module/${module}`);
  }
};

// Purchase Orders API
export const purchaseOrdersApi = {
  getAll: async () => {
    return apiRequest('/purchase-orders');
  },
  
  getById: async (id) => {
    return apiRequest(`/purchase-orders/${id}`);
  },
  
  create: async (order) => {
    return apiRequest('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  },
  
  update: async (id, order) => {
    return apiRequest(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/purchase-orders/${id}`, {
      method: 'DELETE'
    });
  },
  
  updateStatus: async (id, status, notes) => {
    return apiRequest(`/purchase-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  },
  
  receiveGoods: async (id, grnData) => {
    return apiRequest(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(grnData)
    });
  }
};

// Vendors API
export const vendorsApi = {
  getAll: async () => {
    return apiRequest('/vendors');
  },
  
  getById: async (id) => {
    return apiRequest(`/vendors/${id}`);
  },
  
  create: async (vendor) => {
    return apiRequest('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor)
    });
  },
  
  update: async (id, vendor) => {
    return apiRequest(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor)
    });
  },
  
  delete: async (id) => {
    return apiRequest(`/vendors/${id}`, {
      method: 'DELETE'
    });
  }
};

// E-commerce Orders API (for POS system)
export const ecommerceOrdersApi = {
  getAll: async () => {
    return apiRequest('/ecommerce/orders');
  },
  
  getById: async (orderId) => {
    return apiRequest(`/ecommerce/orders/${orderId}`);
  },
  
  updateStatus: async (orderId, status, notes) => {
    return apiRequest(`/ecommerce/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  },
  
  getReceiptBlob: async (filename) => {
    // Get token from localStorage
    const token = localStorage.getItem('vcare_token');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      const response = await fetch(`${API_URL}/ecommerce/receipts/${filename}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        handleAuthError();
        throw createApiError(
          'Authentication failed. Please log in again.',
          401
        );
      }
      
      if (!response.ok) {
        throw createApiError(
          `Failed to fetch receipt: ${response.statusText}`, 
          response.status
        );
      }
      
      return response.blob();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw createApiError('Request timeout', 408);
      }
      
      throw error;
    }
  }
};