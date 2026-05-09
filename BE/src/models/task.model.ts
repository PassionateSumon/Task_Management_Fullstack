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
    Task.belongsTo(models.Status, {
      foreignKey: "status_id",
      as: "status",
    });
  };
  return Task;
};
