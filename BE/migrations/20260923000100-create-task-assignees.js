"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const hasTable = tables.some((table) =>
    String(table).toLowerCase() === "taskassignee"
  );

  if (!hasTable) {
    await queryInterface.createTable("TaskAssignee", {
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "Task", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "User", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });
  }

  const taskTable = await queryInterface.describeTable("Task");
  if (taskTable.assignee_id) {
    await queryInterface.sequelize.query(
      "INSERT IGNORE INTO TaskAssignee (task_id, user_id) SELECT id, assignee_id FROM Task WHERE assignee_id IS NOT NULL"
    );
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("TaskAssignee");
}
