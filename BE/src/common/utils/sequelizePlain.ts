/**
 * Sequelize helpers for turning model instances into plain JSON objects.
 *
 * Why this exists: a Sequelize model instance is not a plain object. It keeps
 * its column values in a nested `dataValues` property and carries internal
 * bookkeeping (`_previousDataValues`, `_changed`, `_options`, `uniqno`, ...)
 * alongside them. `JSON.stringify` hides all of that because the instance
 * defines `toJSON()`, which flattens it to its column values.
 *
 * Object rest/spread does NOT: `const { password, ...rest } = instance` copies
 * the instance's own enumerable properties, producing a plain object whose keys
 * are `dataValues`, `_options`, ... rather than the column names. Any consumer
 * that then reads `entity.name` gets `undefined`, and the response body leaks
 * the internal structure (and, if a query ever stops excluding a column, the
 * value nested inside `dataValues`).
 *
 * Always run a model instance through `toPlain()` before destructuring it or
 * handing it to a response envelope.
 */

/** Any Sequelize model instance, or anything already plain. */
type MaybeInstance = Record<string, any> | null | undefined;

/**
 * Converts a Sequelize model instance to a plain object of its column values.
 * Returns `null` for nullish input and passes plain objects through unchanged.
 */
export function toPlain<T = Record<string, any>>(entity: MaybeInstance): T | null {
  if (entity === null || entity === undefined) return null;
  const anyEntity = entity as any;
  if (typeof anyEntity.get === "function") {
    return anyEntity.get({ plain: true }) as T;
  }
  return entity as T;
}

/**
 * Converts a list of Sequelize model instances to plain objects. Mapped rather
 * than spread (`...instances`) so an array is never turned into an
 * `arguments`/`NodeList`-style object.
 */
export function toPlainList<T = Record<string, any>>(entities: unknown): T[] {
  if (!Array.isArray(entities)) return [];
  return entities.map((entity) => toPlain<T>(entity as MaybeInstance)) as T[];
}

/**
 * Returns a plain copy of a user row with the credential columns removed.
 *
 * `SENSITIVE_USER_FIELDS` is stripped *after* flattening so the removal is
 * based on real column names. Password exclusion is also applied at the query
 * level (`attributes: { exclude: [...] }`); this is the second layer, so a
 * missed exclusion upstream can never reach a response body.
 */
export const SENSITIVE_USER_FIELDS = ["password", "otp"] as const;

export function toSafeUser(
  entity: MaybeInstance
): Record<string, any> | null {
  const plain = toPlain<Record<string, any>>(entity);
  if (!plain) return null;
  for (const field of SENSITIVE_USER_FIELDS) {
    delete plain[field];
  }
  return plain;
}
