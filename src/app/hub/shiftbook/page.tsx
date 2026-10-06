import type { Metadata, Viewport } from "next"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/server"
import ShiftbookClient from "./ShiftbookClient"

export const metadata: Metadata = { title: "shiftbook" }
export const viewport: Viewport = { viewportFit: "cover" }

export default async function ShiftbookPage() {
  const user = await getUser()
  if (!user) redirect("/login?next=/hub/shiftbook")
  return <ShiftbookClient userId={user.id} email={user.email ?? ""} />
}
