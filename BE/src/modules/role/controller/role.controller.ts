import { Request, ResponseToolkit } from "@hapi/hapi";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const role = () => getAppContainer().roleService;

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

export const getAllRolesHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const { search } = req.query as any;
    const result = await role().getAllRoles(userId, { search });
    return respond(result, h, "Roles fetched successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const getRolePermissionsHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const id = Number(req.query.id);
    const result = await role().getRolePermissions(userId, id);
    return respond(result, h, "Role permissions fetched successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const createRoleHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      name: string;
      description?: string;
      permission_ids?: number[];
    };
    const result = await role().createRole(userId, payload);
    return respond(result, h, "Role created successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updateRoleHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      id: number;
      name?: string;
      description?: string;
      permission_ids?: number[];
    };
    const result = await role().updateRole(userId, payload);
    return respond(result, h, "Role updated successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const deleteRoleHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { id: number };
    const result = await role().deleteRole(userId, payload);
    return respond(result, h, "Role deleted successfully");
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
