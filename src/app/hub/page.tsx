import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getUser, isOwner } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "hub" }

type Tool = { href: string; name: string; blurb: string; key: string }

export default async function HubPage() {
  const user = await getUser()
  if (!user) redirect("/login?next=/hub")
  const owner = isOwner(user.email)

  const tools: Tool[] = [
    {
      href: "/hub/shiftbook",
      name: "shiftbook",
      key: "1",
      blurb: "your shifts, live pay and paycheque estimates, synced to your calendar.",
    },
  ]
  if (owner) {
    tools.push({
      href: "/hub/semester",
      name: "fall 2026",
      key: "2",
      blurb: "semester plan, deadlines and grade targets. only you can see this.",
    })
  }

  return (
    <main>
      <h1 className="text-4xl font-bold mb-2 text-white">
        <span className="text-accent mr-2">*</span>hub
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-gray-500 mb-10">
        <span>signed in as {user.email}</span>
        <form method="post" action="/auth/signout">
          <button type="submit" className="hover:text-accent transition-colors">
            [sign out]
          </button>
        </form>
      </div>
      <ul className="space-y-6">
        {tools.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="group block">
              <span className="text-white group-hover:text-accent transition-colors">
                [{t.key}] {t.name}
              </span>
              <span className="block text-sm text-gray-500 mt-1">{t.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
