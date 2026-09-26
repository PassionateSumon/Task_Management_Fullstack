import {
  createUserHandler,
  deleteUserHandler,
  getAllUsersHandler,
  getSingleUserHandler,
  toggleActiveHandler,
  updateDetailsHandler,
  updateUserRoleHandler,
} from "../controller/user.controller.js";
import { PermissionGuard } from "../../../common/utils/PermissionGuard.js";
import {
  createUserPayloadSchema,
  updateUserRolePayloadSchema,
  userIdParamSchema,
  userGetAllParamSchema,
  userRequiredIdParamSchema,
  userUpdateNamePayloadSchema,
} from "../validation/user.validation.js";

const prefix = "/user";
export default [
  {
    method: "GET",
    path: `${prefix}/all`,
    handler: getAllUsersHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("user.view")],
      tags: ["api", "user"],
      description: "Get all users in the current workspace",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: userGetAllParamSchema,
      },
    },
  },
  {
    method: "GET",
    path: `${prefix}/single`,
    handler: getSingleUserHandler,
    options: {
      auth: "jwt_access",
      // Self-read is open to any signed-in account; reading somebody else needs
      // `user.view`. This route is what backs the Profile page, and gating it
      // outright meant a user whose role had no `user.view` got a 403 on their
      // own account and could not even see their own name.
      pre: [PermissionGuard.requireSelfOr("user.view", "query")],
      tags: ["api", "user"],
      description:
        "Get a single user. Defaults to the authenticated user, which any signed-in account may always read. Passing `?id=` to read another user requires the `user.view` permission.",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: userIdParamSchema,
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/create`,
    handler: createUserHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("user.create")],
      tags: ["api", "user"],
      description:
        "Create a user inside the caller's workspace. The workspace is derived server-side; `role_id` is optional and defaults to the workspace member role.",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: createUserPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "PUT",
    path: `${prefix}/update`,
    handler: updateDetailsHandler,
    options: {
      auth: "jwt_access",
      // No permission gate, by design. This route edits the caller's own
      // profile name: `updateDetailsHandler` takes the target id from
      // `req.auth.credentials`, never from the payload, and the payload schema
      // accepts only `name`. There is therefore no authorisation decision left
      // to make beyond "is this a valid session".
      //
      // It used to be gated on `user.update`, but that permission means
      // "administer other users" (it guards /assign-role and /toggle-active)
      // and it is not granted to the base member role.
      tags: ["api", "user"],
      description: "Update the authenticated user's own name",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: userUpdateNamePayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "PUT",
    path: `${prefix}/assign-role`,
    handler: updateUserRoleHandler,
    options: {
      auth: "jwt_access",
      // Administrative: reassigns the role of *another* user. `user.update` is
      // granted only to administrative roles, so a base member cannot promote
      // themselves or demote an admin.
      pre: [PermissionGuard.require("user.update")],
      tags: ["api", "user"],
      description:
        "Assign a workspace role to a user. Both the user and the role must belong to the caller's workspace.",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: updateUserRolePayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "PUT",
    path: `${prefix}/toggle-active/{id}`,
    handler: toggleActiveHandler,
    options: {
      auth: "jwt_access",
      // Administrative: deactivates another user. Replaces the old hardcoded
      // `role === "admin"` check with a permission check, so the effective
      // outcome for existing admins is unchanged while becoming RBAC-driven.
      // `user.update` is not part of the base member role.
      pre: [PermissionGuard.require("user.update")],
      tags: ["api", "user"],
      description: "Toggle active of a user in the current workspace",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: userRequiredIdParamSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "DELETE",
    path: `${prefix}/delete/{id}`,
    handler: deleteUserHandler,
    options: {
      auth: "jwt_access",
      // Previously this route had no authorization check at all, so any
      // authenticated user could delete any user in any workspace.
      pre: [PermissionGuard.require("user.delete")],
      tags: ["api", "user"],
      description: "Delete a user in the current workspace",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: userRequiredIdParamSchema,
      },
    },
  },
];
