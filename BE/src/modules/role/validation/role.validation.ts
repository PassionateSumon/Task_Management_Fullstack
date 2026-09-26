import Joi from "joi";

const positiveId = Joi.number().integer().positive();

export const roleCreatePayloadSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  description: Joi.string().trim().allow("", null).max(255),
  permission_ids: Joi.array().items(positiveId).max(100).optional(),
});

export const roleUpdatePayloadSchema = Joi.object({
  id: positiveId.required(),
  name: Joi.string().trim().min(2).max(60),
  description: Joi.string().trim().allow("", null).max(255),
  permission_ids: Joi.array().items(positiveId).max(100),
}).min(1);

export const roleDeletePayloadSchema = Joi.object({
  id: positiveId.required(),
});

export const roleIdParamSchema = Joi.object({
  id: positiveId.required(),
});

export const roleGetAllParamSchema = Joi.object({
  search: Joi.string().allow("", null),
});
