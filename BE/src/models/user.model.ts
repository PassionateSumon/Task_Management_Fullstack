export default (sequelize: any, DataType: any) => {
  const User = sequelize.define(
    "User",
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
      email: {
        type: DataType.STRING,
        allowNull: false,
      },
      username: {
        type: DataType.STRING,
        allowNull: true,
      },
      password: {
        type: DataType.STRING,
        allowNull: false,
      },
      otp: {
        type: DataType.STRING,
        allowNull: true,
        defaultValue: null,
      },
      isOtpVerified: {
        type: DataType.BOOLEAN,
        allowNull: false,
      },
      isActive: {
        type: DataType.BOOLEAN,
        allowNull: false,
      },
      is_reset_password: {
        type: DataType.BOOLEAN,
        allowNull: false,
      },
      lastLogoutAt: {
        type: DataType.DATE,
        allowNull: true,
        defaultValue: null,
      },
      user_type: {
        type: DataType.ENUM("admin", "user", "super_admin"),
        allowNull: false,
      },
      workspace_id: {
        type: DataType.INTEGER,
        allowNull: true,
      },
    },
    { tableName: "User", timestamps: true }
  );
  User.associate = (models: any) => {
    User.hasMany(models.Task, {
      foreignKey: "user_id",
      as: "tasks",
      onDelete: "CASCADE",
    });
    User.hasMany(models.RefreshToken, { foreignKey: "userId" });
  };
  return User;
};
