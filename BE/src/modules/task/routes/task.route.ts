import {
  createTaskHandler,
  deleteTaskHandler,
  getAllTaskHandler,
  getSingleTaskHandler,
  updateTaskHandler,
} from "../controller/task.controller.js";
import {
  createTaskPayloadSchema,
  updateTaskFailAction,
  updateTaskPayloadSchema,
  taskIdParamSchema,
  taskGetAllParamSchema,
} from "../validation/task.validation.js";

const prefix = "/task";

export default [
  {
    method: "POST",
    path: `${prefix}/create`,
    handler: createTaskHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "task"],
      description: "Create task",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        payload: createTaskPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "GET",
    path: `${prefix}/all`,
    handler: getAllTaskHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "task"],
      description: "Get all task",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        query: taskGetAllParamSchema,
      },
    },
  },
  {
    method: "GET",
    path: `${prefix}/single/{id}`,
    handler: getSingleTaskHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "task"],
      description: "Get single task",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: taskIdParamSchema,
      },
    },
  },
  {
    method: "PUT",
    path: `${prefix}/update/{id}`,
    handler: updateTaskHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "task"],
      description: "Update task",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: taskIdParamSchema,
        payload: updateTaskPayloadSchema,
        failAction: updateTaskFailAction,
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
    handler: deleteTaskHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "task"],
      description: "Delete task",
      plugins: { "hapi-swagger": { security: [{ cookieAuth: [] }] } },
      validate: {
        params: taskIdParamSchema,
      },
    },
  },
];
