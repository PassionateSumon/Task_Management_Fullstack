import { signin } from "../../modules/auth/slices/AuthSlice";


export const loginMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action.type === "auth/validate/fulfilled") {
    store.dispatch(signin(action?.payload));
  }

  return next(action);
};