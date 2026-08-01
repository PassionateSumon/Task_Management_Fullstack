import Joi from "joi";

export const userUpdateNamePayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
});

export const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
});

export const userGetAllParamSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  search: Joi.string().allow("", null),
});
