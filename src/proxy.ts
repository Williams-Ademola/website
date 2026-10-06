import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the private area and login touch auth; the rest of the site is untouched.
export const config = {
  matcher: ["/hub/:path*", "/login", "/auth/:path*"],
};
