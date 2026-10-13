import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, PersistConfig } from 'redux-persist';
import authReducer, { AuthState } from './slices/authSlice';
import secureAuthStorage from './secureAuthStorage';

// Token'lar SecureStore'da, kalan alanlar AsyncStorage'da (bkz. secureAuthStorage.ts)
const authPersistConfig: PersistConfig<AuthState> = {
  key: 'auth',
  storage: secureAuthStorage,
  whitelist: ['accessToken', 'currentUser', 'refreshToken', 'isAuthenticated', 'tokenAcquiredAt']
};

const rootReducer = {
  auth: persistReducer(authPersistConfig, authReducer),
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
