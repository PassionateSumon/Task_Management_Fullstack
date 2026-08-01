import Joi from "joi";
import type { Request, ResponseToolkit } from "@hapi/hapi";

export const dashboardQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional().greater(Joi.ref("startDate")),
});

export const dashboardQueryFailAction = (
  request: Request,
  h: ResponseToolkit,
  err: any
) => {
  return h
    .response({
      statusCode: 400,
      message: "Validation error",
      data: err.details,
    })
    .code(400)
    .takeover();
};
