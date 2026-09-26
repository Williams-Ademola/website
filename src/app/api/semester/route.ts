import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = "semester-fall-2026";
const MAX_BYTES = 50_000;

function redis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function authorized(req: Request) {
  const secret = process.env.SEMESTER_KEY;
  const given = req.headers.get("x-semester-key");
  return !!secret && !!given && given === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = redis();
  if (!db) return NextResponse.json({ error: "storage not configured" }, { status: 500 });
  const res = await fetch(`${db.url}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${db.token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "storage error" }, { status: 502 });
  const { result } = (await res.json()) as { result: string | null };
  return NextResponse.json({ state: result ? JSON.parse(result) : null });
}

export async function PUT(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = redis();
  if (!db) return NextResponse.json({ error: "storage not configured" }, { status: 500 });
  const body = await req.text();
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || !("done" in parsed) || !("scores" in parsed)) {
    return NextResponse.json({ error: "bad shape" }, { status: 400 });
  }
  const res = await fetch(`${db.url}/set/${KEY}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${db.token}` },
    body: JSON.stringify(parsed),
  });
  if (!res.ok) return NextResponse.json({ error: "storage error" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
