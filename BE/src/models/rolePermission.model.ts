export default (sequelize: any, DataType: any) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      role_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      permission_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    { tableName: "RolePermission", timestamps: false }
  );

  RolePermission.associate = (models: any) => {
    RolePermission.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
    RolePermission.belongsTo(models.Permission, {
      foreignKey: "permission_id",
      as: "permission",
    });
  };

  return RolePermission;
};
