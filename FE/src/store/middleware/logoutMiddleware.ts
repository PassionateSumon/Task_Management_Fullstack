import { logout } from "../../modules/auth/slices/AuthSlice";

export const logoutMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action?.payload?.code === 403 || action?.payload?.code === 401) {
    store.dispatch(logout());
  }
  return next(action);
};
