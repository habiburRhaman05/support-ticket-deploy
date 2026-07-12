import {
  ArrowRight,
  BarChart3,
  Clock,
  HeadphonesIcon,
  MessageSquare,
  Shield,
  TicketCheck,
  Users,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: TicketCheck,
    title: "Ticket Management",
    desc: "Full Kanban board with drag-and-drop, 6-stage workflow, and auto-assignment",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Internal notes, availability toggle, skill-based routing, and workload balancing",
  },
  {
    icon: MessageSquare,
    title: "Client Portal",
    desc: "Sub-accounts submit and track tickets with real-time stage updates",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "SLA tracking, CSAT ratings, per-agent performance, and audit logs",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Agency Owner, Team Members, and Sub-Accounts with granular permissions",
  },
  {
    icon: Clock,
    title: "Review & Approval",
    desc: "Team Members move tickets up to Review; only Owner approves to close",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <HeadphonesIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Dispatch</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-gray-900"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                <Link href="/connect">Connect your agency</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
            <TicketCheck className="w-4 h-4" />
            Support ticket system for GHL agencies
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Your agency&apos;s
            <span className="text-blue-600"> support desk</span>, simplified
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Manage tickets across all your sub-accounts. Assign, track, review, and
            resolve — all in one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 text-base"
            >
              <Link href="/connect">
                Create your desk
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-xl h-12 px-8 text-base border-gray-200"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-3 text-gray-500">
              A professional support desk built for agencies
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <HeadphonesIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Dispatch</span>
          </div>
          <p className="text-sm text-gray-400">Support ticket system for GHL agencies</p>
        </div>
      </footer>
    </div>
  )
}
