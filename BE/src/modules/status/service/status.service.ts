import { withTransaction } from "../../../common/utils/transaction.js";
import type { StatusRepository } from "../../../infrastructure/persistence/status.repository.js";
import type { ITaskWriter } from "../ports/task-writer.port.js";

export class StatusService {
  constructor(
    private readonly status: StatusRepository,
    private readonly taskWriter: ITaskWriter
  ) {}

  async createStatus({ name }: { name: string }) {
    try {
      return await withTransaction(async (transaction) => {
        const existed = await this.status.findByName(name, transaction);
        if (existed) {
          return {
            statusCode: 409,
            message: "Status already exists",
            data: null,
          };
        }

        const result = await this.status.create(name, transaction);
        if (!result) {
          return {
            statusCode: 400,
            message: "Status creation failed",
            data: null,
          };
        }
        return {
          statusCode: 200,
          message: "Status created successfully",
          data: result,
        };
      });
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async getAllStatuses() {
    try {
      const result = await withTransaction(async (transaction) => {
        return this.status.findAllMinimal(transaction);
      });
      return {
        statusCode: 200,
        message: "Status fetched successfully",
        data: result,
      };
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async updateStatus({ id, name }: { id: number; name: string }) {
    try {
      return await withTransaction(async (transaction) => {
        const result = await this.status.findOneById(id, transaction);
        if (!result) {
          return {
            statusCode: 404,
            message: "Status not found",
            data: null,
          };
        }
        await this.status.updateName(id, name, transaction);
        const finalRes = await this.status.findOneAfterUpdate(id, transaction);
        return {
          statusCode: 200,
          message: "Status updated successfully",
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

  async deleteStatus({ id }: { id: number }) {
    try {
      return await withTransaction(async (transaction) => {
        const result = await this.status.findOneRaw(id, transaction);
        if (!result) {
          return {
            statusCode: 404,
            message: "Status not found",
            data: null,
          };
        }

        await this.taskWriter.deleteTasksByStatusId(id, transaction);
        await this.status.destroyById(id, transaction);

        return {
          statusCode: 200,
          message: "Status deleted successfully",
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
