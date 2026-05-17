export const swaggerOptions = {
  info: {
    title: "Task Vault APIs",
    version: "1.0.0",
    description:
      "Task Vault APIs docs using Hapi.js and Sequelize ORM.\n\n" +
      "**Authentication:** This API uses cookie-based auth. " +
      "Call `/auth/login` first, then all subsequent requests will " +
      "automatically include the auth cookies.",
  },
  schemes: [process.env.NODE_ENV === "production" ? "https" : "http"],
  host:
    process.env.NODE_ENV === "production"
      ? process.env.PROD_ORIGIN ? new URL(process.env.PROD_ORIGIN).host : ""
      : `localhost:${process.env.PORT || 7040}`,
  securityDefinitions: {
    cookieAuth: {
      type: "apiKey",
      name: "accessToken",
      in: "cookie",
      description:
        "Cookie-based authentication. Call POST /auth/login first to get the cookie set automatically.",
    },
  },
  security: [{ cookieAuth: [] }],
  grouping: "tags",
  sortTags: "alpha",
};