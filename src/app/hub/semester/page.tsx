import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser, isOwner } from "@/lib/supabase/server";
import SemesterPlanner from "./planner";

export const metadata: Metadata = {
  title: "fall 2026",
  description: "my fall 2026 semester plan: readings, deadlines and grade targets.",
  robots: { index: false, follow: false },
};

// Owner only. Signed in as the owner, progress syncs through your login; no sync key needed.
export default async function SemesterPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/hub/semester");
  if (!isOwner(user.email)) notFound();
  return <SemesterPlanner sessionSync />;
}
