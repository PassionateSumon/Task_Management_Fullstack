import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  LoginPayload,
  ResetPasswordPayload,
  signupPayload,
} from "../../../common/interfaces/User.interface.js";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const auth = () => getAppContainer().authService;

export const signupHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const payload = req.payload as signupPayload;

    const result = (await auth().signup(payload)) as any;
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);

    return success(
      result.user,
      "User registered successfully with invitation mail",
      201
    )(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const loginHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const payload = req.payload as LoginPayload;
    const result = await auth().login(payload, h);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);

    return success(result.user, "User logged in successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const otpSendHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { email } = req.payload as {
      email: string;
    };
    const result = (await auth().otpSend(email)) as any;
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);

    return success(result.data, "Otp sent successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const otpCheckHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { email, otp } = req.payload as {
      email: string;
      otp: string;
    };
    const result = (await auth().otpCheck(email, otp, h)) as any;
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);

    return success(result.data, "Otp verified successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const refreshHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const refreshToken = req.state.refreshToken;
    const res = await auth().refresh(refreshToken, h);
    if (res.statusCode !== 200 && res.statusCode !== 201)
      return error(null, res.message, res.statusCode)(h);
    return success(res.data, "Token refreshed successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const resetPasswordHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const payload = req.payload as ResetPasswordPayload;
    const result = await auth().resetPassword(payload);
    if (result.statusCode !== 200 && result.statusCode !== 201) {
      return error(null, result.message, result.statusCode)(h);
    }
    return success(result, "Password reset successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const myHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    console.log(req.auth.credentials);
    const { userId } = req.auth.credentials as any;
    const result = await auth().me(userId);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result.data, "User authenticated successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const logoutHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const { userId } = req.auth.credentials as any;
    const result = await auth().logout(userId, h);
    if (result.statusCode !== 200 && result.statusCode !== 201)
      return error(null, result.message, result.statusCode)(h);
    return success(result, "User logged out successfully", 200)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};
