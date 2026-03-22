import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "#9e3d52",
      },
    },
  },
  plugins: [typography()],
} satisfies Config
