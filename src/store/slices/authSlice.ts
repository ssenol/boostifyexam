import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../../types/api";
import type { RootState } from "../index";

export interface AuthState {
  accessToken: string | null;
  currentUser: AuthUser | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  tokenAcquiredAt: number | null; // Token alınma zamanı (timestamp)
}

export interface CredentialsPayload {
  token: string;
  user?: AuthUser | null;
  refreshToken?: string | null;
  tokenAcquiredAt?: number;
}

const initialState: AuthState = {
  accessToken: null,
  currentUser: null,
  refreshToken: null,
  isAuthenticated: false,
  tokenAcquiredAt: null, // Token alınma zamanı (timestamp)
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
      state.accessToken = action.payload.token;
      state.currentUser = action.payload.user ?? null;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.isAuthenticated = !!action.payload.token;
      state.tokenAcquiredAt = action.payload.tokenAcquiredAt || Date.now();
    },
    logout: (state) => {
      state.accessToken = null;
      state.currentUser = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.tokenAcquiredAt = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export default authSlice.reducer;
