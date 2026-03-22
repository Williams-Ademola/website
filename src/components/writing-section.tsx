
import Link from "next/link"

const posts = [
  {
    title: "The math behind your popularity",
    href: "https://williamsindepth.substack.com/p/the-math-behind-your-popularity",
  },
  {
    title: "In respect to Curiosity",
    href: "https://williamsindepth.substack.com/p/in-respect-to-curiosity",
  },
  {
    title: "Overplan the coding project",
    href: "https://williamsindepth.substack.com/p/overplan-the-coding-project",
  },
  {
    title: "Reading Documentation is fun?",
    href: "https://williamsindepth.substack.com/p/reading-documentation-is-fun",
  },
  {
    title: "Falling In love with Mathematics",
    href: "https://williamsindepth.substack.com/p/falling-in-love-with-abstractions",
  },
]

export function WritingSection() {
  return (
    <section className="mb-16 animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
        <span className="text-accent mr-2">*</span> writing
      </h2>
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.href}>
            <Link
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-accent transition-colors duration-200 text-sm"
            >
              {post.title}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          href="https://williamsindepth.substack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-600 hover:text-accent transition-colors duration-200"
        >
          all posts →
        </Link>
      </div>
    </section>
  )
}
