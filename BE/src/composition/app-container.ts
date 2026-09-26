import { db } from "../config/db.js";
import type { DbRegistry } from "../infrastructure/persistence/db-registry.types.js";
import { UserRepository } from "../infrastructure/persistence/user.repository.js";
import { RefreshTokenRepository } from "../infrastructure/persistence/refresh-token.repository.js";
import { StatusRepository } from "../infrastructure/persistence/status.repository.js";
import { TaskRepository } from "../infrastructure/persistence/task.repository.js";
import { WorkspaceRepository } from "../infrastructure/persistence/workspace.repository.js";
import { RoleRepository } from "../infrastructure/persistence/role.repository.js";
import { PermissionRepository } from "../infrastructure/persistence/permission.repository.js";
import { AuthService } from "../modules/auth/service/auth.service.js";
import { UserService } from "../modules/user/service/user.service.js";
import { TaskService } from "../modules/task/service/task.service.js";
import { StatusService } from "../modules/status/service/status.service.js";
import { DashboardService } from "../modules/dashboard/service/dashboard.service.js";
import { RoleService } from "../modules/role/service/role.service.js";
import { PermissionService } from "../modules/permission/service/permission.service.js";
import { TaskRepositoryV2 } from "../infrastructure/persistence/task.repository-v2.js";

const registry = db as DbRegistry;

export class AppContainer {
  readonly userRepository: UserRepository;
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly workspaceRepository: WorkspaceRepository;
  readonly statusRepository: StatusRepository;
  readonly taskRepository: TaskRepositoryV2;
  readonly roleRepository: RoleRepository;
  readonly permissionRepository: PermissionRepository;

  readonly authService: AuthService;
  readonly userService: UserService;
  readonly taskService: TaskService;
  readonly statusService: StatusService;
  readonly dashboardService: DashboardService;
  readonly roleService: RoleService;
  readonly permissionService: PermissionService;

  constructor() {
    this.userRepository = new UserRepository(registry);
    this.refreshTokenRepository = new RefreshTokenRepository(registry);
    this.workspaceRepository = new WorkspaceRepository(registry);
    this.statusRepository = new StatusRepository(registry);
    this.taskRepository = new TaskRepositoryV2(registry);
    this.roleRepository = new RoleRepository(registry);
    this.permissionRepository = new PermissionRepository(registry);

    this.authService = new AuthService(
      this.userRepository,
      this.refreshTokenRepository,
      this.workspaceRepository,
      this.statusRepository,
      this.roleRepository,
      this.permissionRepository
    );
    this.userService = new UserService(
      this.userRepository,
      this.roleRepository,
      this.permissionRepository
    );
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
    this.roleService = new RoleService(
      this.roleRepository,
      this.permissionRepository,
      this.userRepository
    );
    this.permissionService = new PermissionService(
      this.permissionRepository,
      this.userRepository
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
