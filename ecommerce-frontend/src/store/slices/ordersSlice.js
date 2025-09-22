import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  uploadingTempReceipt: false,
  tempReceiptError: null,
  uploadedReceiptDetails: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Actions
    createOrder: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrders: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrderById: (state) => {
      state.loading = true;
      state.error = null;
    },
    uploadTemporaryReceipt: (state) => {
      state.uploadingTempReceipt = true;
      state.tempReceiptError = null;
    },
    
    // Success actions
    createOrderSuccess: (state, action) => {
      state.loading = false;
      state.currentOrder = action.payload;
      state.orders.unshift(action.payload); // Add to beginning of array
      state.error = null;
    },
    fetchOrdersSuccess: (state, action) => {
      state.loading = false;
      state.orders = action.payload;
      state.error = null;
    },
    fetchOrderByIdSuccess: (state, action) => {
      state.loading = false;
      state.currentOrder = action.payload;
      state.error = null;
    },
    uploadTemporaryReceiptSuccess: (state, action) => {
      state.uploadingTempReceipt = false;
      state.tempReceiptError = null;
      state.uploadedReceiptDetails = action.payload;
    },
    
    // Failure actions
    ordersFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    uploadTemporaryReceiptFailure: (state, action) => {
      state.uploadingTempReceipt = false;
      state.tempReceiptError = action.payload;
    },
    
    // Clear actions
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
      state.tempReceiptError = null;
    },
    clearUploadedReceipt: (state) => {
      state.uploadedReceiptDetails = null;
      state.tempReceiptError = null;
    },
  },
});

export const {
  createOrder,
  fetchOrders,
  fetchOrderById,
  uploadTemporaryReceipt,
  createOrderSuccess,
  fetchOrdersSuccess,
  fetchOrderByIdSuccess,
  uploadTemporaryReceiptSuccess,
  ordersFailure,
  uploadTemporaryReceiptFailure,
  clearCurrentOrder,
  clearError,
  clearUploadedReceipt,
} = ordersSlice.actions;

export default ordersSlice.reducer;