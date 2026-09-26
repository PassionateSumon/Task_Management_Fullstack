import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { RootState } from "../../store/store";
import { hasAnyPermission } from "./permissions";

type RequirePermissionProps = {
  /** Holding any one of these is enough. */
  anyOf: string[];
  /** Where to send a user who lacks the permission. */
  redirectTo?: string;
};

/**
 * Route-level permission gate.
 *
 * Composes with the existing `ProtectedRoute`: this one is nested inside it, so
 * it may assume the user is authenticated and the permission list is populated.
 *
 * Like every other frontend check this is presentational only. The API rejects
 * unauthorised calls regardless, so bypassing this component grants nothing.
 */
const RequirePermission = ({
  anyOf,
  redirectTo = "/home/task",
}: RequirePermissionProps) => {
  const permissions = useSelector((state: RootState) => state.auth.permissions);
  const location = useLocation();

  if (!hasAnyPermission(permissions, ...anyOf)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequirePermission;
