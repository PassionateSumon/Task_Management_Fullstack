"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Workspace", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addColumn("Status", "workspace_id", {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: "Workspace", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  });

  await queryInterface.addColumn("Status", "is_system", {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn("Status", "is_final", {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.bulkInsert("Workspace", [
    {
      name: "Default",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [rows] = await queryInterface.sequelize.query(
    "SELECT id FROM Workspace ORDER BY id ASC LIMIT 1"
  );
  const defaultWorkspaceId = rows[0].id;

  await queryInterface.sequelize.query(
    "UPDATE `Status` SET `workspace_id` = :wid WHERE `workspace_id` IS NULL",
    { replacements: { wid: defaultWorkspaceId } }
  );

  await queryInterface.sequelize.query(
    "UPDATE `User` SET `workspace_id` = :wid WHERE `workspace_id` IS NULL",
    { replacements: { wid: defaultWorkspaceId } }
  );

  await queryInterface.sequelize.query(
    "UPDATE `Status` SET `is_system` = 1, `is_final` = 0 WHERE `workspace_id` = :wid AND LOWER(`name`) IN ('todo', 'in progress', 'in-progress', 'done', 'completed')",
    { replacements: { wid: defaultWorkspaceId } }
  );

  await queryInterface.sequelize.query(
    "UPDATE `Status` s JOIN (SELECT MIN(id) AS id FROM `Status` WHERE `workspace_id` = :wid AND LOWER(`name`) IN ('done', 'completed')) t ON s.id = t.id SET s.is_final = 1",
    { replacements: { wid: defaultWorkspaceId } }
  );

  await queryInterface.changeColumn("Status", "workspace_id", {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: "Workspace", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  });

  await queryInterface.addConstraint("Status", {
    fields: ["workspace_id", "name"],
    type: "unique",
    name: "uniq_status_workspace_name",
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeConstraint("Status", "uniq_status_workspace_name");
  await queryInterface.changeColumn("Status", "workspace_id", {
    type: Sequelize.INTEGER,
    allowNull: true,
  });
  await queryInterface.removeColumn("Status", "is_final");
  await queryInterface.removeColumn("Status", "is_system");
  await queryInterface.removeColumn("Status", "workspace_id");
  await queryInterface.dropTable("Workspace");
}
