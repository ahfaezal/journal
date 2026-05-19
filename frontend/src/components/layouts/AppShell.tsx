"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  FileText,
  FolderKanban,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Library,
  Network,
  PenLine,
  PlusCircle,
  ScrollText,
  SearchCheck,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Wand2,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: ReactNode;
  href: string;
};

const menuGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "PROJECT",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-4" /> },
      { label: "My Projects", href: "/projects", icon: <FolderKanban className="size-4" /> },
      { label: "New Project", href: "/projects/new", icon: <PlusCircle className="size-4" /> },
      { label: "Upload Thesis", href: "/upload-thesis", icon: <UploadCloud className="size-4" /> },
      { label: "MFL / References", href: "/references", icon: <Library className="size-4" /> },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "Citation Map", href: "/thesis-intelligence/citation-map", icon: <GitBranch className="size-4" /> },
      { label: "Table Map", href: "/thesis-intelligence/table-map", icon: <BarChart3 className="size-4" /> },
      { label: "Objective Map", href: "/thesis-intelligence/objective-map", icon: <SearchCheck className="size-4" /> },
      { label: "Thesis Audit", href: "/thesis-intelligence/audit", icon: <ShieldCheck className="size-4" /> },
      { label: "Knowledge Graph", href: "/thesis-intelligence/knowledge-graph", icon: <Network className="size-4" /> },
    ],
  },
  {
    title: "JOURNAL WORKFLOW",
    items: [
      { label: "Journal Planner", href: "/journal-workflow/planner", icon: <BookOpenCheck className="size-4" /> },
      { label: "Paper Extraction", href: "/journal-workflow/paper-extraction", icon: <FileText className="size-4" /> },
      { label: "Section Writer", href: "/journal-workflow/section-writer", icon: <PenLine className="size-4" /> },
      { label: "Reference Builder", href: "/journal-workflow/reference-builder", icon: <ScrollText className="size-4" /> },
      { label: "Formatting & Template", href: "/journal-workflow/formatting", icon: <Wand2 className="size-4" /> },
      { label: "Reviewer Simulator", href: "/reviewer", icon: <BrainCircuit className="size-4" /> },
      { label: "Final Submission", href: "/final-submission", icon: <Send className="size-4" /> },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Templates & Rules", href: "/templates", icon: <FileCheck2 className="size-4" /> },
      { label: "Settings", href: "/settings", icon: <Settings className="size-4" /> },
      { label: "Help & Guide", href: "/help", icon: <CircleHelp className="size-4" /> },
    ],
  },
];

const systemStatuses = [
  "AI Engine Online",
  "Database Connected",
  "Storage Healthy",
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeHref = menuGroups
    .flatMap((group) => group.items)
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="min-h-screen bg-[#eef3f8] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-[#07162c] text-white shadow-2xl lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">
                Thesis2Journal AI
              </div>
              <div className="mt-0.5 text-[13px] text-slate-300">
                From Thesis to Publishable Paper
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {menuGroups.map((group) => (
            <div className="mb-6" key={group.title}>
              <div className="mb-2 px-2 text-xs font-semibold tracking-[0.16em] text-slate-500">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.href === activeHref;
                  return (
                    <Link
                      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] transition ${
                        active
                          ? "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/20"
                          : "text-slate-300 hover:bg-white/7 hover:text-white"
                      }`}
                      key={item.label}
                      href={item.href}
                    >
                      <span className={active ? "text-cyan-200" : "text-slate-500"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-4 border-t border-white/10 p-4">
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-4">
            <div className="mb-3 flex items-center gap-2 text-[15px] font-medium text-emerald-100">
              <Sparkles className="size-4" />
              System Status
            </div>
            <div className="space-y-2">
              {systemStatuses.map((status) => (
                <div
                  className="flex items-center justify-between text-[13px] text-slate-300"
                  key={status}
                >
                  <span>{status}</span>
                  <CheckCircle2 className="size-3.5 text-emerald-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/6 p-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-[#07162c]">
              <UserRound className="size-5" />
            </div>
            <div>
              <div className="text-[15px] font-semibold">Dr. Zahirwan</div>
              <div className="text-[13px] text-slate-400">Researcher</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[#eef3f8]/90 px-5 py-4 backdrop-blur lg:hidden">
          <div>
            <div className="font-semibold text-[#07162c]">Thesis2Journal AI</div>
            <div className="text-[13px] text-slate-500">
              From Thesis to Publishable Paper
            </div>
          </div>
          <LayoutDashboard className="size-5 text-slate-600" />
        </header>
        <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
