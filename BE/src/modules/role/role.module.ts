import routes from "./routes/role.route.js";

const RoleModule = {
  name: "role",
  register: async function (server: any) {
    routes.forEach((route) => {
      server.route(route);
    });
  },
};

export default RoleModule;
