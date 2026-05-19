"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GitBranch,
  Network,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

type DetailPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: "citation" | "table" | "objective" | "audit" | "graph";
  summary: Array<{ label: string; value: string }>;
  rows: Array<{ label: string; detail: string; status: string }>;
};

const icons = {
  citation: <GitBranch className="size-5" />,
  table: <BarChart3 className="size-5" />,
  objective: <SearchCheck className="size-5" />,
  audit: <ShieldCheck className="size-5" />,
  graph: <Network className="size-5" />,
};

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

export function IntelligenceDetailPage({
  eyebrow,
  title,
  description,
  icon,
  summary,
  rows,
}: DetailPageProps) {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 overflow-x-hidden">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                {icons[icon]}
                {eyebrow}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                {description}
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Refresh Map
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <Card className="p-4" key={item.label}>
              <div className="text-3xl font-bold text-cyan-700">{item.value}</div>
              <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {item.label}
              </div>
            </Card>
          ))}
        </section>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              {icons[icon]}
            </div>
            <h2 className="text-lg font-semibold text-slate-950">{title} Workspace</h2>
          </div>
          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[220px_1fr_140px] md:items-center"
                key={row.label}
              >
                <div className="text-[15px] font-semibold text-slate-950">{row.label}</div>
                <div className="text-[15px] leading-6 text-slate-600">{row.detail}</div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                    row.status === "Review"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <CheckCircle2 className="size-3.5" />
                Intelligence module
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Use in Journal Workflow</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Use this verified intelligence output to support paper planning,
                section writing, citation checks, reviewer simulation, and final submission.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Continue Workflow
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
