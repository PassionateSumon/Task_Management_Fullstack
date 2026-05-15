import Joi from "joi";
import { strictPassword } from "../../../common/validation/password.js";

export const signupPayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().email().required(),
  password: strictPassword.required(),
  user_type: Joi.string().valid("admin", "user").optional(),
});

export const loginPayloadSchema = Joi.object({
  emailOrUsername: Joi.string().trim().required(),
  password: Joi.string().required(),
});

export const resetPasswordPayloadSchema = Joi.object({
  emailOrUsername: Joi.string().trim().required(),
  tempPassword: Joi.string().required(),
  /** Client may send a hashed password; do not apply plain-text pattern here. */
  newPassword: Joi.string().min(10).max(200).required(),
});

export const otpSendPayloadSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const otpCheckPayloadSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required(),
});
