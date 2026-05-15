import Hapi, { Request } from "@hapi/hapi";
import dotenv from "dotenv";
import Jwt from "@hapi/jwt";
import Cookie from "@hapi/cookie";
import { registerSwagger } from "./plugins/swagger.plugin.js";
import { ApiError } from "./common/utils/ApiError.js";
import { connectDB } from "./config/db.js";
import routesPlugin from "./plugins/routes.plugin.js";
import { getAppContainer } from "./composition/app-container.js";
import { CookieAuthValidators } from "./infrastructure/auth/cookie-auth.validators.js";

dotenv.config();

const requiredEnvVars = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "COOKIE_SECRET",
  "PORT",
  process.env.NODE_ENV === "production" ? "PROD_ORIGIN" : "DEV_ORIGIN",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const ORIGIN =
  (process.env.NODE_ENV === "production"
    ? process.env.PROD_ORIGIN
    : process.env.DEV_ORIGIN) ?? "http://localhost:3000";

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_ORIGIN
    : `http://localhost:${process.env.PORT}`;

const init = async () => {
  const server = Hapi.server({
    port: Number(process.env.PORT) || 3000,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: [ORIGIN],
        credentials: true,
        additionalHeaders: [
          "Accept",
          "Authorization",
          "Content-Type",
          "If-None-Match",
          "X-Skip-Loader",
        ],
      },
      state: {
        parse: true,
        failAction: "error",
      },
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 1024 * 1024 * 10,
      },
    },
  });

  await server.register(Jwt);
  await server.register(Cookie);
  await registerSwagger(server);

  const container = getAppContainer();
  const cookieAuth = new CookieAuthValidators(
    container.userRepository,
    container.refreshTokenRepository
  );

  server.auth.strategy("jwt_access", "cookie", {
    cookie: {
      name: "accessToken",
      password: process.env.COOKIE_SECRET!,
      isHttpOnly: true,
      isSecure: process.env.NODE_ENV === "production",
      isSameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      ttl: 1 * 24 * 60 * 60 * 1000,
      path: "/",
    },
    validate: cookieAuth.validateAccess,
  });

  server.auth.scheme("custom-refresh", () => {
    return {
      authenticate: async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
        const result = (await cookieAuth.validateRefresh(request)) as any;
        if (!result.isValid) {
          throw new ApiError("Refresh token validation failed", 401);
        }
        return h.authenticated({ credentials: result.credentials });
      },
    };
  });

  server.auth.strategy("jwt_refresh", "custom-refresh");

  server.auth.default("jwt_access");

  server.events.on("response", function (req: Request) {
    console.log(
      `${req.info.remoteAddress}: ${req.method.toUpperCase()} ${req.path} --> ${
        (req.response as any).statusCode
      }`
    );
  });

  try {
    await connectDB();
    await server.register(routesPlugin);
    await server.start();
    console.log(`Server is running on ${server.info.uri}`);
    console.log(
      `Swagger is running on ${baseUrl}/documentation`
    );
  } catch (error) {
    console.error("Unable to connect to the database or start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err: unknown) => {
  console.log(err);
  process.exit(1);
});

init();
