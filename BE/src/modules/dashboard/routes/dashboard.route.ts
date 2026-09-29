import { PermissionGuard } from "../../../common/utils/PermissionGuard.js";
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
      pre: [PermissionGuard.require("dashboard.view.admin")],
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
      // Gated on `task.view`, deliberately, not on a dedicated dashboard
      // permission. This endpoint is a roll-up of the caller's own task set --
      // counts, completion rate, overdue totals -- so it discloses exactly the
      // information the task board discloses. It was previously auth-only, which
      // meant a user holding no permissions at all could still call it and read
      // workspace task statistics while `GET /task/all` correctly returned 403.
      //
      // Gating on the same permission the board uses also keeps the two
      // consistent: a caller who can open the board can open its summary, and
      // one who cannot sees neither.
      pre: [PermissionGuard.require("task.view")],
    },
  },
];
