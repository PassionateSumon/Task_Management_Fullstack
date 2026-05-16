import { JWTUtil } from "../../../common/utils/JWTUtils.js";
import {
  dashBoardHandler,
  dashBoardHandlerForUser,
} from "../controller/dashboard.controller.js";
import {
  dashboardQueryFailAction,
  dashboardQuerySchema,
} from "../validation/dashboard.validation.js";

export default [
  {
    method: "GET",
    path: `/admin/dashboard`,
    handler: dashBoardHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "dashboard"],
      plugins: {
        "hapi-swagger": {
          security: [{ cookieAuth: [] }],
        },
      },
      pre: [JWTUtil.verifyRole()],
      validate: {
        query: dashboardQuerySchema,
        failAction: dashboardQueryFailAction,
      },
    },
  },
  {
    method: "GET",
    path: `/dashboard/me`,
    handler: dashBoardHandlerForUser,
    options: {
      auth: "jwt_access",
      tags: ["api", "dashboard"],
      plugins: {
        "hapi-swagger": {
          security: [{ cookieAuth: [] }],
        },
      },
    },
  },
];
