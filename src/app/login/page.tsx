import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/server"
import { supabaseConfigured } from "@/lib/supabase/env"
import LoginForm from "./LoginForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "sign in",
  robots: { index: false, follow: false },
}

function safeNext(raw: string | string[] | undefined) {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/hub"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const next = safeNext((await searchParams).next)
  if (await getUser()) redirect(next)

  return (
    <main className="max-w-sm">
      <h1 className="text-4xl font-bold mb-4 text-white">
        <span className="text-accent mr-2">*</span>sign in
      </h1>
      <p className="text-sm text-gray-500">
        this part of the site is private. use the email and password you were given.
      </p>
      {supabaseConfigured ? (
        <LoginForm next={next} />
      ) : (
        <p className="mt-8 text-sm text-accent">[sign-in isn&apos;t set up yet: add the supabase keys and redeploy]</p>
      )}
    </main>
  )
}
