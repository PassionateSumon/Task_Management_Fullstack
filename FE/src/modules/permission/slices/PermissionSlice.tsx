import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CreatePermissionPayload,
  Permission,
  PermissionState,
} from "../types/Permission.interface";
import axiosInstance from "../../../common/utils/AxiosInstance";

const initialState: PermissionState = {
  permissions: [],
  loading: false,
  error: null,
};

export const getAllPermissions = createAsyncThunk(
  "permission/getAllPermissions",
  async (_, { rejectWithValue }) => {
    try {
      // The axios response interceptor unwraps to the {statusCode,message,data}
      // envelope, so `response` is already the envelope and `.data` is the list.
      const response = (await axiosInstance.get("/permission/all")) as any;
      return (response?.data ?? []) as Permission[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch permissions"
      );
    }
  }
);

export const createPermission = createAsyncThunk(
  "permission/createPermission",
  async (payload: CreatePermissionPayload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/permission/create", payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return response as any;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create permission"
      );
    }
  }
);

export const updatePermission = createAsyncThunk(
  "permission/updatePermission",
  async (
    payload: { id: number; name?: string; description?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put("/permission/update", payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return response as any;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update permission"
      );
    }
  }
);

export const deletePermission = createAsyncThunk(
  "permission/deletePermission",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete("/permission/delete", {
        data: { id },
        headers: { "X-Skip-Loader": "true" },
      });
      return (response as any)?.data ?? { id };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete permission"
      );
    }
  }
);

const PermissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    clearPermissionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.permissions = action.payload ?? [];
      })
      .addCase(getAllPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createPermission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPermission.fulfilled, (state, action) => {
        state.loading = false;
        const created = action.payload?.data as Permission | undefined;
        if (created?.id) state.permissions.push(created);
      })
      .addCase(createPermission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(updatePermission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePermission.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload?.data as Permission | undefined;
        if (!updated?.id) return;
        const index = state.permissions.findIndex((p) => p.id === updated.id);
        if (index !== -1) state.permissions[index] = updated;
      })
      .addCase(updatePermission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(deletePermission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePermission.fulfilled, (state, action) => {
        state.loading = false;
        const removed = action.payload as { id?: number } | undefined;
        if (!removed?.id) return;
        state.permissions = state.permissions.filter((p) => p.id !== removed.id);
      })
      .addCase(deletePermission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPermissionError } = PermissionSlice.actions;
export default PermissionSlice;
