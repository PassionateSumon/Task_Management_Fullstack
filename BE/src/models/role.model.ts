export default (sequelize: any, DataType: any) => {
  const Role = sequelize.define(
    "Role",
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
      workspace_id: {
        type: DataType.INTEGER,
        allowNull: false,
      },
      /**
       * Mirrors the legacy `User.user_type` ENUM so that RBAC remains the single
       * source of truth while the existing `JWTUtil.verifyRole()` guard keeps
       * working. Only ever set on system roles; dynamic roles leave it null and
       * therefore cannot grant administrative privileges.
       */
      user_type: {
        type: DataType.ENUM("admin", "user"),
        allowNull: true,
        defaultValue: null,
      },
      is_system: {
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    { tableName: "Role", timestamps: true }
  );

  Role.associate = (models: any) => {
    Role.belongsTo(models.Workspace, {
      foreignKey: "workspace_id",
      as: "workspace",
    });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "role_id",
      otherKey: "permission_id",
      as: "permissions",
    });
    Role.hasMany(models.UserRole, { foreignKey: "role_id", as: "userRoles" });
  };

  return Role;
};
