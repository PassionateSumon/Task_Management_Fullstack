import {
  deleteUserHandler,
  getAllUsersHandler,
  getSingleUserHandler,
  toggleActiveHandler,
  updateDetailsHandler,
} from "../controller/user.controller.js";
import { JWTUtil } from "../../../common/utils/JWTUtils.js";
import {
  userUpdateNamePayloadSchema,
  userIdParamSchema,
  userGetAllParamSchema,
} from "../validation/user.validation.js";

const prefix = "/user";
export default [
  {
    method: "GET",
    path: `${prefix}/all`,
    handler: getAllUsersHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "user"],
      description: "Get all users",
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
      tags: ["api", "user"],
      description: "Get single user",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: userIdParamSchema,
      },
    },
  },
  {
    method: "PUT",
    path: `${prefix}/update`,
    handler: updateDetailsHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "user"],
      description: "Update details of user",
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
    path: `${prefix}/toggle-active/{id}`,
    handler: toggleActiveHandler,
    options: {
      auth: "jwt_access",
      pre: [JWTUtil.verifyRole()],
      tags: ["api", "user"],
      description: "Toggle active of user",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: userIdParamSchema,
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
      tags: ["api", "user"],
      description: "Delete user",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: userIdParamSchema,
      },
    },
  },
];
