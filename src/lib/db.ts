/* Cloudflare D1 database wrapper. Accessed via the `DB` binding in wrangler.jsonc.
 * Only available on the server (Workers runtime) — client code must go through
 * TanStack Start server functions or server routes. */

export interface Db {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      first: () => Promise<Record<string, unknown> | null>;
      all: () => Promise<{ results: Record<string, unknown>[] }>;
      run: () => Promise<{
        success: boolean;
        meta?: { changes?: number; last_row_id?: number | null };
      }>;
    };
  };
  exec: (sql: string) => Promise<{ success: boolean }>;
  batch: (statements: { sql: string; params?: unknown[] }[]) => Promise<unknown[]>;
}

export function makeDb(env: unknown): Db {
  const db = (env as { DB?: Db }).DB;
  if (!db) {
    throw new Error(
      "D1 database binding 'DB' is not configured. Add [[d1_databases]] to wrangler.jsonc and run `wrangler d1 create flash-ar`.",
    );
  }
  return db;
}

/** Run a parameterized SELECT that returns at most one row. */
export async function dbGetOne(
  db: Db,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown> | null> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .first();
  return result ?? null;
}

/** Run a parameterized SELECT that returns multiple rows. */
export async function dbGetMany(
  db: Db,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();
  return result.results ?? [];
}

/** Run INSERT/UPDATE/DELETE. Returns changes count. */
export async function dbExec(
  db: Db,
  sql: string,
  ...params: unknown[]
): Promise<{ success: boolean; changes: number; lastRowId: number | null }> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .run();
  return {
    success: result.success,
    changes: result.meta?.changes ?? 0,
    lastRowId: result.meta?.last_row_id ?? null,
  };
}
