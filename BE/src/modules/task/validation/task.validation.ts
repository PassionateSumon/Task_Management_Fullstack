import Joi from "joi";
import type { Request, ResponseToolkit } from "@hapi/hapi";

export const createTaskPayloadSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().allow("").optional(),
  status: Joi.string().trim().required(),
  priority: Joi.string().valid("high", "medium", "low").optional(),
  start_date: Joi.string().optional(),
  end_date: Joi.string().optional(),
  assignee_ids: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
});

export const updateTaskPayloadSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow("").optional(),
  status: Joi.string().trim().optional(),
  priority: Joi.string().valid("high", "medium", "low").optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  assignee_ids: Joi.array().items(Joi.number().integer().positive()).unique().optional(),
})
  .or("name", "description", "status", "priority", "start_date", "end_date", "assignee_ids")
  .messages({
    "object.missing": "At least one field must be provided to update",
  });

export const updateTaskFailAction = (
  req: Request,
  h: ResponseToolkit,
  err: Error
) => {
  return h.response({ error: err.message }).code(400).takeover();
};

export const taskIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const taskGetAllParamSchema = Joi.object({
  viewType: Joi.string().valid("kanban", "compact", "calendar", "table").required(),
  // NOTE: the former `id` query param is deliberately gone.
  //
  // It was read as "restrict the board to this user's tasks" and the service
  // then post-filtered by `task.user_id === id` for admins, leaving every other
  // caller with `{}`. It also meant the board was scoped by a CLIENT-supplied
  // id, which is exactly the kind of value that must never decide tenancy.
  // Visibility is now workspace-wide and derived server-side, so there is
  // nothing for this parameter to do.
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  search: Joi.string().allow("", null),
  status: Joi.string().allow("", null),
  priority: Joi.string().allow("", null),
  start_date: Joi.date().allow(null),
  end_date: Joi.date().allow(null),
  sortBy: Joi.string().valid("task_name", "end_date").allow("", null),
  sortOrder: Joi.string().valid("ASC", "DESC", "asc", "desc").allow("", null),
});
