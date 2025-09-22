import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ordersList: [],
  currentOrder: null,
  receipts: {}, // { [receiptId]: { blobUrl, loading, error, timestamp } }
  loading: false,
  error: null,
};

const ecommerceOrdersSlice = createSlice({
  name: "ecommerceOrders",
  initialState,
  reducers: {
    fetchEcommerceOrders(state) {
      state.loading = true;
      state.error = null;
    },
    fetchEcommerceOrderById(state) {
      state.loading = true;
      state.error = null;
    },
    updateEcommerceOrderStatus(state) {
      state.loading = true;
      state.error = null;
    },
    fetchReceiptBlob(state, action) {
      const { receiptId } = action.payload;
      if (!state.receipts[receiptId]) {
        state.receipts[receiptId] = {};
      }
      state.receipts[receiptId].loading = true;
      state.receipts[receiptId].error = null;
    },
    fetchEcommerceOrdersSucceeded(state, action) {
      state.loading = false;
      state.ordersList = action.payload;
    },
    fetchEcommerceOrderByIdSucceeded(state, action) {
      state.loading = false;
      state.currentOrder = action.payload;
    },
    updateEcommerceOrderStatusSucceeded(state, action) {
      state.loading = false;
      const idx = state.ordersList.findIndex(o => o.id === action.payload.id);
      if (idx !== -1) {
        state.ordersList[idx] = {
          ...state.ordersList[idx],
          orderStatus: action.payload.orderStatus,
          updatedAt: action.payload.updatedAt
        };
      }
      if (state.currentOrder && state.currentOrder.id === action.payload.id) {
        state.currentOrder.orderStatus = action.payload.orderStatus;
        state.currentOrder.updatedAt = action.payload.updatedAt;
      }
    },
    fetchReceiptBlobSucceeded(state, action) {
      const { receiptId, blobUrl } = action.payload;
      state.receipts[receiptId] = {
        blobUrl,
        loading: false,
        error: null,
        timestamp: Date.now()
      };
    },
    fetchReceiptBlobFailed(state, action) {
      const { receiptId, error } = action.payload;
      state.receipts[receiptId] = {
        loading: false,
        error,
        blobUrl: null,
        timestamp: Date.now()
      };
    },
    clearReceiptBlob(state, action) {
      const { receiptId } = action.payload;
      const receipt = state.receipts[receiptId];
      if (receipt?.blobUrl) {
        // Note: URL.revokeObjectURL will be called in the component
        delete state.receipts[receiptId];
      }
    },
    failed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchEcommerceOrders,
  fetchEcommerceOrderById,
  updateEcommerceOrderStatus,
  fetchReceiptBlob,
  fetchEcommerceOrdersSucceeded,
  fetchEcommerceOrderByIdSucceeded,
  updateEcommerceOrderStatusSucceeded,
  fetchReceiptBlobSucceeded,
  fetchReceiptBlobFailed,
  clearReceiptBlob,
  failed,
} = ecommerceOrdersSlice.actions;

export default ecommerceOrdersSlice.reducer;