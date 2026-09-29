import {
  createRoleHandler,
  deleteRoleHandler,
  getAllRolesHandler,
  getRolePermissionsHandler,
  updateRoleHandler,
} from "../controller/role.controller.js";
import {
  roleCreatePayloadSchema,
  roleDeletePayloadSchema,
  roleGetAllParamSchema,
  roleIdParamSchema,
  roleUpdatePayloadSchema,
} from "../validation/role.validation.js";
import { PermissionGuard } from "../../../common/utils/PermissionGuard.js";

const prefix = "/role";

export default [
  {
    method: "GET",
    path: `${prefix}/all`,
    handler: getAllRolesHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("role.view")],
      tags: ["api", "role"],
      description: "Get all roles for the current workspace",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: roleGetAllParamSchema,
      },
    },
  },
  {
    method: "GET",
    path: `${prefix}/permissions`,
    handler: getRolePermissionsHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("role.view")],
      tags: ["api", "role"],
      description: "Get the permissions assigned to a role",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: roleIdParamSchema,
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/create`,
    handler: createRoleHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("role.create")],
      tags: ["api", "role"],
      description: "Create a workspace-scoped dynamic role",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: roleCreatePayloadSchema,
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
    handler: updateRoleHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("role.update")],
      tags: ["api", "role"],
      description: "Update a dynamic role and/or its permissions",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: roleUpdatePayloadSchema,
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
    handler: deleteRoleHandler,
    options: {
      auth: "jwt_access",
      pre: [PermissionGuard.require("role.delete")],
      tags: ["api", "role"],
      description: "Delete a dynamic role",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: roleDeletePayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
];
