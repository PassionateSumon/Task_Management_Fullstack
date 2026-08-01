import { withTransaction } from "../../../common/utils/transaction.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async getAllUsers(userId: number, options?: { page?: number; limit?: number; search?: string }) {
    try {
      const { rows: users, count } = await withTransaction(async (transaction) => {
        return this.users.findAllExceptUserId(userId, options, transaction);
      });
      if (!users) {
        return {
          statusCode: 404,
          message: "Users not found",
          data: null,
        };
      }
      
      const meta = options?.page && options?.limit ? {
        totalItems: count,
        totalPages: Math.ceil(count / options.limit),
        currentPage: options.page,
        limit: options.limit
      } : undefined;

      return {
        statusCode: 200,
        message: "Users fetched successfully",
        data: {
          data: users,
          meta
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async getSingleUser(id: number | null, userId: number) {
    try {
      const currId = !id ? userId : id;
      const user = await withTransaction(async (transaction) => {
        return this.users.findOneByIdExcludePassword(currId, transaction);
      });
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
        data: user,
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async updateDetails(id: number, data: { name: string }) {
    try {
      return await withTransaction(async (transaction) => {
        const existedUser = await this.users.findOneById(id, transaction);
        if (!existedUser) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }
        await this.users.updateById(id, data, transaction);
        const finalRes = await this.users.findOneById(id, transaction);
        return {
          statusCode: 200,
          message: "User updated successfully",
          data: finalRes,
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

  async toggleActive(id: number) {
    try {
      return await withTransaction(async (transaction) => {
        const existedUser = await this.users.findOneById(id, transaction);
        if (!existedUser) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }
        await this.users.updateById(
          id,
          { isActive: !existedUser.isActive },
          transaction
        );
        const finalRes = await this.users.findOneById(id, transaction);
        return {
          statusCode: 200,
          message: "User updated successfully",
          data: finalRes,
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

  async deleteUser(id: number) {
    try {
      return await withTransaction(async (transaction) => {
        const user = await this.users.findOneById(id, transaction);
        if (!user) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }
        await this.users.destroyById(id, transaction);
        return {
          statusCode: 200,
          message: "User deleted successfully",
          data: { id: id },
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
}
