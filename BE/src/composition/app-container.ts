import { db } from "../config/db.js";
import type { DbRegistry } from "../infrastructure/persistence/db-registry.types.js";
import { UserRepository } from "../infrastructure/persistence/user.repository.js";
import { RefreshTokenRepository } from "../infrastructure/persistence/refresh-token.repository.js";
import { StatusRepository } from "../infrastructure/persistence/status.repository.js";
import { TaskRepository } from "../infrastructure/persistence/task.repository.js";
import { WorkspaceRepository } from "../infrastructure/persistence/workspace.repository.js";
import { AuthService } from "../modules/auth/service/auth.service.js";
import { UserService } from "../modules/user/service/user.service.js";
import { TaskService } from "../modules/task/service/task.service.js";
import { StatusService } from "../modules/status/service/status.service.js";
import { DashboardService } from "../modules/dashboard/service/dashboard.service.js";

const registry = db as DbRegistry;

export class AppContainer {
  readonly userRepository: UserRepository;
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly workspaceRepository: WorkspaceRepository;
  readonly statusRepository: StatusRepository;
  readonly taskRepository: TaskRepository;

  readonly authService: AuthService;
  readonly userService: UserService;
  readonly taskService: TaskService;
  readonly statusService: StatusService;
  readonly dashboardService: DashboardService;

  constructor() {
    this.userRepository = new UserRepository(registry);
    this.refreshTokenRepository = new RefreshTokenRepository(registry);
    this.workspaceRepository = new WorkspaceRepository(registry);
    this.statusRepository = new StatusRepository(registry);
    this.taskRepository = new TaskRepository(registry);

    this.authService = new AuthService(
      this.userRepository,
      this.refreshTokenRepository,
      this.workspaceRepository,
      this.statusRepository
    );
    this.userService = new UserService(this.userRepository);
    this.taskService = new TaskService(
      this.taskRepository,
      this.statusRepository,
      this.userRepository
    );
    this.statusService = new StatusService(
      this.statusRepository,
      this.taskRepository,
      this.userRepository
    );
    this.dashboardService = new DashboardService(
      this.userRepository,
      this.taskRepository,
      this.statusRepository
    );
  }
}

let singleton: AppContainer | null = null;

export function getAppContainer(): AppContainer {
  if (!singleton) {
    singleton = new AppContainer();
  }
  return singleton;
}
