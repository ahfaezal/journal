"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  FileQuestion,
  Lightbulb,
  ListChecks,
  Route,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const quickStart = [
  "Create project",
  "Upload thesis chapters",
  "Upload MFL",
  "Build Thesis Intelligence",
  "Plan journal extraction",
  "Generate sections",
  "Run reviewer simulation",
  "Export final submission",
];

const workflowGuide = [
  ["Dashboard", "Overview of projects, workflow status, intelligence score, reviewer risk, and quick actions."],
  ["Upload Thesis", "Upload Bab 1-5, MFL, templates, and supporting documents into the workspace."],
  ["Thesis Intelligence", "Build citation, objective, table, knowledge graph, and audit maps from thesis sources."],
  ["Journal Planner", "Plan how one thesis can be converted into one or more publishable papers."],
  ["Section Writer", "Generate, review, and lock individual paper sections using controlled thesis context."],
  ["Reference Builder", "Match in-text citations against MFL and prepare verified reference lists."],
  ["Formatting", "Apply conference, journal, citation, heading, table, and reference formatting rules."],
  ["Reviewer Simulator", "Simulate reviewer comments, risk points, and targeted improvement suggestions."],
  ["Final Submission", "Prepare DOCX, PDF, cover letter, metadata, checklist, and submission package."],
];

const faqs = [
  ["What is MFL?", "MFL means Master File List, the verified reference source used to control citation and reference integrity."],
  ["Can one thesis generate multiple papers?", "Yes. The planner separates papers by research phase, objective, evidence source, and contribution angle."],
  ["How does Citation Guard work?", "Citation Guard keeps writing tied to thesis citations and MFL entries to reduce unsupported or fake citation risk."],
  ["Does AI write automatically?", "The system can draft sections, but the user reviews, refines, verifies, and locks each section."],
  ["What does Lock Version mean?", "Lock Version marks a reviewed section as stable so later integration can preserve approved content."],
];

const bestPractices = [
  "Always verify citations",
  "Lock stable sections",
  "Separate papers by research phase",
  "Run audit before formatting",
  "Use reviewer simulation before submission",
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

export default function HelpPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <CircleHelp className="size-3.5" />
                Product Guide
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Help & Guide
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Learn how to convert a thesis into publishable papers using Thesis2Journal AI.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Start New Project
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <Card>
          <SectionTitle icon={<ListChecks className="size-5" />} title="Quick Start Guide" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickStart.map((step, index) => (
              <div
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                key={step}
              >
                <div className="grid size-9 place-items-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="mt-3 text-[15px] font-semibold text-slate-800">{step}</div>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle icon={<Route className="size-5" />} title="Workflow Guide" />
            <div className="space-y-3">
              {workflowGuide.map(([module, description]) => (
                <div
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[180px_1fr]"
                  key={module}
                >
                  <div className="text-[15px] font-semibold text-slate-950">{module}</div>
                  <p className="text-[15px] leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FileQuestion className="size-5" />} title="FAQ Panel" />
            <div className="space-y-3">
              {faqs.map(([question, answer]) => (
                <div
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={question}
                >
                  <div className="text-[15px] font-semibold text-slate-950">{question}</div>
                  <p className="mt-2 text-[15px] leading-6 text-slate-600">{answer}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<Lightbulb className="size-5" />} title="Best Practice Panel" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {bestPractices.map((practice) => (
              <div
                className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                key={practice}
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="text-[15px] font-semibold leading-6 text-slate-700">
                  {practice}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <BookOpenCheck className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Start New Project</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Create a workspace, upload thesis chapters and MFL, then begin
                building thesis intelligence for journal extraction.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Start New Project
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
