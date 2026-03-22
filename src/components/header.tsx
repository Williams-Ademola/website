import { ScrambleText } from "@/components/scramble-text"
import { MapPin, Building2 } from "lucide-react"

export function Header() {
  return (
    <header className="mb-16 space-y-4">
      <h1 className="text-4xl font-bold mb-4 animate-fade-in text-white">
        <span className="inline-block">
          <ScrambleText text="williams ogunjide" />
        </span>
      </h1>
      <div className="flex flex-col gap-2 text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          winnipeg, canada.
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Crest
        </div>
      </div>
      <p className="leading-relaxed animate-fade-in-up">
        Hi there, I'm Williams. I'm a CS and Math undergrad student with a near crippling tac fps addiction. 
        I like consuming lovecraftian literature and building things. 
        I enjoy stochastic calculus, machine learning and making my problems go away with the terminal. 
      </p>
    </header>
  )
}
