import { takeLatest, call, put } from 'redux-saga/effects';
import {
  fetchProducts,
  fetchProductById,
  fetchProductsSuccess,
  fetchProductByIdSuccess,
  productsFailure,
} from '../slices/productsSlice';
import { productsApi } from '../../api/apiClient';

function* fetchProductsSaga() {
  try {
    console.log('E-commerce: Fetching products from API...');
    const products = yield call(productsApi.getAll);
    console.log('E-commerce: Products received from API', { 
      productCount: products.length,
      sampleProducts: products.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        colorsCount: p.colors?.length || 0
      }))
    });
    yield put(fetchProductsSuccess(products));
  } catch (error) {
    console.error('E-commerce: Failed to fetch products', error);
    yield put(productsFailure(error.message || 'Failed to fetch products'));
  }
}

function* fetchProductByIdSaga(action) {
  try {
    const product = yield call(productsApi.getById, action.payload);
    yield put(fetchProductByIdSuccess(product));
  } catch (error) {
    yield put(productsFailure(error.message || 'Failed to fetch product details'));
  }
}

export default function* productsSaga() {
  yield takeLatest(fetchProducts.type, fetchProductsSaga);
  yield takeLatest(fetchProductById.type, fetchProductByIdSaga);
}