export default (sequelize: any, DataType: any) => {
  const Status = sequelize.define(
    "Status",
    {
      id: {
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataType.STRING,
        allowNull: false,
      },
      workspace_id: {
        type: DataType.INTEGER,
        allowNull: false,
      },
      is_system: {
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_final: {
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    { tableName: "Status", timestamps: true }
  );
  Status.associate = (models: any) => {
    Status.belongsTo(models.Workspace, {
      foreignKey: "workspace_id",
      as: "workspace",
    });
    Status.hasMany(models.Task, {
      foreignKey: "status_id",
      as: "tasks",
    });
  };
  return Status;
};
