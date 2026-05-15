import {
  createStatusHandler,
  deleteStatusHandler,
  getAllStatusHandler,
  updateStatusHandler,
} from "../controller/status.controller.js";
import {
  createStatusPayloadSchema,
  deleteStatusPayloadSchema,
  updateStatusPayloadSchema,
} from "../validation/status.validation.js";

const prefix = "/status";

export default [
  {
    method: "POST",
    path: `${prefix}/create`,
    handler: createStatusHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "status"],
      description: "Create status",
      validate: {
        payload: createStatusPayloadSchema,
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
    handler: getAllStatusHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "status"],
      description: "Get all status",
    },
  },
  {
    method: "PUT",
    path: `${prefix}/update`,
    handler: updateStatusHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "status"],
      description: "Update status",
      validate: {
        payload: updateStatusPayloadSchema,
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
    handler: deleteStatusHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "status"],
      description: "Delete status",
      validate: {
        payload: deleteStatusPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
];
