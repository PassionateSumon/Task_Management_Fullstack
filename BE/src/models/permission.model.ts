export default (sequelize: any, DataType: any) => {
  const Permission = sequelize.define(
    "Permission",
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
      description: {
        type: DataType.STRING(255),
        allowNull: true,
        defaultValue: null,
      },
      /**
       * NULL for the global system catalogue. A non-null value marks a
       * workspace-private custom permission; roles may only be granted a
       * permission whose workspace is null or equal to the role's workspace.
       */
      workspace_id: {
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      is_system: {
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    { tableName: "Permission", timestamps: true }
  );

  Permission.associate = (models: any) => {
    Permission.belongsTo(models.Workspace, {
      foreignKey: "workspace_id",
      as: "workspace",
    });
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: "permission_id",
      otherKey: "role_id",
      as: "roles",
    });
  };

  return Permission;
};
