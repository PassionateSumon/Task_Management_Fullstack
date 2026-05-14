import { Request, ResponseToolkit } from "@hapi/hapi";
import { error, success } from "../../../common/utils/returnFunctions.js";
import { getAppContainer } from "../../../composition/app-container.js";

const dashboard = () => getAppContainer().dashboardService;

export const dashBoardHandler = async (req: Request, h: ResponseToolkit) => {
  try {
    const res = await dashboard().getDashboard();
    if (res.statusCode !== 200) {
      return error(null, res.message, res.statusCode)(h);
    }
    return success(res.data, res.message, res.statusCode)(h);
  } catch (err: any) {
    return error(null, err.message || "Internal server error", 500)(h);
  }
};

export const dashBoardHandlerForUser = async (
  req: Request,
  h: ResponseToolkit
) => {
  try {
    const { userId } = req.auth.credentials as any;
    const res = await dashboard().getDashboardForUser(userId);
    if (res.statusCode !== 200) {
      return error(null, res.message, res.statusCode)(h);
    }
    return success(res.data, res.message, res.statusCode)(h);
  } catch (error: any) {
    return error(null, error.message || "Internal server error", 500)(h);
  }
};
