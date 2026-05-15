import { Request, ResponseToolkit } from "@hapi/hapi";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const status = () => getAppContainer().statusService;

export const createStatusHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      name: string;
      is_final?: boolean;
    };
    const result = await status().createStatus(String(userId), payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Status created successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const getAllStatusHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const result = await status().getAllStatuses(String(userId));
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Status fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updateStatusHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      id: number;
      name: string;
      is_final?: boolean;
    };
    const result = await status().updateStatus(String(userId), payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Status updated successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const deleteStatusHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { id: number };
    const result = await status().deleteStatus(String(userId), payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Status deleted successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
