import type { Metadata } from "next";
import SemesterPlanner from "./planner";

export const metadata: Metadata = {
  title: "fall 2026 | Williams Ogunjide",
  description: "my fall 2026 semester plan: readings, deadlines and grade targets.",
  robots: { index: false, follow: false },
};

export default function SemesterPage() {
  return <SemesterPlanner />;
}
