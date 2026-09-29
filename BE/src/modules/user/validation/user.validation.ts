import Joi from "joi";
import { strictPassword } from "../../../common/validation/password.js";

export const userUpdateNamePayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
});

export const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
});

/** For routes where the target id is mandatory (e.g. `/user/delete/{id}`). */
export const userRequiredIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const userGetAllParamSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  search: Joi.string().allow("", null),
});

/**
 * Admin-initiated user creation. `role_id` is optional; when omitted the
 * backend assigns the workspace's default system role. There is deliberately no
 * `workspace_id` field: the tenant is always derived server-side from the
 * authenticated admin, so a client cannot place a user in another workspace.
 */
export const createUserPayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().trim().email().max(255).required(),
  password: strictPassword.required(),
  role_id: Joi.number().integer().positive().optional(),
});

export const updateUserRolePayloadSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  role_id: Joi.number().integer().positive().required(),
});
