import Joi from "joi";

export const createStatusPayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  is_final: Joi.boolean().optional(),
});

export const updateStatusPayloadSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(1).max(120).required(),
  is_final: Joi.boolean().optional(),
});

export const deleteStatusPayloadSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
