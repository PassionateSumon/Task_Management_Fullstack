import { error, success } from "../../../common/utils/returnFunctions.js";
import { Request, ResponseToolkit } from "@hapi/hapi";
import { getAppContainer } from "../../../composition/app-container.js";

const users = () => getAppContainer().userService;

export const getAllUsersHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const { page, limit, search } = req.query as any;
    const result = await users().getAllUsers(userId, { page, limit, search });
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "Users fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const getSingleUserHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const id = req.query.id;
    const { userId } = req.auth.credentials as any;
    const result = await users().getSingleUser(id, userId);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const toggleActiveHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const id = req.params.id as number;
    const result = await users().toggleActive(id, userId);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User updated successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const createUserHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as {
      name: string;
      email: string;
      password: string;
      role_id?: number;
    };
    const result = await users().createUser(userId, payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User created successfully", 201)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updateUserRoleHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { id: number; role_id: number };
    const result = await users().updateUserRole(userId, payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User role updated successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const updateDetailsHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const payload = req.payload as { name: string };
    const result = await users().updateDetails(userId, payload);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User fetched successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const deleteUserHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const id = req.params.id as number;
    const result = await users().deleteUser(id, userId);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User deleted successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
