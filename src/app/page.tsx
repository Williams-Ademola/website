import { Header } from "@/components/header"
import { Item, SectionList } from "@/components/section-list"
import { BlogSection } from "@/components/blog-section"
import { LinksSection } from "@/components/links-section"
import { WritingSection } from "@/components/writing-section"

const workItems: Item[] = [
  {
    title: "Crest",
    role: "co-founder and cto",
    period: "jul 2025 - present",
    description: "building an ai personal assistant for the linux ecosystem",
    href: "tba",
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
    <WritingSection />
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
