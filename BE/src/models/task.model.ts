export default (sequelize: any, DataType: any) => {
  const Task = sequelize.define(
    "Task",
    {
      id: {
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      task_name: {
        type: DataType.STRING,
        allowNull: false,
      },
      task_description: {
        type: DataType.TEXT,
        allowNull: true,
      },
      user_id: {
        type: DataType.INTEGER,
        allowNull: false,
      },
      /**
       * The workspace that owns this task.
       *
       * This is the tenant key. It used to be absent, which meant a task's
       * workspace could only be inferred from its creator -- so the board query
       * had no way to say "every task in my workspace" and fell back to
       * `user_id = caller` (own tasks only), and by-id lookups were not
       * workspace-scoped at all.
       *
       * `user_id` is retained as "who created this", which is a real, separate
       * fact from tenancy and is still used for the duplicate check and audit.
       */
      workspace_id: {
        type: DataType.INTEGER,
        allowNull: false,
      },
      assignee_id: {
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      status_id: {
        type: DataType.INTEGER,
        allowNull: false,
      },
      priority: {
        type: DataType.STRING,
        allowNull: true,
        validate: {
          isIn: [["high", "medium", "low", null]],
        },
      },
      start_date: {
        type: DataType.DATE,
        allowNull: true,
      },
      end_date: {
        type: DataType.DATE,
        allowNull: true,
      },
      completed_date: {
        type: DataType.DATE,
        allowNull: true,
      },
    },
    { tableName: "Task", timestamps: true }
  );
  Task.associate = (models: any) => {
    Task.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    // Tenant key. `Status` uses the same workspace-scoped tenancy model, so a
    // task and the status it sits in always share a workspace.
    Task.belongsTo(models.Workspace, {
      foreignKey: "workspace_id",
      as: "workspace",
    });
    Task.belongsTo(models.User, {
      foreignKey: "assignee_id",
      as: "assignee",
      allowNull: true,
    });
    Task.belongsToMany(models.User, {
      through: models.TaskAssignee,
      foreignKey: "task_id",
      otherKey: "user_id",
      as: "assignees",
    });
    Task.belongsTo(models.Status, {
      foreignKey: "status_id",
      as: "status",
    });
  };
  return Task;
};
