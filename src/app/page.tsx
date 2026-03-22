import { Header } from "@/components/header"
import { Item, SectionList } from "@/components/section-list"
import { BlogSection } from "@/components/blog-section"
import { LinksSection } from "@/components/links-section"

const workItems: Item[] = [
  {
    title: "mocha",
    role: "co-founder and cto",
    period: "jul 2025 - present",
    description: "building an ai native email client designed for speed and ease of use",
    href: "https://mocha.email",
  },
  {
    title: "ENS labs",
    role: "software engineer",
    period: "feb 2025 - jul 2025",
    description:
      "helped migrate ensjs to namechain and optimized ci for the manager app",
    href: "https://ens.domains",
  },
  {
    title: "leapflow",
    role: "co-founder and cto",
    period: "may 2024 - jun 2025",
    description:
      "headed engineering to develop ai agents that automate repetitive workflows in existing software",
    href: "https://leapflow.tech",
  },
  {
    title: "dimension",
    role: "full-stack engineer",
    period: "nov 2023 - jan 2024",
    description:
      "contributed to a large-scale t3 stack app. worked on real-time presence and chat features",
    href: "https://dimension.dev",
  },
]

const projectItems = [
  {
    title: "BYO-Lisp",
    role: "creator",
    description: "building a lisp interpreter from scratch in c",
    href: "https://github.com/Williams-Ademola/BYO-Lisp",
  },
  {
    title: "Symbolic Differentiation Engine",
    role: "creator",
    description: "an engine that symbolically differentiates mathematical expressions",
    href: "https://github.com/Williams-Ademola/Symbolic-Differentiation-Engine-",
  },
  {
    title: "Light Pollution Detection",
    role: "creator",
    description: "measuring and mapping intensity of light pollution",
    href: "https://github.com/Williams-Ademola/Light-pollution-detection",
  },
  {
    title: "Product Recommendation System",
    role: "creator",
    description: "analyzing user behavior and preferences with java",
    href: "https://github.com/Williams-Ademola/Product-recommendation-system",
  },
  {
    title: "File Based Router",
    role: "creator",
    description: "file based routing implementation with golang",
    href: "https://github.com/Williams-Ademola/File-Based-Router",
  },
]
export default function HomePage() {
  return (
    <>
      <Header />
      <SectionList title="work" items={workItems} />
      <BlogSection />
      <SectionList
        title="projects"
        items={projectItems}
        viewAllHref="/projects"
        viewAllText="all projects"
      />
      <LinksSection />
    </>
  )
}
