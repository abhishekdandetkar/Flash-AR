/* Cookie-based session auth backed by D1. Replaces Supabase Auth.
 *
 * Flow:
 *   - signUp / signInWithPassword → verify credentials, issue a signed JWT
 *   - JWT stored in httpOnly cookie `flash-ar-session`
 *   - Server routes/middleware validate the cookie on each request
 *   - Client reads session via /api/auth/session server route
 */

import { makeDb, dbGetOne } from "./db";

export interface SessionUser {
  id: string;
  email: string;
}

const COOKIE_NAME = "flash-ar-session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getJwtSecret(env: unknown): string {
  const secret = (env as { SESSION_SECRET?: string }).SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured. Set it in wrangler secrets or .dev.vars.");
  }
  return secret;
}

/** Verify a session JWT and return the user, or null if invalid/expired. */
export async function verifySession(
  env: unknown,
  token: string | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const secret = getJwtSecret(env);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sig = base64UrlDecode(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig as unknown as BufferSource,
      data as unknown as BufferSource,
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as {
      sub: string;
      email: string;
      exp: number;
    };
    if (Date.now() >= payload.exp * 1000) return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Issue a new session JWT for a user. */
export async function signSessionToken(
  env: unknown,
  user: { id: string; email: string },
): Promise<string> {
  const secret = getJwtSecret(env);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    exp: now + COOKIE_MAX_AGE,
    iat: now,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = encoder.encode(`${header}.${body}`);
  const sig = await crypto.subtle.sign("HMAC", key, signingInput);
  return `${header}.${body}.${b64url(sig)}`;
}

/** Set the session cookie on a Response. */
export function setSessionCookie(response: Response, token: string): Response {
  const headers = new Headers(response.headers);
  headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Path=/`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Read the session token from a request's cookies. */
export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

/** Look up a user by email in the D1 users table. */
export async function getUserByEmail(
  env: unknown,
  email: string,
): Promise<{ id: string; email: string; passwordHash: string } | null> {
  const db = makeDb(env);
  const row = await dbGetOne(
    db,
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    email,
  );
  if (!row) return null;
  return {
    id: (row["id"] as string) ?? "",
    email: (row["email"] as string) ?? "",
    passwordHash: (row["password_hash"] as string) ?? "",
  };
}

/** Create a new user (email + hashed password). */
export async function createUser(
  env: unknown,
  email: string,
  passwordHash: string,
): Promise<string> {
  const db = makeDb(env);
  const id = crypto.randomUUID();
  await dbExec(
    db,
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    id,
    email,
    passwordHash,
    new Date().toISOString(),
  );
  return id;
}

/** Hash a password with SHA-256 + salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const material = encoder.encode(password + saltToHex(salt));
  const hash = await crypto.subtle.digest("SHA-256", material);
  return `${saltToHex(salt)}:${b64url(hash)}`;
}

/** Verify a password against a stored hash. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashB64] = storedHash.split(":");
  if (!saltHex || !hashB64) return false;
  const salt = hexToBytes(saltHex);
  const encoder = new TextEncoder();
  const material = encoder.encode(password + saltHex);
  const hash = await crypto.subtle.digest("SHA-256", material);
  const expected = base64UrlDecode(hashB64);
  const hashBytes = new Uint8Array(hash);
  const expectedBytes = new Uint8Array(expected);
  if (hashBytes.byteLength !== expectedBytes.byteLength) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < hashBytes.length; i++) diff |= (hashBytes[i] ?? 0) ^ (expectedBytes[i] ?? 0);
  return diff === 0;
}

function b64url(data: string | ArrayBuffer): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function saltToHex(salt: Uint8Array): string {
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function dbExec(
  db: ReturnType<typeof makeDb>,
  sql: string,
  ...params: unknown[]
): Promise<{ success: boolean; changes: number }> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .run();
  return { success: result.success, changes: result.meta?.changes ?? 0 };
}
