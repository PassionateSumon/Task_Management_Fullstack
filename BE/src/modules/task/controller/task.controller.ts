import { Request, ResponseToolkit } from "@hapi/hapi";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const task = () => getAppContainer().taskService;

export const createTaskHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      name: string;
      description?: string;
      status: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
    };
    const result = await task().createTask(payload, userId);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Task created successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const getAllTaskHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId, roleId } = req.auth.credentials as any;
    const viewType = req.query.viewType as
      | "kanban"
      | "compact"
      | "calendar"
      | "table";
    const reqUserId = req.query.id as string | null;
    const {
      page,
      limit,
      search,
      status,
      priority,
      start_date,
      end_date,
      sortBy,
      sortOrder,
    } = req.query as any;

    const result = await task().getAllTasks(
      viewType,
      userId,
      roleId,
      reqUserId,
      {
        page,
        limit,
        search,
        status,
        priority,
        start_date,
        end_date,
        sortBy,
        sortOrder,
      },
    );
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Tasks fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const getSingleTaskHandler = async (
  req: Request,
  h: ResponseToolkit,
) => {
  try {
    const id = req.params.id as number;
    const result = await task().getSingleTask({ id });
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Task fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updateTaskHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const id = req.params.id as number;
    const payload = req.payload as {
      name?: string;
      description?: string;
      status?: string;
    };
    const result = await task().updateTask(id, payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Task updated successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const deleteTaskHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const id = req.params.id as number;
    const result = await task().deleteTask(id);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Status deleted successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
