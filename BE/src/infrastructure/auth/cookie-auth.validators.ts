import type { Request } from "@hapi/hapi";
import jwt from "jsonwebtoken";
import { ApiError } from "../../common/utils/ApiError.js";
import { statusCodes } from "../../common/constants/constants.js";
import { withTransaction } from "../../common/utils/transaction.js";
import type { UserRepository } from "../persistence/user.repository.js";
import type { RefreshTokenRepository } from "../persistence/refresh-token.repository.js";

const verifyToken = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret) as { userId: number; iat?: number };
  } catch {
    throw new ApiError("Invalid or expired token", 401);
  }
};

export class CookieAuthValidators {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository
  ) {}

  validateAccess = async (req: Request, token: string) => {
    try {
      if (!token) {
        throw new ApiError("No accessToken found in Cookie!", 401);
      }
      const accessSecret = process.env.JWT_ACCESS_SECRET;
      if (!accessSecret) {
        throw new ApiError("Access Secret is not found in environment!", 401);
      }

      const decoded = verifyToken(token, accessSecret) as any;

      const user = await withTransaction(async (transaction) => {
        return await this.users.findOneById(decoded?.userId, transaction);
      });
      if (!user || !user.isActive) {
        throw new ApiError("User not found or inactive!", 401);
      }

      const tokenIssuedAt = decoded?.iat as number | undefined;
      const lastLogoutAt = user?.lastLogoutAt
        ? Math.floor(new Date(user.lastLogoutAt).getTime() / 1000)
        : null;

      if (lastLogoutAt && (!tokenIssuedAt || tokenIssuedAt < lastLogoutAt)) {
        throw new ApiError("Token has been revoked. Please login again.", 401);
      }

      return {
        isValid: true,
        credentials: { userId: decoded?.userId, roleId: decoded?.roleId },
      };
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Internal server error at validate-access!", 500);
    }
  };

  validateRefresh = async (req: Request) => {
    try {
      const token = req.state.refreshToken;
      if (!token) {
        throw new ApiError(
          "No refreshToken found in Cookie!",
          statusCodes.UNAUTHORIZED
        );
      }
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!refreshSecret) {
        throw new ApiError(
          "Refresh Secret not found in environment!",
          statusCodes.UNAUTHORIZED
        );
      }

      const decoded = verifyToken(token, refreshSecret) as any;

      const refreshToken = await this.refreshTokens.findOneByTokenAndUserId(
        token,
        decoded.userId
      );
      if (!refreshToken || refreshToken.expiresAt < new Date()) {
        throw new ApiError(
          "Invalid or expired refresh token!",
          statusCodes.UNAUTHORIZED
        );
      }

      const user = await this.users.findOneById(decoded.userId);
      if (!user || !user.isActive) {
        throw new ApiError(
          "User not found or inactive!",
          statusCodes.UNAUTHORIZED
        );
      }

      return {
        isValid: true,
        credentials: { userId: decoded?.userId, roleId: decoded?.roleId },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        "Internal server error at validate-refresh!",
        statusCodes.SERVER_ISSUE
      );
    }
  };
}
