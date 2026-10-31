/* Campaign API routes — backed by Cloudflare D1.
 *
 * GET    /api/campaigns        → list user's campaigns
 * POST   /api/campaigns        → create or update a campaign
 * DELETE /api/campaigns        → delete a campaign (id in body)
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { makeDb, dbGetMany, dbGetOne, dbExec, type Db } from "@/lib/db";
import { verifySession, getSessionToken } from "@/lib/auth";

async function requireUser(env: unknown): Promise<{ db: Db; userId: string }> {
  const request = getRequest();
  const token = request ? getSessionToken(request) : null;
  const user = token ? await verifySession(env, token) : null;
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return { db: makeDb(env), userId: user.id };
}

function campaignRowToObject(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row["id"],
    name: row["name"],
    artist: row["artist"],
    kind: row["kind"],
    targetImage: row["target_image"],
    aspect: Number(row["aspect"]),
    quality: row["quality"] ? JSON.parse(row["quality"] as string) : undefined,
    targets: row["targets"] ? JSON.parse(row["targets"] as string) : undefined,
    layers: row["layers"] ? JSON.parse(row["layers"] as string) : [],
    mindUrl: row["mind_url"] ?? undefined,
    createdAt: new Date(row["created_at"] as string).getTime(),
    updatedAt: new Date(row["updated_at"] as string).getTime(),
  };
}

export const Route = createFileRoute("/api/campaigns/$")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const { db, userId } = await requireUser(env);
        const rows = await dbGetMany(
          db,
          "SELECT * FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC",
          userId,
        );
        return new Response(JSON.stringify(rows.map(campaignRowToObject)), {
          headers: { "content-type": "application/json" },
        });
      },

      POST: async ({ context, request }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const { db, userId } = await requireUser(env);
        const body = (await request.json()) as {
          id: string;
          name: string;
          artist: string;
          kind: string;
          targetImage: string;
          aspect: number;
          quality?: string;
          targets?: string;
          layers?: string;
          mindUrl?: string | null;
          createdAt: number;
          updatedAt: number;
        };
        await dbExec(
          db,
          `INSERT INTO campaigns (id, owner_id, name, artist, kind, target_image, aspect, quality, targets, layers, mind_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             owner_id=excluded.owner_id, name=excluded.name, artist=excluded.artist,
             kind=excluded.kind, target_image=excluded.target_image, aspect=excluded.aspect,
             quality=excluded.quality, targets=excluded.targets, layers=excluded.layers,
             mind_url=excluded.mind_url, updated_at=excluded.updated_at`,
          body.id,
          userId,
          body.name,
          body.artist,
          body.kind,
          body.targetImage,
          body.aspect,
          body.quality ?? null,
          body.targets ?? null,
          body.layers ?? null,
          body.mindUrl ?? null,
          new Date(body.createdAt).toISOString(),
          new Date(body.updatedAt).toISOString(),
        );
        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      },

      DELETE: async ({ context, request }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const { db, userId } = await requireUser(env);
        const body = (await request.json()) as { id: string };
        await dbExec(db, "DELETE FROM campaigns WHERE id = ? AND owner_id = ?", body.id, userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
