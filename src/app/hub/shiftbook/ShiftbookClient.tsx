"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftbookState } from "@/lib/shiftbook/engine";
import { bootShiftbook, type ShiftbookStore } from "./boot";
import { MARKUP } from "./markup";
import "./shiftbook.css";


function newToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export default function ShiftbookClient({ userId, email }: { userId: string; email: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const supabase = createClient();
    const table = () => supabase.from("shiftbook_state");

    const store: ShiftbookStore = {
      async load() {
        const { data, error } = await table().select("data, calendar_token").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        return {
          data: data && data.data && Object.keys(data.data).length ? (data.data as ShiftbookState) : null,
          calendarToken: data?.calendar_token ?? null,
        };
      },
      async save(state) {
        const { data, error } = await table()
          .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
          .select("calendar_token")
          .single();
        if (error) throw error;
        return data?.calendar_token ?? null;
      },
      async resetCalendarToken() {
        const token = newToken();
        const { error } = await table().update({ calendar_token: token }).eq("user_id", userId);
        if (error) throw error;
        return token;
      },
      async changePassword(pw) {
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw error;
      },
    };

    return bootShiftbook({ root: root.current, store, userId, email, origin: window.location.origin });
  }, [userId, email]);

  return (
    <div
      ref={root}
      className="sb"
      // Static markup; all dynamic text is escaped in boot.ts before it is inserted.
      dangerouslySetInnerHTML={{ __html: MARKUP }}
    />
  );
}
