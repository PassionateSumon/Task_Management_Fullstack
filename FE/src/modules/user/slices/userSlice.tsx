import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../common/utils/AxiosInstance";
import type { UserState } from "../types/User.interface";

const initialState: UserState = {
    user: {},
    workspaceUsers: [],
    loading: false,
    error: null,
}

export const getWorkspaceUsers = createAsyncThunk("user/getWorkspaceUsers", async (_, { rejectWithValue }) => {
    try {
        const res = await axiosInstance.get('/user/all?page=1&limit=100');
        return res.data?.data?.data ?? [];
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
    }
})

export default UserSlice;