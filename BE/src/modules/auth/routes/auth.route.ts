import {
  loginHandler,
  logoutHandler,
  myHandler,
  otpCheckHandler,
  otpSendHandler,
  refreshHandler,
  resetPasswordHandler,
  signupHandler,
} from "../controller/auth.controller.js";
import {
  loginPayloadSchema,
  otpCheckPayloadSchema,
  otpSendPayloadSchema,
  resetPasswordPayloadSchema,
  signupPayloadSchema,
} from "../validation/auth.validation.js";

const prefix = "/auth";

export default [
  {
    method: "POST",
    path: `${prefix}/signup`,
    handler: signupHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "User signup",
      validate: {
        payload: signupPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/login`,
    handler: loginHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "User login",
      validate: {
        payload: loginPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  /* OTP endpoints disabled
  {
    method: "POST",
    path: `${prefix}/otp-send`,
    handler: otpSendHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "Send OTP",
      validate: {
        payload: otpSendPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/otp-check`,
    handler: otpCheckHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "OTP verification",
      validate: {
        payload: otpCheckPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  */
  {
    method: "PUT",
    path: `${prefix}/reset-password`,
    handler: resetPasswordHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "Password reset",
      validate: {
        payload: resetPasswordPayloadSchema,
      },
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "POST",
    path: `${prefix}/refresh`,
    handler: refreshHandler,
    options: {
      auth: false,
      tags: ["api", "auth"],
      description: "User refresh token",
      payload: {
        parse: true,
        output: "data",
      },
    },
  },
  {
    method: "GET",
    path: `${prefix}/me`,
    handler: myHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "auth"],
      description: "Get user details",
    },
  },
  {
    method: "POST",
    path: `${prefix}/logout`,
    handler: logoutHandler,
    options: {
      auth: "jwt_access",
      tags: ["api", "auth"],
      description: "User logout",
    },
  },
];
