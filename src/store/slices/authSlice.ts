import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../../types/api";
import type { RootState } from "../index";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
}

export interface CredentialsPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  currentUser: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Giriş ve her yenilemede iki token birden değişir; eski refresh token artık kullanılmaz
    setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.currentUser = action.payload.user;
      state.isAuthenticated = true;
    },
    // GET /me ile güncellenen profil
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.currentUser = action.payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.currentUser = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export default authSlice.reducer;
