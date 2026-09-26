import { Request, ResponseToolkit } from "@hapi/hapi";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const permission = () => getAppContainer().permissionService;

const respond = (
  result: { statusCode: number; message: string; data: unknown },
  h: ResponseToolkit,
  successMessage: string
) => {
  if (result.statusCode !== 200 && result.statusCode !== 201) {
    return error(null, result.message, result.statusCode)(h);
  }
  return success(result.data, successMessage, 200)(h);
};

export const getAllPermissionsHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const { search } = req.query as any;
    const result = await permission().getAllPermissions(userId, { search });
    return respond(result, h, "Permissions fetched successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const createPermissionHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { name: string; description?: string };
    const result = await permission().createPermission(userId, payload);
    return respond(result, h, "Permission created successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updatePermissionHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      id: number;
      name?: string;
      description?: string;
    };
    const result = await permission().updatePermission(userId, payload);
    return respond(result, h, "Permission updated successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const deletePermissionHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { id: number };
    const result = await permission().deletePermission(userId, payload);
    return respond(result, h, "Permission deleted successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
