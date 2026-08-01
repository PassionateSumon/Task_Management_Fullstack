import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../common/utils/AxiosInstance";
import type { Task, TaskState, TaskQueryParams } from "../types/Task.interface";

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  lastQueryParams: undefined,
};

export const createTask = createAsyncThunk(
  "task/createTask",
  async (
    payload: {
      name: string;
      description?: string;
      status: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post("/task/create", payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create task"
      );
    }
  }
);

export const getAllTasks = createAsyncThunk(
  "task/getAllTasks",
  async (
    payload: {
      viewType?: "kanban" | "compact" | "calendar" | "table";
      id?: number | null;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      priority?: string;
      start_date?: string;
      end_date?: string;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC" | "asc" | "desc";
    } = { viewType: "compact", id: null, page: 1, limit: 10 },
    { rejectWithValue }: { rejectWithValue: (value: any) => void }
  ) => {
    const { viewType = "compact", id = null, page, limit, search, status, priority, start_date, end_date, sortBy, sortOrder } = payload;
    try {
      let url = `/task/all?viewType=${viewType}`;
      if (id) url += `&id=${id}`;
      if (page) url += `&page=${page}`;
      if (limit) url += `&limit=${limit}`;
      if (search) url += `&search=${search}`;
      if (status) url += `&status=${status}`;
      if (priority) url += `&priority=${priority}`;
      if (start_date) url += `&start_date=${start_date}`;
      if (end_date) url += `&end_date=${end_date}`;
      if (sortBy) url += `&sortBy=${sortBy}`;
      if (sortOrder) url += `&sortOrder=${sortOrder}`;

      const response = await axiosInstance.get(url);
      return { viewType, data: response.data.data, meta: response.data.meta };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch tasks"
      );
    }
  }
);

// Thunk that re-fetches tasks using the last stored query params.
// This ensures that after create/edit/delete, we stay on the same page with same sort & filters.
export const refetchTasks = createAsyncThunk(
  "task/refetchTasks",
  async (_, { getState, dispatch }) => {
    const state = (getState() as any).task;
    const params: TaskQueryParams = state.lastQueryParams || { viewType: "compact" };
    await dispatch(getAllTasks(params));
  }
);

export const getSingleTask = createAsyncThunk(
  "task/getSingleTask",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/task/single/${id}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch task"
      );
    }
  }
);

export const updateTask = createAsyncThunk(
  "task/updateTask",
  async (
    {
      id,
      payload,
    }: {
      id: number;
      payload: {
        name?: string;
        description?: string;
        status?: string;
        priority?: "high" | "medium" | "low";
        start_date?: string;
        end_date?: string;
      };
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const response = await axiosInstance.put(`/task/update/${id}`, payload, {
        headers: { "X-Skip-Loader": "true" },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to update task",
        previousTasks: (getState() as any).task.tasks,
      });
    }
  }
);

export const deleteTask = createAsyncThunk(
  "task/deleteTask",
  async (id: number, { rejectWithValue, getState }) => {
    try {
      const response = await axiosInstance.delete(`/task/delete/${id}`, {
        headers: { "X-Skip-Loader": "true" },
      });
      return { id, data: response };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to update task",
        previousTasks: (getState() as any).task.tasks,
      });
    }
  }
);

const TaskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Task
      .addCase(createTask.pending, (state, action: any) => {
        state.loading = false;
        const newTask: any = {
          id: action.meta.requestId,
          task_name: action.meta.arg.name,
          task_description: action.meta.arg.description,
          status: { id: 0, name: action.meta.arg.status },
          priority: action.meta.arg.priority,
          start_date: action.meta.arg.start_date,
          end_date: action.meta.arg.end_date,
        };
        // Skip optimistic push for paginated/sorted array views (table view)
        // since we will refetch with correct params after create succeeds.
        if (Array.isArray(state.tasks)) {
          // Only do optimistic push if NOT in a paginated/sorted context
          if (!state.lastQueryParams?.page && !state.lastQueryParams?.sortBy) {
            state.tasks.push(newTask);
          }
        } else {
          const status = action.meta.arg.status;
          state.tasks[status] = state.tasks[status]
            ? [...state.tasks[status], newTask]
            : [newTask];
        }
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action: any) => {
        const newTask = {
          ...action.payload,
          task_name: action.payload.task_name || action.payload.name,
        };
        if (Array.isArray(state.tasks)) {
          const index = state.tasks.findIndex(
            (task) => task.id === Date.now()
          );
          if (index !== -1) {
            state.tasks[index] = newTask;
          } else {
            state.tasks.push(newTask);
          }
        } else {
          const status = action.payload?.status?.name || action.payload?.status;
          if (!status || status === "undefined") {
            console.warn("Invalid status in createTask.fulfilled:", status);
            return;
          }
          state.tasks[status] = state.tasks[status]
            ? state.tasks[status].map((task: Task) =>
              task.id === Date.now() ? newTask : task
            )
            : [newTask];
        }
      })
      .addCase(createTask.rejected, (state, action: any) => {
        if (Array.isArray(state.tasks)) {
          state.tasks = state.tasks.filter((task) => task.id !== Date.now());
        } else {
          const status = action.meta.arg.status || "Pending";
          state.tasks[status] = state.tasks[status]?.filter(
            (task: Task) => task.id !== Date.now()
          ) || [];
        }
        state.error = (action.payload as any).message;
      })
      // Get All Tasks
      .addCase(getAllTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllTasks.fulfilled, (state, action: any) => {
        state.loading = false;
        state.tasks = action.payload.data;
        // Save the query params that were used for this fetch
        state.lastQueryParams = action.meta.arg;
        if (action.payload.meta) {
          state.totalItems = action.payload.meta.totalItems;
          state.totalPages = action.payload.meta.totalPages;
          state.currentPage = action.payload.meta.currentPage;
          state.limit = action.payload.meta.limit;
        } else {
          state.totalItems = undefined;
          state.totalPages = undefined;
          state.currentPage = undefined;
          state.limit = undefined;
        }
      })
      .addCase(getAllTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Single Task
      .addCase(getSingleTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSingleTask.fulfilled, (state, action: any) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(getSingleTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Task
      .addCase(updateTask.pending, (state: any, action: any) => {
        // state.loading = false;
        const { id, payload } = action.meta.arg;
        // console.log(payload)
        if (Array.isArray(state.tasks)) {
          const index = state.tasks.findIndex((task: any) => task.id === id);
          if (index !== -1) {
            state.tasks[index] = { ...state.tasks[index], ...payload };
          }
        } else {
          const oldStatus = Object.keys(state.tasks).find((status) =>
            state.tasks[status].some((task: any) => task.id === id)
          );

          if (oldStatus) {
            const validTasks = state.tasks[oldStatus].filter((task: any) => {
              return task && task.id !== undefined && task.id !== null;
            });

            if (state.tasks[oldStatus].length !== validTasks.length) {
              console.warn(
                "Filtered non id tasks from old status",
                oldStatus,
                state.tasks[oldStatus]
              );
            }

            if (payload.status && oldStatus !== payload.status) {
              state.tasks[oldStatus] = validTasks.filter(
                (task: any) => task.id !== id
              );

              const taskToMove = validTasks.find((t: any) => t.id === id);
              if (taskToMove) {
                state.tasks[payload.status] = state.tasks[payload.status]
                  ? [
                    ...state.tasks[payload.status],
                    {
                      ...taskToMove,
                      ...payload,
                    },
                  ]
                  : [
                    {
                      ...taskToMove,
                      ...payload,
                    },
                  ];
              } else {
                console.warn(
                  `Task with id ${id} not found in old status ${oldStatus}`
                );
              }
            } else {
              state.tasks[oldStatus] = validTasks.map((task: any) =>
                task.id === id ? { ...task, ...payload } : task
              );
            }
          } else {
            console.warn(`Task with id ${id} not found in any status`);
          }
        }
        if (state.currentTask?.id === id) {
          state.currentTask = { ...state.currentTask, ...payload };
        }
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action: any) => {
        state.loading = false;
        if (Array.isArray(state.tasks)) {
          const index = state.tasks.findIndex(
            (task) => task.id === action.payload.id
          );
          if (index !== -1) {
            state.tasks[index] = action.payload;
          }
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action: any) => {
        state.loading = false;
        state.tasks = action.payload.previousTasks;
        state.error = action.payload.message as string;
      })
      // Delete Task
      .addCase(deleteTask.pending, (state: any, action: any) => {
        state.loading = false;
        const id = action.meta.arg;
        if (Array.isArray(state.tasks)) {
          state.tasks = state.tasks.filter((task: any) => task.id !== id);
        } else {
          const status = Object.keys(state.tasks).find((status) =>
            state.tasks[status].some((task: any) => task.id === id)
          );
          if (status) {
            state.tasks[status] = state.tasks[status].filter(
              (task: any) => task.id !== id
            );
          }
        }
        if (state.currentTask?.id === id) {
          state.currentTask = null;
        }
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteTask.rejected, (state, action: any) => {
        state.loading = false;
        state.tasks = action.payload.previousTasks;
        state.error = action.payload.message as string;
      });
  },
});

export const { clearError } = TaskSlice.actions;
export default TaskSlice;