"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  LayoutTemplate,
  ListChecks,
  ScrollText,
  Settings2,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const templates = [
  {
    name: "ICC2026",
    citation: "APA-aligned",
    wordLimit: "5,000-7,000",
    heading: "Conference hierarchy",
    status: "Active",
  },
  {
    name: "APA 7",
    citation: "Author-year",
    wordLimit: "Flexible",
    heading: "APA 5-level headings",
    status: "Ready",
  },
  {
    name: "MyCite",
    citation: "Journal-specific",
    wordLimit: "Journal-specific",
    heading: "Publisher rules",
    status: "Ready",
  },
  {
    name: "IEEE",
    citation: "Numeric",
    wordLimit: "Conference-specific",
    heading: "IEEE headings",
    status: "Ready",
  },
  {
    name: "Scopus",
    citation: "Publisher style",
    wordLimit: "Journal-specific",
    heading: "Journal hierarchy",
    status: "Ready",
  },
];

const writingRules = [
  ["Abstract rules", "Concise purpose, method, findings, contribution, and no unsupported claims."],
  ["Introduction rules", "Move from context to gap, aim, contribution, and article boundary."],
  ["Methodology rules", "Explain design, evidence source, transformation process, and quality control."],
  ["Findings rules", "Present evidence-driven findings with interpretation, not table dumping."],
  ["Discussion rules", "Prioritize contribution, novelty, interpretation, and anti-overclaim discipline."],
  ["Reference rules", "Use only verified citation sources and keep APA consistency."],
];

const promptRules = [
  "abstract_prompt.md",
  "introduction_prompt.md",
  "methodology_prompt.md",
  "findings_prompt.md",
  "discussion_prompt.md",
  "reviewer_prompt.md",
];

const checklist = [
  "Template uploaded",
  "Citation style defined",
  "Section word limits defined",
  "Heading hierarchy defined",
  "Reference format defined",
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

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <LayoutTemplate className="size-3.5" />
                System Rules Library
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Templates & Rules
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Manage journal templates, conference formats, citation rules, and writing constraints.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Add Template
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {templates.map((template) => (
            <Card className="p-4" key={template.name}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{template.name}</h2>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      template.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {template.status}
                  </span>
                </div>
                <FileCheck2 className="size-5 text-cyan-700" />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["Citation style", template.citation],
                  ["Word limit", template.wordLimit],
                  ["Heading rules", template.heading],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-slate-50 p-3" key={label}>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      {label}
                    </div>
                    <div className="mt-1 text-[14px] font-semibold leading-5 text-slate-700">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900">
                View Rules
                <ArrowRight className="size-4" />
              </button>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <SectionTitle icon={<ScrollText className="size-5" />} title="Writing Rules Panel" />
            <div className="space-y-3">
              {writingRules.map(([label, value]) => (
                <div
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[190px_1fr]"
                  key={label}
                >
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </div>
                  <div className="text-[15px] font-semibold leading-6 text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FileText className="size-5" />} title="Prompt Rules Panel" />
            <div className="grid gap-3 sm:grid-cols-2">
              {promptRules.map((prompt) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={prompt}
                >
                  <span className="text-[15px] font-semibold text-slate-700">{prompt}</span>
                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[12px] font-semibold text-cyan-700">
                    Loaded
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<ListChecks className="size-5" />} title="Compliance Checklist" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {checklist.map((item) => (
              <div
                className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                key={item}
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="text-[15px] font-semibold leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <Settings2 className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Apply Template Rules</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Apply selected template, writing rules, citation style, heading hierarchy,
                and section prompts to the current journal workflow.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Apply Template Rules
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
