import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";
import { buildIcs } from "@/lib/shiftbook/ics";

// Private calendar feed: /api/shiftbook/calendar/<token>.ics
// The token is the only key, so the lookup goes through a database function that returns one person's
// shifts for an exact token match and nothing else.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!supabaseConfigured || !/^[a-f0-9]{32,128}$/i.test(token)) {
    return new Response("Not found", { status: 404 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("shiftbook_feed", { p_token: token });
  if (error || !data) return new Response("Not found", { status: 404 });

  const host = new URL(request.url).host;
  const body = buildIcs(data, { defaultTz: process.env.SHIFTBOOK_DEFAULT_TZ || "America/Winnipeg", host });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="shifts.ics"',
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
