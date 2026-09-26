import {
  createPermissionHandler,
  deletePermissionHandler,
  getAllPermissionsHandler,
  updatePermissionHandler,
} from "../controller/permission.controller.js";
import {
  permissionCreatePayloadSchema,
  permissionDeletePayloadSchema,
  permissionGetAllParamSchema,
  permissionUpdatePayloadSchema,
} from "../validation/permission.validation.js";
import { PermissionGuard } from "../../../common/utils/PermissionGuard.js";

const prefix = "/permission";

export default [
  {
    method: "GET",
    path: `${prefix}/all`,
    handler: getAllPermissionsHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("permission.view")],
      tags: ["api", "permission"],
      description: "Get the permission catalogue visible to this workspace",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: permissionGetAllParamSchema,
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/create`,
    handler: createPermissionHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("permission.create")],
      tags: ["api", "permission"],
      description: "Create a workspace custom permission",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: permissionCreatePayloadSchema,
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
    handler: updatePermissionHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("permission.update")],
      tags: ["api", "permission"],
      description: "Update a workspace custom permission",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: permissionUpdatePayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "DELETE",
    path: `${prefix}/delete`,
    handler: deletePermissionHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("permission.delete")],
      tags: ["api", "permission"],
      description: "Delete a workspace custom permission",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: permissionDeletePayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
];
