export default (sequelize: any, DataType: any) => {
  const Workspace = sequelize.define(
    "Workspace",
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
    },
    { tableName: "Workspace", timestamps: true }
  );

  Workspace.associate = (models: any) => {
    Workspace.hasMany(models.Status, {
      foreignKey: "workspace_id",
      as: "statuses",
    });
    Workspace.hasMany(models.User, {
      foreignKey: "workspace_id",
      as: "users",
    });
  };

  return Workspace;
};
