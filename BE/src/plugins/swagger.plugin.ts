import Hapi from "@hapi/hapi";
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
import HapiSwagger from "hapi-swagger";
import { swaggerOptions } from "../config/swagger.js";

export const registerSwagger = async (server: Hapi.Server) => {
  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: {
        ...swaggerOptions,
        swaggerUIPath: '/swaggerui/',
        documentationPath: '/documentation',
        uiOptions: {
          requestInterceptor: `(req) => { req.credentials = 'include'; return req; }`,
        },
      },
    },
  ]);
};