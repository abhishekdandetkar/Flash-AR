/* Cloudflare Workers type declarations for D1 and R2 bindings.
 * These are used by the server routes and middleware. */

declare interface D1Database {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => D1PreparedStatement;
  };
  exec: (sql: string) => Promise<{ success: boolean }>;
  batch: (statements: { sql: string; params?: unknown[] }[]) => Promise<unknown[]>;
}

declare interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  first: () => Promise<Record<string, unknown> | null>;
  all: () => Promise<{ results: Record<string, unknown>[] }>;
  run: () => Promise<{
    success: boolean;
    meta?: { changes?: number; last_row_id?: number | null };
  }>;
}

declare interface R2Bucket {
  get: (key: string) => Promise<{
    body: ReadableStream | null;
    arrayBuffer: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
  } | null>;
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream,
    opts?: { contentType?: string },
  ) => Promise<void>;
  list: () => Promise<{ objects: { key: string }[] }>;
  delete: (keys: string[]) => Promise<void>;
}

declare interface CloudflareEnv {
  DB?: D1Database;
  ASSETS?: R2Bucket;
  SESSION_SECRET?: string;
}
