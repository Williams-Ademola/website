"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setBusy(false)
      setError(
        /invalid login/i.test(error.message)
          ? "that email and password don't match. forgot it? ask william to reset it."
          : /fetch|network/i.test(error.message)
            ? "couldn't reach the login server. check your connection and try again."
            : error.message.toLowerCase(),
      )
      return
    }
    router.replace(next)
    router.refresh()
  }

  const input =
    "mt-2 w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-base text-gray-200 outline-none focus:border-accent/60"

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <label className="block text-sm text-gray-400">
        email
        <input
          className={input}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm text-gray-400">
        password
        <input
          className={input}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-accent">
          [{error}]
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="text-white hover:text-accent transition-colors disabled:opacity-50"
      >
        {busy ? "[signing in…]" : "[sign in]"}
      </button>
    </form>
  )
}
