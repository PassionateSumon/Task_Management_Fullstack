export default (sequelize: any, DataType: any) => {
  const UserRole = sequelize.define(
    "UserRole",
    {
      user_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      role_id: {
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    { tableName: "UserRole", timestamps: false }
  );

  UserRole.associate = (models: any) => {
    UserRole.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    UserRole.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });
  };

  return UserRole;
};
