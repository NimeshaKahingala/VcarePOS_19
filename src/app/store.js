// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import logger from 'redux-logger';

import rootReducer from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

const middlewares = [sagaMiddleware];

if (import.meta.env.DEV) {
  middlewares.push(logger);
}

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ 
      thunk: false,
      serializableCheck: {
        ignoredActions: ['orders/uploadTemporaryReceipt'],
        ignoredActionsPaths: ['payload.file'],
        ignoredPaths: ['orders.uploadingTempReceipt']
      }
    }).concat(...middlewares),
});

sagaMiddleware.run(rootSaga);

export default store;
