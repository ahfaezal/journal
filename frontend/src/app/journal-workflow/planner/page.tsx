"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GitBranch,
  Layers3,
  Lightbulb,
  Loader2,
  RefreshCcw,
  Route,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  buildJournalPlanner,
  getJournalPlanner,
  type JournalPlanner,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";

const fallbackPlanner: JournalPlanner = {
  project_id: PROJECT_ID,
  status: "fallback",
  suggested_papers: [],
  phase_separation: [],
  overlap_warnings: [],
  recommended_sequence: [],
  planner_summary: {
    total_suggested_papers: 0,
    citation_readiness: "Not built",
    audit_risk: "Unknown",
    graph_health_score: 0,
    primary_recommendation: "Build journal plan after thesis intelligence maps are ready.",
  },
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

function statusTone(status: string) {
  if (status === "recommended") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "planned") {
    return "bg-cyan-100 text-cyan-700";
  }
  return "bg-slate-100 text-slate-600";
}

export default function JournalPlannerPage() {
  const [planner, setPlanner] = useState<JournalPlanner>(fallbackPlanner);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlanner() {
      try {
        const data = await getJournalPlanner(PROJECT_ID);
        if (!cancelled) {
          setPlanner(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setPlanner(fallbackPlanner);
          setNotice("Journal plan has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPlanner();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuildPlanner() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildJournalPlanner(PROJECT_ID);
      setPlanner(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build journal plan.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const selectedPaper = planner.suggested_papers.find((paper) => paper.paper_id === "PAPER_2")
    ?? planner.suggested_papers[0];
  const summaryCards = [
    ["Suggested papers", String(planner.planner_summary.total_suggested_papers)],
    ["Citation readiness", planner.planner_summary.citation_readiness],
    ["Audit risk", planner.planner_summary.audit_risk],
    ["Graph health", `${planner.planner_summary.graph_health_score}%`],
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <BookOpenCheck className="size-3.5" />
                Journal Workflow
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Journal Extraction Planner
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Plan how one thesis can be converted into multiple publishable papers.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuilding}
              onClick={handleBuildPlanner}
            >
              {isBuilding ? "Building Journal Plan" : "Build Journal Plan"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : planner.status === "built" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading planner" : planner.status === "built" ? "Journal plan ready" : "Planner preview"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(([label, value]) => (
            <Card className="p-4" key={label}>
              <div className="flex items-center justify-between">
                <BookOpenCheck className="size-5 text-cyan-700" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Planner
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-950">{value}</div>
              <div className="mt-1 text-[15px] font-medium leading-6 text-slate-600">
                {label}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {planner.suggested_papers.length ? (
            planner.suggested_papers.map((paper) => (
              <Card key={paper.paper_id}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                      {paper.paper_id}
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {paper.paper_type}
                    </h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${statusTone(paper.status)}`}>
                    {paper.status}
                  </span>
                </div>
                <p className="min-h-20 text-[15px] font-medium leading-7 text-slate-700">
                  {paper.title}
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["Source chapters", paper.source_chapters.join(", ") || "Not mapped"],
                    ["Research objectives", paper.objectives_used.join(", ") || "Not mapped"],
                    ["Key tables", paper.key_tables.join(", ") || "Not mapped"],
                    ["Citation readiness", paper.citation_readiness],
                    ["Reviewer risk", paper.audit_risk],
                  ].map(([label, value]) => (
                    <div
                      className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                      key={label}
                    >
                      <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        {label}
                      </span>
                      <span className="max-w-[56%] text-right text-[14px] font-semibold text-slate-700">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-[14px] leading-6 text-cyan-900">
                  {paper.novelty_angle}
                </div>
              </Card>
            ))
          ) : (
            <Card className="xl:col-span-3">
              <div className="py-8 text-center text-[15px] font-medium text-slate-500">
                No generated paper plan yet. Build the journal plan after intelligence maps are ready.
              </div>
            </Card>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle icon={<Layers3 className="size-5" />} title="Paper Scope Builder" />
            <div className="grid gap-3">
              {[
                ["Selected paper", selectedPaper ? `${selectedPaper.paper_id}: ${selectedPaper.paper_type}` : "Not selected"],
                ["Scope", selectedPaper?.thesis_scope ?? "Build plan to generate scope."],
                ["Included chapters", selectedPaper?.source_chapters.join(", ") ?? "Not mapped"],
                ["Objectives used", selectedPaper?.objectives_used.join(", ") ?? "Not mapped"],
                ["Target conference/journal", "ICC2026"],
                ["Estimated word count", "5,500-6,500 words"],
              ].map(([label, value]) => (
                <div
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[220px_1fr]"
                  key={label}
                >
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </div>
                  <div className="text-[15px] font-semibold leading-6 text-slate-800">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<GitBranch className="size-5" />} title="Phase Separation Map" />
            <div className="relative space-y-4">
              <div className="absolute bottom-8 left-5 top-8 w-px bg-cyan-200" />
              {planner.phase_separation.map((phase, index) => (
                <div className="relative flex gap-4" key={phase.phase_id}>
                  <div className="z-10 grid size-10 shrink-0 place-items-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-slate-950">
                        {phase.phase_name}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-cyan-700">
                        {phase.recommended_paper}
                      </span>
                    </div>
                    <p className="mt-2 text-[15px] leading-6 text-slate-600">
                      {phase.related_chapters.join(", ") || "Related chapters not mapped"}
                    </p>
                  </div>
                </div>
              ))}
              {!planner.phase_separation.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-[15px] font-medium text-slate-500">
                  Phase separation will appear after journal plan generation.
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle icon={<Lightbulb className="size-5" />} title="Planner Suggestions" />
            <div className="space-y-3">
              {[
                {
                  label: "Primary recommendation",
                  value: planner.planner_summary.primary_recommendation,
                  icon: <Lightbulb className="size-5" />,
                },
                {
                  label: "Recommended sequence",
                  value: planner.recommended_sequence.join(" → ") || "Build journal plan to generate sequence.",
                  icon: <Route className="size-5" />,
                },
              ].map((item) => (
                <div
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={item.label}
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-950">{item.label}</div>
                    <p className="mt-1 text-[15px] leading-6 text-slate-600">{item.value}</p>
                  </div>
                </div>
              ))}
              {planner.overlap_warnings.map((warning) => (
                <div
                  className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"
                  key={warning}
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-950">Overlap warning</div>
                    <p className="mt-1 text-[15px] leading-6 text-slate-600">{warning}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-[#07162c] p-6 text-white">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <FileText className="size-3.5" />
                  Bottom CTA
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Generate Paper Structure</h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300">
                  Convert the selected scope into section-level article structure,
                  citation boundaries, table usage, and reviewer-facing contribution logic.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1 text-[13px] font-semibold text-emerald-100 ring-1 ring-emerald-300/20">
                  <CheckCircle2 className="size-3.5" />
                  {planner.status === "built" ? "Planner ready" : "Planner preview"}
                </span>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
                  Generate Paper Structure
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
