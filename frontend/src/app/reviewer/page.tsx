"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Lightbulb,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const summaryCards = [
  { label: "Overall Reviewer Readiness", value: "79%", tone: "text-cyan-700" },
  { label: "Rejection Risk", value: "18%", tone: "text-amber-700" },
  { label: "Novelty Strength", value: "Moderate", tone: "text-violet-700" },
  { label: "Methodology Confidence", value: "High", tone: "text-emerald-700" },
  { label: "Citation Integrity", value: "Strong", tone: "text-emerald-700" },
];

const reviewerReports = [
  {
    reviewer: "Reviewer 1",
    focus: "Methodology-focused",
    decision: "Accept with minor revisions",
    major: "Clarify how DDR phases connect to the extraction and validation workflow.",
    minor: "Tighten terminology between activity mapping and competency mapping.",
    recommendation: "Add a short methodological transition paragraph.",
  },
  {
    reviewer: "Reviewer 2",
    focus: "Literature & novelty-focused",
    decision: "Revise and resubmit",
    major: "Novelty contribution needs to appear earlier and more explicitly.",
    minor: "Avoid repeating generic literature claims across Introduction and Discussion.",
    recommendation: "Strengthen novelty framing around traceable development evidence.",
  },
  {
    reviewer: "Reviewer 3",
    focus: "Formatting & compliance-focused",
    decision: "Accept with formatting corrections",
    major: "Reference list needs final APA consistency check.",
    minor: "Table caption and heading hierarchy require template alignment.",
    recommendation: "Run formatting audit before DOCX export.",
  },
];

const riskBreakdown = [
  { label: "Novelty weakness", value: "Medium", width: "46%" },
  { label: "Unclear contribution", value: "Low", width: "24%" },
  { label: "Citation mismatch", value: "Low", width: "18%" },
  { label: "Methodology gap", value: "Low", width: "16%" },
  { label: "Formatting issue", value: "Medium", width: "40%" },
];

const suggestions = [
  {
    priority: "High",
    revision: "Move novelty and methodological contribution statement into the opening of Discussion.",
    section: "Discussion",
  },
  {
    priority: "Medium",
    revision: "Reduce repeated contribution phrasing between Discussion and Conclusion.",
    section: "Conclusion",
  },
  {
    priority: "Medium",
    revision: "Confirm all in-text citations appear in the final reference list.",
    section: "References",
  },
  {
    priority: "Low",
    revision: "Standardize table caption and heading hierarchy before final formatting.",
    section: "Formatting",
  },
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

export default function ReviewerPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <BrainCircuit className="size-3.5" />
                Pre-submission Review
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Reviewer Simulator
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Simulate academic reviewer feedback before submission.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Run Simulation
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className={`text-3xl font-bold ${card.tone}`}>{card.value}</div>
              <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {reviewerReports.map((report) => (
            <Card key={report.reviewer}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                    {report.reviewer}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{report.focus}</h2>
                </div>
                <MessageSquareText className="size-5 text-cyan-700" />
              </div>
              <div className="rounded-xl bg-cyan-50 p-3">
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  Decision tendency
                </div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  {report.decision}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Major comments", report.major],
                  ["Minor comments", report.minor],
                  ["Recommendation", report.recommendation],
                ].map(([label, value]) => (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={label}>
                    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </div>
                    <p className="mt-2 text-[15px] leading-6 text-slate-600">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle icon={<AlertTriangle className="size-5" />} title="Rejection Risk Breakdown" />
            <div className="space-y-4">
              {riskBreakdown.map((risk) => (
                <div key={risk.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[15px] font-semibold text-slate-700">{risk.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        risk.value === "Medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {risk.value}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: risk.width }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Lightbulb className="size-5" />} title="Improvement Suggestions" />
            <div className="space-y-3">
              {suggestions.map((item) => (
                <div
                  className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[110px_1fr_140px]"
                  key={`${item.priority}-${item.section}`}
                >
                  <span
                    className={`h-fit rounded-full px-2.5 py-1 text-center text-[12px] font-semibold ${
                      item.priority === "High"
                        ? "bg-rose-100 text-rose-700"
                        : item.priority === "Medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <div className="text-[15px] leading-6 text-slate-700">{item.revision}</div>
                  <div className="text-[14px] font-semibold text-cyan-700">{item.section}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <Sparkles className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Apply Reviewer Suggestions</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Convert reviewer simulation feedback into targeted revision tasks
                before final formatting and submission.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Apply Reviewer Suggestions
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
