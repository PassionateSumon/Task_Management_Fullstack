import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CreateRolePayload,
  Role,
  RoleState,
  UpdateRolePayload,
} from "../types/Role.interface";
import axiosInstance from "../../../common/utils/AxiosInstance";

const initialState: RoleState = {
  roles: [],
  selectedPermissions: [],
  loading: false,
  error: null,
};

export const getAllRoles = createAsyncThunk(
  "role/getAllRoles",
  async (_, { rejectWithValue }) => {
    try {
      const response = (await axiosInstance.get("/role/all")) as any;
      return (response?.data ?? []) as Role[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch roles"
      );
    }
  }
);

export const createRole = createAsyncThunk(
  "role/createRole",
  async (payload: CreateRolePayload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/role/create", payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return response as any;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create role"
      );
    }
  }
);

export const updateRole = createAsyncThunk(
  "role/updateRole",
  async (payload: UpdateRolePayload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/role/update", payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return response as any;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update role"
      );
    }
  }
);

export const deleteRole = createAsyncThunk(
  "role/deleteRole",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete("/role/delete", {
        data: { id },
        headers: { "X-Skip-Loader": "true" },
      });
      return (response as any)?.data ?? { id };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete role"
      );
    }
  }
);

const RoleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    clearRoleError: (state) => {
      state.error = null;
    },
    setSelectedPermissions: (state, action) => {
      state.selectedPermissions = action.payload ?? [];
    },
    toggleSelectedPermission: (state, action: { payload: number }) => {
      const id = action.payload;
      state.selectedPermissions = state.selectedPermissions.includes(id)
        ? state.selectedPermissions.filter((p) => p !== id)
        : [...state.selectedPermissions, id];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload ?? [];
      })
      .addCase(getAllRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.loading = false;
        const created = action.payload?.data as Role | undefined;
        if (created?.id) state.roles.push(created);
        state.selectedPermissions = [];
      })
      .addCase(createRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(updateRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload?.data as Role | undefined;
        if (!updated?.id) return;
        const index = state.roles.findIndex((r) => r.id === updated.id);
        if (index !== -1) state.roles[index] = { ...state.roles[index], ...updated };
        state.selectedPermissions = [];
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.loading = false;
        const removed = action.payload as { id?: number } | undefined;
        if (!removed?.id) return;
        state.roles = state.roles.filter((r) => r.id !== removed.id);
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearRoleError,
  setSelectedPermissions,
  toggleSelectedPermission,
} = RoleSlice.actions;
export default RoleSlice;
