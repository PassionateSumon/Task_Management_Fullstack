import { statusCodes } from "../../../common/constants/constants.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { TaskRepository } from "../../../infrastructure/persistence/task.repository.js";
import type { StatusRepository } from "../../../infrastructure/persistence/status.repository.js";

export class DashboardService {
  constructor(
    private readonly users: UserRepository,
    private readonly tasks: TaskRepository,
    private readonly statuses: StatusRepository
  ) {}

  async getDashboard() {
    try {
      return await withTransaction(async (transaction) => {
        const currentDate = new Date();

        const activeUsersCount = await this.users.countActiveNonAdminUsers(
          transaction
        );

        const totalTasks = await this.tasks.countAll(transaction);

        const tasksByStatusRaw = await this.statuses.findAllWithTasks(
          transaction
        );

        const tasksByPriorityRaw = await this.tasks.findGroupedByPriority(
          transaction
        );

        const overdueTasks = await this.tasks.countOverdue(
          currentDate,
          transaction
        );

        const recentTasks = await this.tasks.findRecentWithUserAndStatus(
          transaction
        );

        const recentUsers = await this.users.findRecentUsersForDashboard(
          transaction
        );

        const currentYear = currentDate.getFullYear();
        const monthlyTasks = await this.tasks.findMonthlyTasks(
          currentYear,
          transaction
        );

        const currentMonth = currentDate.getMonth();
        const weeklyTasks = await this.tasks.findWeeklyTasks(
          currentYear,
          currentMonth,
          transaction
        );

        const yearlyTasks = await this.tasks.findYearlyByStartDate(transaction);

        const completedTasks = await this.tasks.countCompleted(transaction);
        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const tasksPerUser = await this.tasks.findTasksPerUser(transaction);

        const avgTaskDuration = await this.tasks.findAvgDurationCompleted(
          transaction
        );

        const thirtyDaysAgo = new Date(
          currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const statusTrends = await this.tasks.findStatusTrends(
          thirtyDaysAgo,
          transaction
        );

        const activeUsersLast30Days =
          await this.users.countUsersWithRecentTaskActivity(
            thirtyDaysAgo,
            transaction
          );

        const allIsActiveUsers =
          await this.users.findAllBasicUsersWithActiveFlag(transaction);

        const dashboardData: Record<string, unknown> = {
          activeUsers: activeUsersCount,
          totalTasks,
          tasksByStatus: tasksByStatusRaw.map((status: any) => ({
            statusId: status.id,
            statusName: status.name,
            tasksCount: status.tasks.length,
          })),
          tasksByPriority: tasksByPriorityRaw.reduce(
            (acc: Record<string, number>, task: any) => {
              acc[task.priority] = parseInt(task.count, 10);
              return acc;
            },
            {}
          ),
          overdueTasks,
          recentTasks,
          recentUsers,
          monthlyTasks,
          weeklyTasks,
          yearlyTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          tasksPerUser,
          avgTaskDurationDays: (avgTaskDuration as any)?.avgDurationDays
            ? parseFloat((avgTaskDuration as any)?.avgDurationDays)
            : null,
          statusTrends,
          activeUsersLast30Days,
          allIsActiveUsers,
        };

        return {
          statusCode: statusCodes.SUCCESS,
          message: "Dashboard data retrieved successfully",
          data: dashboardData,
        };
      });
    } catch (err: any) {
      console.error("Error in getDashboard:", err);
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async getDashboardForUser(userId: number) {
    try {
      return await withTransaction(async (transaction) => {
        const tasks = await this.tasks.findAllForUserWithStatus(
          userId,
          transaction
        );
        const isDoneLike = (s: any) =>
          Boolean(s?.is_final) ||
          s?.name === "Done" ||
          s?.name === "Completed";

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: any) =>
          isDoneLike(task.status)
        ).length;
        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const pendingTasks = tasks.filter(
          (task: any) => !isDoneLike(task.status)
        ).length;
        const overdueTasks = tasks.filter(
          (task: any) =>
            task.end_date &&
            new Date(task.end_date) < new Date() &&
            !isDoneLike(task.status)
        ).length;

        const tasksByStatus = await this.tasks.findGroupedByStatusForUser(
          userId,
          transaction
        );
        const tasksByPriority = await this.tasks.findGroupedByPriorityForUser(
          userId,
          transaction
        );

        return {
          statusCode: statusCodes.SUCCESS,
          message: "User dashboard data retrieved successfully",
          data: {
            totalTasks,
            completedTasks,
            completionRate: parseFloat(completionRate.toFixed(2)),
            pendingTasks,
            overdueTasks,
            tasksByStatus: tasksByStatus.map((task: any) => ({
              statusId: task.status_id,
              statusName: task["status.name"],
              count: parseInt(task.count, 10),
            })),
            tasksByPriority: tasksByPriority.reduce(
              (acc: Record<string, number>, task: any) => {
                acc[task.priority] = parseInt(task.count, 10);
                return acc;
              },
              {}
            ),
          },
        };
      });
    } catch (error: any) {
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }
}
