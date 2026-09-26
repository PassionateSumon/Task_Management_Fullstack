import { useEffect, useState } from "react";
import { loadingManager } from "./common/utils/AxiosInstance";
import ToastInit from "./common/utils/ToastInit";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SignupPage from "./modules/auth/pages/SignupPage";
import LoginPage from "./modules/auth/pages/LoginPage";
import ProtectedRoute from "./common/utils/ProtectedRoute";
import type { AppDispatch } from "./store/store";
import { useDispatch, useSelector } from "react-redux";
import { checkAuthStatus } from "./modules/auth/slices/AuthSlice";
import HomeLayout from "./common/components/HomeLayout";
import TaskPage from "./modules/task/pages/TaskPage";
import AdminDashboard from "./modules/dashboard/components/AdminDashboard";
import GeneralDashboard from "./modules/dashboard/components/GeneralDashboard";
import NotFound from "./common/components/NotFound";
import StatusPage from "./modules/status/pages/StatusPage";
import type { RootState } from "./store/store";
import TeamPage from "./modules/user/components/TeamPage";
import Profile from "./modules/user/components/Profile";
import Landing from "./common/components/Landing";
import { CustomLoader } from "./common/components/CustomLoader";
import RolePage from "./modules/role/pages/RolePage";
import PermissionPage from "./modules/permission/pages/PermissionPage";
import ChangePassword from "./modules/auth/components/ChangePassword";
import RequirePermission from "./common/utils/RequirePermission";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [checkAuth, setCheckAuth] = useState(false);
  const { isLoggedIn } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("lastRoute", location.pathname);
    }
  }, [location.pathname, isLoggedIn]);

  useEffect(() => {
    const unsubscribeLoading = loadingManager.subscribe((loading) => {
      setIsLoading(loading);
    });

    return () => {
      unsubscribeLoading();
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(checkAuthStatus()).finally(() => setCheckAuth(true));
  }, [dispatch]);

  if (!checkAuth)
    return (
      <CustomLoader />
    );


  return (
    <>
      {isLoading && (
        <CustomLoader />
      )}
      <ToastInit />

      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/home/task" /> : <Landing />} />
        <Route path="/signup" element={isLoggedIn ? <Navigate to="/home/task" /> : <SignupPage />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/home/task" /> : <LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomeLayout />}>
            <Route path="task" element={<TaskPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="dashboard/me" element={<GeneralDashboard />} />
            <Route index element={<Navigate to="task" replace />} />

            {/* Status administration */}
            <Route element={<RequirePermission anyOf={["status.view"]} />}>
              <Route path="status" element={<StatusPage />} />
            </Route>

            {/* Admin analytics */}
            <Route
              element={<RequirePermission anyOf={["dashboard.view.admin"]} />}
            >
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Workspace member management */}
            <Route element={<RequirePermission anyOf={["user.view"]} />}>
              <Route path="team" element={<TeamPage />} />
            </Route>

            {/* Role management */}
            <Route element={<RequirePermission anyOf={["role.view"]} />}>
              <Route path="roles" element={<RolePage />} />
            </Route>

            {/* Permission catalogue */}
            <Route element={<RequirePermission anyOf={["permission.view"]} />}>
              <Route path="permissions" element={<PermissionPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;