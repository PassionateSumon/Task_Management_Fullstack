import type { ResponseToolkit } from "@hapi/hapi";
import { v4 as uuidv4 } from 'uuid';
import {
  LoginPayload,
  ResetPasswordPayload,
  signupPayload,
} from "../../../common/interfaces/User.interface.js";
import { JWTUtil } from "../../../common/utils/JWTUtils.js";
import { CryptoUtil } from "../../../common/utils/Crypto.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { RefreshTokenRepository } from "../../../infrastructure/persistence/refresh-token.repository.js";
import type { WorkspaceRepository } from "../../../infrastructure/persistence/workspace.repository.js";
import type { StatusRepository } from "../../../infrastructure/persistence/status.repository.js";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly statuses: StatusRepository
  ) {}

  async signup({
    name,
    email,
    password,
    user_type,
  }: signupPayload & { user_type?: string }) {
    try {
      return await withTransaction(async (transaction) => {
        const existingUser = await this.users.findByEmail(email, transaction);
        if (existingUser) {
          return {
            statusCode: 409,
            message: "User already exists",
            data: null,
          };
        }

        const username = `user_${uuidv4().slice(0, 8)}`;

        if (!user_type) {
          user_type = "admin";
        }

        const hashedPassword = CryptoUtil.hashPassword(password, "10");

        const workspace = await this.workspaces.create(
          { name: `${username}'s workspace` },
          transaction
        );

        const newUser = await this.users.create(
          {
            name,
            email,
            username,
            password: hashedPassword,
            isActive: true,
            user_type,
            is_reset_password: false,
            isOtpVerified: false,
            workspace_id: workspace.id,
          },
          transaction
        );

        if (!newUser) {
          return {
            statusCode: 400,
            message: "User registration failed",
            data: null,
          };
        }

        await this.statuses.seedDefaultsForWorkspace(workspace.id, transaction);

        return {
          statusCode: 200,
          message: "User registered successfully",
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            username: newUser.username,
            user_type: newUser.user_type,
          },
        };
      });
    } catch (error: any) {
      return {
        statusCode: 500,
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  async login({ emailOrUsername, password }: LoginPayload, h: ResponseToolkit) {
    try {
      const result = await withTransaction(async (transaction) => {
        const isExistUser = await this.users.findByEmailOrUsername(
          emailOrUsername,
          transaction
        );
        if (!isExistUser) {
          return {
            statusCode: 400,
            message: "User not found",
            data: null,
          };
        }

        if (!isExistUser.isActive) {
          return {
            statusCode: 400,
            message: "User is inactive",
            data: null,
          };
        }

        const hashedInputPassword = CryptoUtil.hashPassword(password, "10");

        const isPasswordMatch = hashedInputPassword === isExistUser.password;

        if (!isPasswordMatch) {
          return {
            statusCode: 400,
            message: "Invalid password",
            data: null,
          };
        }

        const accessToken = JWTUtil.generateAccessToken(
          isExistUser.id,
          isExistUser.user_type
        );
        const refreshToken = JWTUtil.generateRefreshToken(
          isExistUser.id,
          isExistUser.user_type
        );

        await this.refreshTokens.create(
          {
            token: refreshToken,
            userId: isExistUser.id,
          },
          transaction
        );

        return {
          statusCode: 200,
          message: "User logged in successfully",
          accessToken,
          refreshToken,
          user: {
            id: isExistUser.id,
            name: isExistUser.name,
            email: isExistUser.email,
            role: isExistUser.user_type,
            username: isExistUser.username,
            user_type: isExistUser.user_type,
            isActive: isExistUser.isActive,
            isOtpVerified: isExistUser.isOtpVerified,
          },
        };
      });

      if (result.statusCode !== 200) {
        return result;
      }

      h.state("accessToken", (result as any).accessToken, {
        path: "/",
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ttl: 1 * 24 * 60 * 60 * 1000,
      });
      h.state("refreshToken", (result as any).refreshToken, {
        path: "/",
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ttl: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        statusCode: result.statusCode,
        message: result.message,
        user: (result as any).user,
        data: null,
      };
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  otpSend(_email: string) {
    return {
      statusCode: 400,
      message: "OTP feature is disabled",
      data: null,
    };
  }

  otpCheck(_email: string, _otp: string, _h: ResponseToolkit) {
    return {
      statusCode: 400,
      message: "OTP verification is disabled",
      data: null,
    };
  }

  async refresh(refreshToken: string, h: ResponseToolkit) {
    try {
      if (!refreshToken) {
        return {
          statusCode: 401,
          message: "Refresh token not found",
          data: null,
        };
      }

      const result = await withTransaction(async (transaction) => {
        const tokenRecord = await this.refreshTokens.findByTokenWithUser(
          refreshToken,
          transaction
        );

        if (!tokenRecord || !tokenRecord.user) {
          return {
            statusCode: 401,
            message: "Invalid or expired refresh token",
            data: null,
          };
        }

        if (!tokenRecord.user.isActive) {
          return {
            statusCode: 403,
            message: "User is inactive",
            data: null,
          };
        }

        const newAccessToken = JWTUtil.generateAccessToken(
          tokenRecord.user.id,
          tokenRecord.user.user_type
        );
        const newRefreshToken = JWTUtil.generateRefreshToken(
          tokenRecord.user.id,
          tokenRecord.user.user_type
        );

        await this.refreshTokens.updateToken(
          refreshToken,
          newRefreshToken,
          transaction
        );

        return {
          statusCode: 200,
          message: "Tokens refreshed successfully",
          newAccessToken,
          newRefreshToken,
          data: {},
        };
      });

      if (result.statusCode !== 200) {
        return result;
      }

      h.state("accessToken", (result as any).newAccessToken, {
        path: "/",
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ttl: 1 * 24 * 60 * 60 * 1000,
      });
      h.state("refreshToken", (result as any).newRefreshToken, {
        path: "/",
        isHttpOnly: true,
        isSecure: process.env.NODE_ENV === "production",
        isSameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ttl: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        statusCode: 200,
        message: "Tokens refreshed successfully",
        data: {},
      };
    } catch (err: any) {
      console.log(err);
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async resetPassword({
    emailOrUsername,
    tempPassword,
    newPassword,
  }: ResetPasswordPayload) {
    try {
      return await withTransaction(async (transaction) => {
        const isExistUser = await this.users.findByEmailOrUsername(
          emailOrUsername,
          transaction
        );

        if (!isExistUser) {
          return {
            statusCode: 400,
            message: "User not found",
            data: null,
          };
        }

        if (!isExistUser.isActive) {
          return {
            statusCode: 400,
            message: "User is inactive",
            data: null,
          };
        }

        const isPasswordMatch = tempPassword === isExistUser.password;

        if (!isPasswordMatch) {
          return {
            statusCode: 400,
            message: "Invalid password",
            data: null,
          };
        }

        await this.users.updateById(
          isExistUser.id,
          { password: newPassword, is_reset_password: true },
          transaction
        );

        return {
          statusCode: 200,
          message: "Password reset successfully",
          user: {
            id: isExistUser.id,
            name: isExistUser.name,
            email: isExistUser.email,
            username: isExistUser.username,
            user_type: isExistUser.user_type,
            isActive: isExistUser.isActive,
          },
        };
      });
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async me(userId: string) {
    try {
      return await withTransaction(async (transaction) => {
        const user = await this.users.findByPk(userId, transaction);
        if (!user) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        return {
          statusCode: 200,
          message: "User fetched successfully",
          data: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.user_type,
              username: user.username,
              user_type: user.user_type,
              isActive: user.isActive,
              isOtpVerified: user.isOtpVerified,
            },
          },
        };
      });
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async logout(userId: string, h: ResponseToolkit) {
    try {
      const result = await withTransaction(async (transaction) => {
        const user = await this.users.findByPk(userId, transaction);
        if (!user) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        await this.users.updateById(
          userId,
          { lastLogoutAt: new Date() },
          transaction
        );

        await this.refreshTokens.destroyByUserId(userId, transaction);

        return {
          statusCode: 200,
          message: "User logged out successfully",
          data: null,
        };
      });

      if (result.statusCode !== 200) {
        return result;
      }

      h.unstate("accessToken", {
        path: "/",
      });
      h.unstate("refreshToken", {
        path: "/",
      });
      return {
        statusCode: result.statusCode,
        message: result.message,
        data: {},
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }
}
