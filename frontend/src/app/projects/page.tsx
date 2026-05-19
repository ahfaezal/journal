"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  FileCheck2,
  FileText,
  FolderKanban,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const filters = ["All", "Active", "Draft", "Submission Ready", "Archived"];

const projects = [
  {
    id: "PROJECT_001",
    title: "Dakwah Content Selection Module",
    thesisType: "Design and Development Research",
    papers: "3 target papers",
    progress: "86%",
    activity: "Today, 8:30 AM",
    score: "86%",
    status: "Active",
  },
  {
    id: "PROJECT_002",
    title: "TVET NOSS Quality Study",
    thesisType: "Mixed-methods research",
    papers: "2 target papers",
    progress: "42%",
    activity: "Yesterday, 4:10 PM",
    score: "74%",
    status: "Draft",
  },
  {
    id: "PROJECT_003",
    title: "Islamic Education Framework Paper",
    thesisType: "Framework synthesis",
    papers: "1 target paper",
    progress: "94%",
    activity: "May 17, 2026",
    score: "91%",
    status: "Submission Ready",
  },
];

const summary = [
  { label: "Total projects", value: "03", icon: <FolderKanban className="size-5" /> },
  { label: "Active papers", value: "08", icon: <FileText className="size-5" /> },
  { label: "Locked sections", value: "31", icon: <FileCheck2 className="size-5" /> },
  { label: "Pending audits", value: "05", icon: <ShieldCheck className="size-5" /> },
];

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={`rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.section>
  );
}

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <FolderKanban className="size-3.5" />
                Project Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My Projects</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Manage thesis-to-journal workspaces.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Create New Project
              <PlusCircle className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <button
                    className={`rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                      index === 0
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                    }`}
                    key={filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              {projects.map((project) => (
                <Card key={project.id}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                        {project.id}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-950">
                        {project.title}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        project.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : project.status === "Draft"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-cyan-100 text-cyan-700"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Thesis type", project.thesisType],
                      ["Target papers", project.papers],
                      ["Last activity", project.activity],
                      ["Intelligence score", project.score],
                    ].map(([label, value]) => (
                      <div className="rounded-xl bg-slate-50 p-3" key={label}>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          {label}
                        </div>
                        <div className="mt-1 text-[14px] font-semibold leading-6 text-slate-700">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[14px] font-semibold">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-cyan-700">{project.progress}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-cyan-600"
                        style={{ width: project.progress }}
                      />
                    </div>
                  </div>

                  <button className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                    Open Project
                    <ArrowRight className="size-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <BarChart3 className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">Workspace Summary</h2>
              </div>
              <div className="space-y-3">
                {summary.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-700">{item.icon}</span>
                      <span className="text-[15px] font-semibold text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white">
              <div className="rounded-2xl bg-[#07162c] p-5 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <PlusCircle className="size-3.5" />
                  CTA
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Create New Project</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-300">
                  Start a new thesis-to-journal workspace with thesis upload,
                  MFL mapping, and journal workflow planning.
                </p>
                <button className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
                  Create New Project
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
