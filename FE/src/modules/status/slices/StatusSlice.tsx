import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Status, StatusState } from "../types/Status.interfaces";
import axiosInstance from "../../../common/utils/AxiosInstance";

const initialState: StatusState = {
  statuses: [],
  loading: false,
  error: null,
};

export const createStatus = createAsyncThunk(
  "status/createStatus",
  async (
    { name, is_final }: { name: string; is_final?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "/status/create",
        { name, is_final },
        {
          headers: { "X-Skip-Loader": "true" },
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create status"
      );
    }
  }
);

export const getAllStatuses = createAsyncThunk(
  "status/getAllStatuses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/status/all");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch statuses"
      );
    }
  }
);

export const updateStatus = createAsyncThunk(
  "status/updateStatus",
  async (
    { id, name, is_final }: { id: number; name: string; is_final?: boolean },
    { rejectWithValue, getState }
  ) => {
    try {
      const response = await axiosInstance.put(
        "/status/update",
        { id, name, is_final },
        {
          headers: { "X-Skip-Loader": "true" },
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        {
          message: error.response?.data?.message || "Failed to update status",
          previousStatuses: (getState() as any).status.statuses

        }
      );
    }
  }
);

export const deleteStatus = createAsyncThunk(
  "status/deleteStatus",
  async ({ id, new_final_id }: { id: number; new_final_id?: number }, { rejectWithValue, getState }) => {
    try {
      const response = await axiosInstance.delete("/status/delete", {
        data: { id, new_final_id },
        headers: { "X-Skip-Loader": "true" }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        {
          message: error.response?.data?.message || "Failed to update status",
          previousStatuses: (getState() as any).status.statuses

        }
      );
    }
  }
);

const StatusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create Status
    builder
      .addCase(createStatus.pending, (state, action: any) => {
        state.loading = false;
        const newStatus = {
          id: action.meta.requestId,
          name: action.meta.arg.name,
          is_final: action.meta.arg.is_final,
        };
        state.statuses.push(newStatus);
        state.error = null;
      })
      .addCase(createStatus.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as { data?: Status; statusCode?: number };
        const createdStatus = (payload?.data ?? payload) as Status;
        if (!createdStatus?.id) {
          state.error = null;
          return;
        }
        const index = state.statuses.findIndex(
          (status) => {
            return status.id === createdStatus.id;
          }
        );
        if (index !== -1) {
          state.statuses[index] = createdStatus;
        }
        state.error = null;
      })
      .addCase(createStatus.rejected, (state, action) => {
        state.loading = false;
        state.statuses = state.statuses.filter(
          (status) => status.id !== Number(action.meta.requestId)
        );
        state.error = action.payload as string;
      });

    // Get All Statuses
    builder
      .addCase(getAllStatuses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllStatuses.fulfilled, (state, action) => {
        state.loading = false;
        const body = action.payload as {
          data?: Status[];
          statusCode?: number;
        };
        state.statuses = Array.isArray(body) ? body : body?.data ?? [];
      })
      .addCase(getAllStatuses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Status
    builder
      .addCase(updateStatus.pending, (state, action: any) => {
        state.loading = false;
        const { id, name, is_final } = action.meta.arg;
        const index = state.statuses.findIndex((status) => status.id === id);
        if (index !== -1) {
          state.statuses[index] = {
            ...state.statuses[index],
            name,
            ...(is_final !== undefined ? { is_final } : {}),
          };
        }

        state.error = null;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.statusCode === 200) {
          const updatedStatus = action.payload.data;
          const index = state.statuses.findIndex(
            (status) => status.id === updatedStatus.id
          );
          if (index !== -1) {
            state.statuses[index] = updatedStatus;
          }
        } else {
          state.error = action.payload.message;
        }
      })
      .addCase(updateStatus.rejected, (state, action: any) => {
        state.loading = false;
        state.statuses = action.payload.previousStatuses;
        state.error = action.payload as string;
      });

    // Delete Status
    builder
      .addCase(deleteStatus.pending, (state, action: any) => {
        state.loading = true;
        const { id } = action.meta.arg;
        state.statuses = state.statuses.filter(
          (status) => status.id !== id
        );
        state.error = null;
      })
      .addCase(deleteStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.statusCode !== 200) {
          state.error = action.payload.message;
        }
      })
      .addCase(deleteStatus.rejected, (state, action: any) => {
        state.loading = false;
        state.statuses = action.payload.previousStatuses;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = StatusSlice.actions;
export default StatusSlice;
