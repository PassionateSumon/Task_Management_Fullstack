import Joi from "joi";

const positiveId = Joi.number().integer().positive();

/**
 * Permission names are dotted lowercase identifiers (e.g. `task.create`).
 * This keeps custom permissions consistent with the seeded catalogue and
 * prevents injection of free-form text into a security-relevant identifier.
 */
const permissionName = Joi.string()
  .trim()
  .min(3)
  .max(80)
  .pattern(/^[a-z0-9]+(\.[a-z0-9_]+)+$/)
  .messages({
    "string.pattern.base":
      "Permission name must be lowercase dotted notation, e.g. reports.export",
  });

export const permissionCreatePayloadSchema = Joi.object({
  name: permissionName.required(),
  description: Joi.string().trim().allow("", null).max(255),
});

export const permissionUpdatePayloadSchema = Joi.object({
  id: positiveId.required(),
  /** Optional on update so a description-only edit is valid. */
  name: permissionName,
  description: Joi.string().trim().allow("", null).max(255),
}).min(1);

export const permissionDeletePayloadSchema = Joi.object({
  id: positiveId.required(),
});

export const permissionGetAllParamSchema = Joi.object({
  search: Joi.string().allow("", null),
});
