import Joi from "joi";

export const userUpdateNamePayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
});

export const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
});
