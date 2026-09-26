"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("Task");

  if (!table.assignee_id) {
    await queryInterface.addColumn("Task", "assignee_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addConstraint("Task", {
      fields: ["assignee_id"],
      type: "foreign key",
      name: "fk_tasks_assignee",
      references: {
        table: "User",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("Task");

  if (table.assignee_id) {
    await queryInterface.removeConstraint("Task", "fk_tasks_assignee");
    await queryInterface.removeColumn("Task", "assignee_id");
  }
}
