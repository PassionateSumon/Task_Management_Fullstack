"use strict";

/**
 * Adds `Task.workspace_id` and makes task tenancy explicit.
 *
 * WHY THIS IS NECESSARY
 * ---------------------
 * `Task` previously carried no workspace column. A task's tenancy was implied
 * entirely through its creator (`Task.user_id -> User.workspace_id`), which
 * produced two defects:
 *
 *   1. `TaskRepositoryV2.findAllForUser()` had no way to express
 *      "every task in my workspace", so it fell back to
 *      `WHERE user_id = <caller>` -- i.e. only tasks the caller CREATED.
 *      Assignment was written to `TaskAssignee` but never read by any filter,
 *      so a task created by one user and assigned to another never appeared on
 *      the assignee's board.
 *
 *   2. Every by-id task read/update/delete resolved a task with a bare
 *      `WHERE id = ?`, so any authenticated user could read, modify and delete
 *      a task belonging to a DIFFERENT workspace. Tenancy was never checked.
 *
 * Storing the workspace on the row fixes both at the data layer: visibility
 * becomes one indexed equality predicate, and the row itself carries the tenant
 * key that authorization needs.
 *
 * BACKFILL
 * --------
 * Existing rows are backfilled from the creator's workspace via a correlated
 * subquery rather than a JOIN so the statement cannot multiply rows. A task
 * whose creator has no workspace (or whose creator row is gone) cannot be
 * attributed to any tenant, so the count is reported and those rows are deleted
 * rather than silently left unowned -- an unowned task would be invisible to
 * every workspace, which is worse than losing it, and it is unreachable garbage
 * by definition.
 *
 * `workspace_id` is added as NULLable first so the backfill can run against real
 * rows, then promoted to NOT NULL. A direct NOT NULL add would fail on any table
 * that already contains rows.
 *
 * IMPLEMENTATION NOTE -- why this is hand-rolled SQL rather than `addColumn` +
 * `changeColumn`
 * ---------------------------------------------------------------------------
 * Both helpers were tried first and both misbehaved on this schema:
 *  - `addColumn(..., { references })` creates an implicitly-named FK
 *    (`task_ibfk_1`), and then `changeColumn` with the same `references` creates
 *    a SECOND one (`Task_workspace_id_foreign_idx`). The table ended up with two
 *    identical foreign keys on the same column.
 *  - `changeColumn` also left the column NULLable: the promotion to NOT NULL did
 *    not take, so the schema silently did not match the model.
 *
 * So the NOT NULL promotion is an explicit `MODIFY COLUMN` and the foreign key
 * is created under one known, checked-for name. The result is deterministic on a
 * fresh database and a no-op if this migration is re-applied.
 */

/** @type {import('sequelize-cli').Migration} */
const FK_NAME = "fk_tasks_workspace";

export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("Task");

  if (!table.workspace_id) {
    // No `references` here on purpose -- the FK is added once, by name, at the
    // end. See the implementation note above.
    await queryInterface.addColumn("Task", "workspace_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }

  // --------------------------------------------------------------- backfill
  // Correlated subquery: no JOIN, so no row multiplication.
  await queryInterface.sequelize.query(`
    UPDATE \`task\` t
       SET t.workspace_id = (
             SELECT u.workspace_id
               FROM \`user\` u
              WHERE u.id = t.user_id
           )
     WHERE t.workspace_id IS NULL
  `);

  // ------------------------------------------------------ drop unattributable
  // A task whose creator has no workspace belongs to no tenant. Report the ids
  // so any loss is visible in migration output rather than silent.
  const [unowned] = await queryInterface.sequelize.query(
    `SELECT id FROM \`task\` WHERE workspace_id IS NULL`
  );
  if (unowned.length > 0) {
    const ids = unowned.map((r) => r.id);
    // eslint-disable-next-line no-console
    console.warn(
      `[migrate:add-task-workspace] ${ids.length} task(s) had a creator with no ` +
        `workspace and could not be attributed to a tenant; they were deleted. ` +
        `Task ids: ${ids.join(", ")}`
    );
    // Remove join rows first so no orphan TaskAssignee rows are left behind.
    await queryInterface.sequelize.query(
      `DELETE FROM \`taskassignee\` WHERE task_id IN (${ids.join(",")})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM \`task\` WHERE id IN (${ids.join(",")})`
    );
  }

  // ------------------------------------------------------- promote to NOT NULL
  // Explicit MODIFY: `changeColumn` did not apply the nullability on this
  // schema, which would leave the DB disagreeing with the model.
  await queryInterface.sequelize.query(`
    ALTER TABLE \`task\`
      MODIFY COLUMN \`workspace_id\` INT NOT NULL
  `);

  // ---------------------------------------------------------------- foreign key
  // Added only if the column has no FK yet, and always under FK_NAME, so the
  // table can never end up with two identical constraints.
  const [existingFks] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'task'
       AND COLUMN_NAME = 'workspace_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  if (existingFks.length === 0) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`task\`
        ADD CONSTRAINT \`${FK_NAME}\`
        FOREIGN KEY (\`workspace_id\`)
        REFERENCES \`workspace\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    `);
  }

  // ------------------------------------------------------------------ index
  // The board query is `WHERE workspace_id = ? [AND ...filters] ORDER BY
  // createdAt DESC`. Without this index every board load is a full table scan,
  // and the scan grows with the whole install rather than with one workspace.
  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`task\``);
  const hasIndex = (indexes ?? []).some(
    (i) => i.Key_name === "idx_task_workspace_created"
  );
  if (!hasIndex) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`task\`
        ADD INDEX \`idx_task_workspace_created\` (\`workspace_id\`, \`createdAt\`)
    `);
  }
}

export async function down(queryInterface) {
  // Drop every FK on the column, whatever it is named. The two implicitly-named
  // ones from an earlier revision of this migration may still be present.
  const [fks] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'task'
       AND COLUMN_NAME = 'workspace_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  for (const fk of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`task\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
    );
  }

  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`task\``);
  if ((indexes ?? []).some((i) => i.Key_name === "idx_task_workspace_created")) {
    await queryInterface.removeIndex("Task", "idx_task_workspace_created");
  }

  const table = await queryInterface.describeTable("Task");
  if (table.workspace_id) {
    await queryInterface.removeColumn("Task", "workspace_id");
  }
}
