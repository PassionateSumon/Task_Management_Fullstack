import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  AuthState,
  ChangePasswordPayload,
  LoginPayload,
  OtpPayload,
  SignupPayload,
} from "../types/Auth.interface";
import axiosInstance from "../../../common/utils/AxiosInstance";

const initialState: AuthState = {
  isLoggedIn: false,
  userId: null,
  email: null,
  role: null,
  permissions: [],
  assignedRole: null,
  loading: false,
  error: null,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async (payload: SignupPayload, { rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/signup", payload);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload, { rejectWithValue, dispatch }) => {
    try {
      const res = await axiosInstance.post("/auth/login", payload);
      // The login response does not carry the permission set. Resolve it
      // immediately via the existing /auth/me thunk, otherwise the UI would
      // render with an empty permission list after signing in and hide every
      // permission-gated control until the next full page load.
      await dispatch(checkAuthStatus());
      return res;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  "auth/checkAuthStatus",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/auth/me");
      return res;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Not authenticated"
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload: any, { rejectWithValue }) => {
    try {
      await axiosInstance.put("/auth/reset-password", payload);
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Password reset failed"
      );
    }
  }
);

export const otpSend = createAsyncThunk(
  "auth/otpSend",
  async (email: string, { rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/otp-send", { email });
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to send OTP"
      );
    }
  }
);

export const otpCheck = createAsyncThunk(
  "auth/otpCheck",
  async (payload: OtpPayload, { rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/otp-check", payload);
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "OTP verification failed"
      );
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/logout");
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  }
);

/**
 * Self-service password change.
 *
 * The backend revokes every existing session on success, so the local session
 * state is cleared here too rather than waiting for the next request to 401.
 */
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (payload: ChangePasswordPayload, { rejectWithValue }) => {
    try {
      await axiosInstance.put("/auth/change-password", payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return true;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to change password"
      );
    }
  }
);

const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    signin: (state, action) => {
      state.isLoggedIn = true;
      state.email = action.payload.email;
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: any) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.email = action.payload?.email || action.payload?.data?.email;
        state.role = action.payload?.role || action.payload?.data?.role;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // reset password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action: any) => {
        state.loading = false;
        state.isLoggedIn = true;
        // support different shapes: { data: { user } } or { user } or { user: { role } }
        state.role =
          action.payload?.data?.user?.role ||
          action.payload?.user?.role ||
          action.payload?.data?.role ||
          action.payload?.role ||
          null;

        // `/auth/me` is the single place the server resolves the caller's
        // effective permissions, so this list is always derived, never guessed.
        const me = action.payload?.data ?? action.payload ?? {};
        state.permissions = Array.isArray(me.permissions) ? me.permissions : [];
        state.assignedRole =
          me.role && typeof me.role === "object" ? me.role : null;
        state.email = me.user?.email ?? state.email;
        state.userId = me.user?.id ?? state.userId;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        // Don't set an error for the initial auth check rejection
        // (unauthenticated users are expected). Leave `error` null
        // so UI toasts won't show on app load for non-authenticated visitors.
        state.error = null;
      })
      // OTP Send
      .addCase(otpSend.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(otpSend.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(otpSend.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // OTP Check
      .addCase(otpCheck.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(otpCheck.fulfilled, (state) => {
        state.isLoggedIn = true;
        state.loading = false;
      })
      .addCase(otpCheck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.userId = null;
        state.email = null;
        state.role = null;
        state.permissions = [];
        state.assignedRole = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        // The server revoked every session for this account as part of the
        // password change, so drop the local session too and send the user to
        // the login screen instead of letting the next call bounce off a 401.
        state.isLoggedIn = false;
        state.userId = null;
        state.email = null;
        state.role = null;
        state.permissions = [];
        state.assignedRole = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, signin } = AuthSlice.actions;
export default AuthSlice;
