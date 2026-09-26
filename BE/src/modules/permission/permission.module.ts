import routes from "./routes/permission.route.js";

const PermissionModule = {
  name: "permission",
  register: async function (server: any) {
    routes.forEach((route) => {
      server.route(route);
    });
  },
};

export default PermissionModule;
