"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import { getPortfolio, type PortfolioDashboard } from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";

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

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        setIsLoading(true);
        const data = await getPortfolio(PROJECT_ID);
        console.log("Loaded portfolio data", data);
        if (!cancelled) {
          setPortfolio(data);
          setNotice(null);
        }
      } catch (error) {
        console.error("Portfolio fetch failed", error);
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : "Unable to load portfolio dashboard.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPortfolio();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = portfolio?.portfolio_summary;
  const summaryCards = [
    { label: "Total Papers", value: summary?.total_papers ?? 0, icon: <FileText className="size-5" /> },
    { label: "Active Papers", value: summary?.active_papers ?? 0, icon: <Sparkles className="size-5" /> },
    { label: "Submission Ready", value: summary?.submission_ready ?? 0, icon: <Send className="size-5" /> },
    { label: "Reviewed Papers", value: summary?.reviewed_papers ?? 0, icon: <ShieldCheck className="size-5" /> },
    { label: "Average Completion", value: `${summary?.average_completion ?? 0}%`, icon: <BarChart3 className="size-5" /> },
    { label: "Acceptance Probability", value: `${summary?.average_acceptance_probability ?? 0}%`, icon: <CheckCircle2 className="size-5" /> },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <BarChart3 className="size-3.5" />
                Publication Portfolio
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Portfolio Dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Track multi-paper publication readiness, reviewer signals, revision status, and submission pipeline health.
              </p>
            </div>
            <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20">
              {isLoading ? "Loading Portfolio" : `${portfolio?.average_completion ?? 0}% Complete`}
              <ArrowRight className="size-4" />
            </div>
          </div>
          {notice ? (
            <div className="mt-5 rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
              {notice}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <span className="text-cyan-700">{card.icon}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-500">
                  Portfolio
                </span>
              </div>
              <div className="mt-4 text-2xl font-bold text-slate-950">{card.value}</div>
              <div className="mt-1 text-[15px] font-medium text-slate-600">{card.label}</div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <SectionTitle icon={<FileText className="size-5" />} title="Paper Progress Overview" />
            <div className="space-y-4">
              {portfolio?.paper_portfolio_cards.map((paper) => (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={paper.paper_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                        {paper.paper_id}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">{paper.title}</div>
                      <div className="mt-1 text-[14px] text-slate-500">
                        {paper.paper_type} - {paper.target_journal}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-slate-600">
                      {paper.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-[14px] font-semibold">
                      <span className="text-slate-600">Completion</span>
                      <span className="text-cyan-700">{paper.progress_percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${paper.progress_percent}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    {[
                      ["Reviewer", paper.reviewer_readiness],
                      ["Revision", paper.revision_status],
                      ["Submission", paper.submission_readiness],
                      ["Acceptance", `${paper.acceptance_probability}%`],
                    ].map(([label, value]) => (
                      <div className="rounded-xl bg-white p-3" key={label}>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          {label}
                        </div>
                        <div className="mt-1 text-[14px] font-semibold text-slate-700">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!portfolio?.paper_portfolio_cards.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-[15px] font-medium text-slate-500">
                  No portfolio paper data available yet.
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<BarChart3 className="size-5" />} title="Readiness Pipeline Chart" />
            <div className="space-y-4">
              {portfolio?.publication_pipeline_overview.map((step) => (
                <div key={step.label}>
                  <div className="mb-2 flex items-center justify-between text-[14px] font-semibold">
                    <span className="text-slate-700">{step.label}</span>
                    <span className="text-cyan-700">
                      {step.completed}/{step.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${step.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="text-[15px] font-semibold text-slate-950">Readiness distribution</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(portfolio?.readiness_distribution ?? {}).map(([label, value]) => (
                  <div className="rounded-xl bg-white p-3" key={label}>
                    <div className="text-lg font-bold text-slate-950">{value}</div>
                    <div className="text-[13px] capitalize text-slate-500">{label.replaceAll("_", " ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle icon={<Send className="size-5" />} title="Submission-ready Highlights" />
            <div className="space-y-3">
              {portfolio?.submission_ready_highlights.length ? (
                portfolio.submission_ready_highlights.map((paper) => (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4" key={paper.paper_id}>
                    <div className="text-[13px] font-semibold tracking-[0.16em] text-emerald-700">
                      {paper.paper_id}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-950">{paper.title}</div>
                    <div className="mt-1 text-[14px] text-slate-600">
                      Ready for final submission package review.
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-[15px] font-medium text-slate-500">
                  No paper is submission-ready yet.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Clock3 className="size-5" />} title="Recent Publication Activities" />
            <div className="grid gap-3 md:grid-cols-2">
              {portfolio?.latest_activity.map((activity) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={activity.activity_id}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 size-2.5 shrink-0 rounded-full bg-cyan-600 shadow-[0_0_0_5px_rgba(8,145,178,0.12)]" />
                    <div>
                      <div className="text-[15px] font-semibold text-slate-950">{activity.activity_title}</div>
                      <div className="mt-1 text-[14px] leading-6 text-slate-600">
                        {activity.activity_description}
                      </div>
                      <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {activity.source_module} - {activity.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!portfolio?.latest_activity.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-[15px] font-medium text-slate-500">
                  No publication activity recorded yet.
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <Card className="bg-white">
          <div className="rounded-2xl bg-[#07162c] p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <FileCheck2 className="size-3.5" />
                  Portfolio Signal
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Publication Pipeline Overview</h2>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                  Average completion is {portfolio?.average_completion ?? 0}%. Use this view to decide which paper should move next into reviewer simulation, revision, formatting, or final submission.
                </p>
              </div>
              <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c]">
                Review Portfolio
                <ArrowRight className="size-4" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
