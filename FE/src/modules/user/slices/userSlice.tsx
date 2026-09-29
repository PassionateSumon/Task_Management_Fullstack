import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../common/utils/AxiosInstance";
import type { CreateUserPayload, UserState } from "../types/User.interface";

const initialState: UserState = {
    user: {},
    workspaceUsers: [],
    loading: false,
    error: null,
}

export const getWorkspaceUsers = createAsyncThunk("user/getWorkspaceUsers", async (_, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.get('/user/all?page=1&limit=100');
        const responseData = (res as any)?.data;
        return Array.isArray(responseData?.data)
            ? responseData.data
            : Array.isArray(responseData?.data?.data)
                ? responseData.data.data
                : Array.isArray(responseData)
                    ? responseData
                    : [];
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to fetch workspace users"
        );
    }
});

export const getUser = createAsyncThunk("user/getUser", async ({ id = null }: { id?: number | null }, { rejectWithValue }) => {
    try {
        let url = '/user/single';
        if (id) url += `?id=${id}`;
        const res = await axiosInstance.get(url);
        return res.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to fetch user data"
        );
    }
});

export const updateUser = createAsyncThunk("user/updateUser", async (data: { name: string }, { rejectWithValue, getState }) => {
    try {
        const res = await axiosInstance.put(`/user/update`, { ...data }, {
            headers: { "X-Skip-Loader": "true" }
        });
        return res.data;
    } catch (error: any) {
        return rejectWithValue(
            {
                message: error.response?.data?.message || "Failed to update user data",
                previousUser: (getState() as any).user.user
            }
        );
    }
});

/**
 * Admin-created user, always inside the caller's workspace.
 *
 * Note there is no `workspace_id` and no `user_type`: the workspace is derived
 * server-side from the session, and the privilege tier comes from the assigned
 * role, so the client cannot place a user in another workspace or mint an admin.
 */
export const createUser = createAsyncThunk("user/createUser", async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.post("/user/create", payload, {
            headers: { "X-Skip-Loader": "true" }
        });
        return res;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to create user"
        );
    }
});

export const assignUserRole = createAsyncThunk("user/assignUserRole", async (payload: { id: number; role_id: number }, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.put("/user/assign-role", payload, {
            headers: { "X-Skip-Loader": "true" }
        });
        return res;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to assign role"
        );
    }
});

export const toggleUserActive = createAsyncThunk("user/toggleUserActive", async (id: number, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.put(`/user/toggle-active/${id}`, {}, {
            headers: { "X-Skip-Loader": "true" }
        });
        return res;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to update user status"
        );
    }
});

export const deleteUser = createAsyncThunk("user/deleteUser", async (id: number, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.delete(`/user/delete/${id}`, {
            headers: { "X-Skip-Loader": "true" }
        });
        return res;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || "Failed to delete user"
        );
    }
});

const UserSlice = createSlice({
    name: "user",
    initialState,
    reducers: {

    },
    extraReducers: (builder) => {
        builder
                .addCase(getWorkspaceUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
                .addCase(getWorkspaceUsers.fulfilled, (state, action) => {
                    state.workspaceUsers = action.payload || [];
                state.loading = false;
            })
                .addCase(getWorkspaceUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
                .addCase(getUser.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(getUser.fulfilled, (state, action) => {
                    state.user = action.payload;
                    state.loading = false;
                })
                .addCase(getUser.rejected, (state, action) => {
                    state.loading = false;
                    state.error = action.payload as string;
                })
                .addCase(updateUser.pending, (state, action: any) => {
                const data = action.meta.arg;
                state.user = { ...state.user, ...data };
                state.error = null;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                state.user = { ...state.user, ...action.payload };
                state.loading = false;
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.user = (action.payload as any).previousUser;
            })
            // Create User
            .addCase(createUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createUser.fulfilled, (state, action: any) => {
                state.loading = false;
                const created = action.payload?.data;
                if (created?.id) state.workspaceUsers.push(created as any);
            })
            .addCase(createUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Assign Role
            .addCase(assignUserRole.fulfilled, (state, action: any) => {
                const updated = action.payload?.data;
                if (!updated?.id) return;
                const index = state.workspaceUsers.findIndex(
                    (u) => u.id === updated.id
                );
                if (index !== -1) {
                    state.workspaceUsers[index] = {
                        ...state.workspaceUsers[index],
                        user_type: updated.user_type,
                    };
                }
            })
            .addCase(assignUserRole.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            // Toggle Active
            .addCase(toggleUserActive.fulfilled, (state, action: any) => {
                const updated = action.payload?.data;
                if (!updated?.id) return;
                const index = state.workspaceUsers.findIndex(
                    (u) => u.id === updated.id
                );
                if (index !== -1) {
                    state.workspaceUsers[index] = {
                        ...state.workspaceUsers[index],
                        isActive: updated.isActive,
                    };
                }
            })
            .addCase(toggleUserActive.rejected, (state, action) => {
                state.error = action.payload as string;
            })
            // Delete User
            .addCase(deleteUser.pending, (state, action: any) => {
                state.workspaceUsers = state.workspaceUsers.filter(
                    (u) => u.id !== action.meta.arg
                );
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.error = action.payload as string;
            })
    }
})

export default UserSlice;