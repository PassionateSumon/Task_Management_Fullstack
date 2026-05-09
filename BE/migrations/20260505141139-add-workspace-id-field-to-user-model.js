'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("User", "workspace_id", {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface.changeColumn("User", "user_type", {
    type: Sequelize.ENUM("admin", "user", "super_admin"),
    allowNull: false,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("User", "workspace_id");
  await queryInterface.changeColumn("User", "user_type", {
    type: Sequelize.ENUM("admin", "user"),
    allowNull: false,
  });
}

