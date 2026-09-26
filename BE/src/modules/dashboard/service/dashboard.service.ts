import { statusCodes } from "../../../common/constants/constants.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { StatusRepository } from "../../../infrastructure/persistence/status.repository.js";
import { TaskRepositoryV2 } from "../../../infrastructure/persistence/task.repository-v2.js";

export class DashboardService {
  constructor(
    private readonly users: UserRepository,
    private readonly tasks: TaskRepositoryV2,
    private readonly statuses: StatusRepository
  ) {}

  async getDashboard(currentUserId: number) {
    try {
      return await withTransaction(async (transaction) => {
        const currentDate = new Date();

        const userWorkspaceId = await this.users.findWorkspaceIdByUserId(
          currentUserId,
          transaction
        );

        const activeUsersCount = await this.users.countActiveNonAdminUsers(
          userWorkspaceId,
          transaction
        );

        const totalTasks = await this.tasks.countAll(
          userWorkspaceId,
          transaction
        ); 

        const tasksByStatusRaw = await this.statuses.findAllWithTasks(
          userWorkspaceId,
          transaction
        );

        const tasksByPriorityRaw = await this.tasks.findGroupedByPriority(
          userWorkspaceId, 
          transaction
        );

        const overdueTasks = await this.tasks.countOverdue(
          currentDate,
          userWorkspaceId,
          transaction
        );

        const recentTasks = await this.tasks.findRecentWithUserAndStatus(
          userWorkspaceId,
          transaction
        );

        const recentUsers = await this.users.findRecentUsersForDashboard(
          userWorkspaceId, 
          transaction
        );

        const currentYear = currentDate.getFullYear();
        const monthlyTasks = await this.tasks.findMonthlyTasks(
          currentYear,
          userWorkspaceId,
          transaction
        );

        const currentMonth = currentDate.getMonth();
        const weeklyTasks = await this.tasks.findWeeklyTasks(
          currentYear,
          currentMonth,
          userWorkspaceId,
          transaction
        );

        const yearlyTasks = await this.tasks.findYearlyByStartDate(
          userWorkspaceId,
          transaction
        );

        const completedTasks = await this.tasks.countCompleted(
          userWorkspaceId, 
          transaction
        );

        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const tasksPerUser = await this.tasks.findTasksPerUser(
          userWorkspaceId,
          transaction
        );

        const avgTaskDuration = await this.tasks.findAvgDurationCompleted(
          userWorkspaceId,
          transaction
        );

        const thirtyDaysAgo = new Date(
          currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const statusTrends = await this.tasks.findStatusTrends(
          thirtyDaysAgo,
          userWorkspaceId,
          transaction
        );

        const activeUsersLast30Days =
          await this.users.countUsersWithRecentTaskActivity(
            thirtyDaysAgo,
            userWorkspaceId,
            transaction
          );

        const allIsActiveUsers =
          await this.users.findAllBasicUsersWithActiveFlag(
            userWorkspaceId, 
            transaction
          );

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

  /**
   * Personal dashboard for the caller.
   *
   * WORKSPACE-scoped, and it must stay that way. The board is workspace-wide, so
   * a dashboard counting `WHERE user_id = caller` reported 0 tasks for a member
   * whose board listed 12 -- the summary contradicted the page it summarised.
   * Both now read the same tenant, resolved server-side from the caller's own
   * user row; no client input participates in the tenancy decision.
   *
   * Authorization (`task.view`) is enforced by `PermissionGuard` on the route,
   * same as the board it mirrors. This method does not re-check it.
   */
  async getDashboardForUser(userId: number) {
    try {
      const workspaceId = await this.users.findWorkspaceIdByUserId(userId);
      if (workspaceId == null) {
        return {
          statusCode: statusCodes.PERMISSION_DENIED,
          message: "No workspace assigned to this account",
          data: null,
        };
      }

      return await withTransaction(async (transaction) => {
        const tasks = await this.tasks.findAllInWorkspaceWithStatus(
          workspaceId,
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

        const tasksByStatus =
          await this.tasks.findGroupedByStatusInWorkspace(
            workspaceId,
            transaction
          );
        const tasksByPriority =
          await this.tasks.findGroupedByPriorityInWorkspace(
            workspaceId,
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
