export default (sequelize: any, DataType: any) => {
  const TaskAssignee = sequelize.define(
    "TaskAssignee",
    {
      task_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    { tableName: "TaskAssignee", timestamps: false }
  );

  TaskAssignee.associate = (models: any) => {
    TaskAssignee.belongsTo(models.Task, { foreignKey: "task_id", as: "task" });
    TaskAssignee.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return TaskAssignee;
};
