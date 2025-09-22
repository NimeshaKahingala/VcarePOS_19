import { takeLatest, call, put } from 'redux-saga/effects';
import {
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
} from '../slices/ordersSlice';
import { clearCart } from '../slices/cartSlice';
import { ordersApi } from '../../api/apiClient';

function* createOrderSaga(action) {
  try {
    const { receiptDetails, ...orderData } = action.payload;
    const order = yield call(ordersApi.create, orderData, receiptDetails);
    yield put(createOrderSuccess(order));
    
    // Clear cart after successful order
    yield put(clearCart());
  } catch (error) {
    yield put(ordersFailure(error.message || 'Failed to create order'));
  }
}

function* fetchOrdersSaga(action) {
  try {
    const orders = yield call(ordersApi.getCustomerOrders, action.payload.customerId);
    yield put(fetchOrdersSuccess(orders));
  } catch (error) {
    yield put(ordersFailure(error.message || 'Failed to fetch orders'));
  }
}

function* fetchOrderByIdSaga(action) {
  try {
    const order = yield call(ordersApi.getById, action.payload);
    yield put(fetchOrderByIdSuccess(order));
  } catch (error) {
    yield put(ordersFailure(error.message || 'Failed to fetch order details'));
  }
}

function* uploadTemporaryReceiptSaga(action) {
  try {
    const response = yield call(ordersApi.uploadTemporaryReceipt, action.payload.file);
    yield put(uploadTemporaryReceiptSuccess(response));
  } catch (error) {
    yield put(uploadTemporaryReceiptFailure(error.message || 'Failed to upload receipt'));
  }
}

export default function* ordersSaga() {
  yield takeLatest(createOrder.type, createOrderSaga);
  yield takeLatest(fetchOrders.type, fetchOrdersSaga);
  yield takeLatest(fetchOrderById.type, fetchOrderByIdSaga);
  yield takeLatest(uploadTemporaryReceipt.type, uploadTemporaryReceiptSaga);
}