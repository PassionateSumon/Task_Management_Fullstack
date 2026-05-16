import Joi from "joi";
import PasswordMessage from "./message/password-message.js";

/** Shared strict password rules for signup and reset-password. */
export const strictPassword = Joi.string()
  .min(10)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .messages({
    "string.min": PasswordMessage.min,
    "string.max": PasswordMessage.max,
    "string.pattern.base": PasswordMessage.pattern,
  });
