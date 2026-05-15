import Joi from "joi";

/** Shared strict password rules for signup and reset-password. */
export const strictPassword = Joi.string()
  .min(10)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .messages({
    "string.min": "Password must be at least 10 characters",
    "string.pattern.base":
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character",
  });
