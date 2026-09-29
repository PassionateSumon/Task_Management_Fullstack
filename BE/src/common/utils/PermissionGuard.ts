import type { Request, ResponseToolkit } from "@hapi/hapi";
import { statusCodes } from "../constants/constants.js";

const forbidden = (message: string) => ({
  statusCode: statusCodes.PERMISSION_DENIED,
  message,
  data: null,
});

const denied = (message: string) => ({
  statusCode: statusCodes.UNAUTHORIZED,
  message,
  data: null,
});

/**
 * Centralised, permission-based route guard.
 *
 * This replaces the hardcoded `role === "admin"` check for any route that opts
 * in, while leaving the legacy `JWTUtil.verifyRole()` in place for routes that
 * still depend on the `user_type` token claim.
 *
 * Resolution order (the backend is the source of truth):
 *   request -> authenticated user (cookie/JWT) -> workspace derived from the
 *   user row -> effective permissions -> required permission check.
 *
 * The workspace is ALWAYS resolved server-side from the authenticated user. A
 * client-supplied `workspaceId` in a payload, query or path is never consulted.
 */

/**
 * Establishes who is calling: authenticates the session, rejects inactive and
 * workspace-less accounts, and hands back the container for permission lookups.
 *
 * Every guard funnels through this so the preamble (auth -> active -> workspace)
 * cannot drift between them. A guard that forgot the `isActive` check would let
 * a deactivated account keep using a still-valid cookie.
 */
const resolveCaller = async (request: Request) => {
  const credentials = (request.auth?.credentials ?? {}) as {
    userId?: number;
  };

  if (!credentials.userId) {
    return {
      ok: false as const,
      status: statusCodes.UNAUTHORIZED,
      body: denied("Authentication required"),
    };
  }

  // Imported lazily so this util has no hard container dependency and no
  // import cycle at module-load time.
  const { getAppContainer } = await import("../../composition/app-container.js");
  const container = getAppContainer();

  const user = await container.userRepository.findByPk(credentials.userId);
  if (!user || !user.isActive) {
    return {
      ok: false as const,
      status: statusCodes.UNAUTHORIZED,
      body: denied("User not found or inactive"),
    };
  }

  const workspaceId = user.workspace_id;
  if (workspaceId == null) {
    return {
      ok: false as const,
      status: statusCodes.PERMISSION_DENIED,
      body: forbidden("No workspace assigned to this account"),
    };
  }

  return { ok: true as const, userId: credentials.userId, workspaceId, container };
};

export const PermissionGuard = {
  /**
   * Requires the caller to hold at least one of `required` permissions.
   * Pass several permissions when any one of them is sufficient.
   */
  require(...required: string[]) {
    return async (request: Request, h: ResponseToolkit) => {
      const caller = await resolveCaller(request);
      if (!caller.ok) return h.response(caller.body).code(caller.status).takeover();

      const granted =
        await caller.container.permissionRepository.resolvePermissionNamesForUser(
          caller.userId,
          caller.workspaceId
        );

      const allowed = required.some((permission) => granted.has(permission));
      if (!allowed) {
        return h
          .response(
            forbidden("You do not have permission to perform this action")
          )
          .code(statusCodes.PERMISSION_DENIED)
          .takeover();
      }

      return h.continue;
    };
  },

  /**
   * Lets a caller reach their OWN record with no permission at all, while still
   * requiring `permission` to reach anyone else's.
   *
   * This exists because "can administer users" and "can read my own account" are
   * different capabilities, and gating the second on the first locks a user out
   * of their own profile the moment their role has no `user.view`. Someone with
   * zero permissions must still be able to see who they are and fix their own
   * name, otherwise they have no way to recover and the account is bricked.
   *
   * `from` selects where the target id lives. When the id is absent the route
   * defaults to the session user, which is the self case. Note the target id is
   * only ever used to *decide whether a permission is needed*; the service layer
   * independently re-derives the workspace and re-checks the id, so this never
   * widens what data a caller can actually read.
   */
  requireSelfOr(permission: string, from: "query" | "params" = "query") {
    return async (request: Request, h: ResponseToolkit) => {
      const caller = await resolveCaller(request);
      if (!caller.ok) return h.response(caller.body).code(caller.status).takeover();

      // Joi has already coerced and validated this to a positive integer or
      // left it undefined, because Hapi validates before running `pre`.
      const raw = from === "params" ? request.params.id : request.query.id;
      const targetId = typeof raw === "string" ? Number(raw) : raw;

      // No id supplied -> the handler reads the session user. Self.
      if (targetId == null) return h.continue;
      // Explicitly our own id. Self.
      if (targetId === caller.userId) return h.continue;

      // Somebody else's record: now the permission genuinely applies.
      const granted =
        await caller.container.permissionRepository.resolvePermissionNamesForUser(
          caller.userId,
          caller.workspaceId
        );
      if (!granted.has(permission)) {
        return h
          .response(
            forbidden("You do not have permission to perform this action")
          )
          .code(statusCodes.PERMISSION_DENIED)
          .takeover();
      }

      return h.continue;
    };
  },
};
