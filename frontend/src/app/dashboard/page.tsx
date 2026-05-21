"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  FolderKanban,
  GitBranch,
  Layers3,
  Network,
  PenLine,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getHealth,
  getArtifacts,
  getIntelligence,
  getJournalPlanner,
  getProject,
  getProjects,
  getWorkflowStatus,
  runFullPipeline,
  type ArtifactRegistry,
  type HealthResponse,
  type IntelligenceSummary,
  type JournalPlanner,
  type Project,
  type ProjectDetail,
  type WorkflowRunSummary,
} from "@/src/lib/api";

const workflowSteps = [
  { label: "Upload Thesis", status: "done" },
  { label: "Upload MFL", status: "done" },
  { label: "Build Citation Map", status: "done" },
  { label: "Build Table Map", status: "done" },
  { label: "Build Objective Map", status: "done" },
  { label: "Thesis Audit", status: "done" },
  { label: "Journal Planner", status: "active" },
  { label: "Paper Extraction", status: "next" },
  { label: "Scope Definition", status: "next" },
  { label: "Section Structure", status: "next" },
  { label: "Section Writer", status: "next" },
  { label: "Citation Audit", status: "next" },
  { label: "Full Integration", status: "next" },
  { label: "Reviewer Simulation", status: "next" },
  { label: "Final Submission", status: "next" },
];

const recentProjects = [
  { id: "PROJECT_001", title: "Structured Da'wah Module", papers: "Paper 1 & Paper 2", status: "Formatting" },
  { id: "PROJECT_002", title: "Academic Leadership Framework", papers: "Planner Ready", status: "Mapping" },
  { id: "PROJECT_003", title: "Digital Teaching Practice", papers: "New Upload", status: "Intake" },
];

const quickActions = [
  { label: "Upload Thesis", icon: <UploadCloud className="size-4" /> },
  { label: "Generate Scope", icon: <Layers3 className="size-4" /> },
  { label: "Write Section", icon: <PenLine className="size-4" /> },
  { label: "Run Audit", icon: <SearchCheck className="size-4" /> },
];

const assistantPrompts = [
  "Check continuity",
  "Find unsupported claims",
  "Suggest discussion structure",
  "Simulate reviewer",
];

const graphNodes = [
  { label: "Objectives", position: "left-5 top-7", tone: "border-cyan-300/40 bg-cyan-300/15" },
  { label: "Methodology", position: "left-2 top-[44%]", tone: "border-emerald-300/40 bg-emerald-300/15" },
  { label: "Findings", position: "left-7 bottom-8", tone: "border-sky-300/40 bg-sky-300/15" },
  { label: "Discussion", position: "right-4 top-8", tone: "border-violet-300/40 bg-violet-300/15" },
  { label: "Citation", position: "right-2 top-[44%]", tone: "border-amber-300/40 bg-amber-300/15" },
  { label: "Tables", position: "right-8 bottom-8", tone: "border-rose-300/40 bg-rose-300/15" },
  { label: "References", position: "left-1/2 bottom-3 -translate-x-1/2", tone: "border-white/20 bg-white/10" },
];

const graphConnectors = [
  "left-[26%] top-[28%] w-[31%] rotate-[28deg]",
  "left-[20%] top-1/2 w-[34%]",
  "left-[28%] top-[67%] w-[29%] -rotate-[30deg]",
  "right-[26%] top-[28%] w-[31%] -rotate-[28deg]",
  "right-[20%] top-1/2 w-[34%]",
  "right-[28%] top-[67%] w-[29%] rotate-[30deg]",
  "left-1/2 top-[61%] w-[26%] translate-x-[-1px] rotate-90",
];

const riskBreakdown = [
  { label: "Citation OK", status: "ok" },
  { label: "Continuity OK", status: "ok" },
  { label: "Novelty Warning", status: "warning" },
  { label: "Methodology OK", status: "ok" },
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
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          {icon}
        </div>
        <h2 className="truncate text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {action ? (
        <button className="flex shrink-0 items-center gap-1 text-[15px] font-medium text-cyan-700">
          {action}
          <ArrowRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const degrees = value * 3.6;
  return (
    <div
      className="grid size-28 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#0891b2 ${degrees}deg, #e2e8f0 ${degrees}deg)`,
      }}
    >
      <div className="grid size-20 place-items-center rounded-full bg-white">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-950">{value}%</div>
          <div className="text-xs font-medium text-slate-500">Overall</div>
        </div>
      </div>
    </div>
  );
}

type DashboardData = {
  health: HealthResponse | null;
  projects: Project[];
  activeProject: ProjectDetail | null;
  intelligence: IntelligenceSummary | null;
  journalPlanner: JournalPlanner | null;
  workflowRun: WorkflowRunSummary | null;
  artifacts: ArtifactRegistry | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    health: null,
    projects: [],
    activeProject: null,
    intelligence: null,
    journalPlanner: null,
    workflowRun: null,
    artifacts: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError(null);

        const [health, projectsResponse] = await Promise.all([getHealth(), getProjects()]);
        const activeProjectId = projectsResponse[0]?.project_id || projectsResponse[0]?.id;
        const fallbackProjectId = activeProjectId || "PROJECT_001";
        const [activeProject, intelligence, journalPlanner, workflowRun, artifacts] = await Promise.all([
          activeProjectId ? getProject(activeProjectId) : Promise.resolve(null),
          getIntelligence(fallbackProjectId),
          getJournalPlanner(fallbackProjectId),
          getWorkflowStatus(fallbackProjectId).catch(() => null),
          getArtifacts(fallbackProjectId).catch(() => null),
        ]);

        if (!cancelled) {
          setData({
            health,
            projects: projectsResponse,
            activeProject,
            intelligence,
            journalPlanner,
            workflowRun,
            artifacts,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to connect to Thesis2Journal AI API.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRunWorkflow() {
    try {
      setIsRunningWorkflow(true);
      setError(null);
      const workflowRun = await runFullPipeline("PROJECT_001");
      setData((current) => ({ ...current, workflowRun }));
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : "Unable to run full workflow test.",
      );
    } finally {
      setIsRunningWorkflow(false);
    }
  }

  const projectCount = data.projects.length || 3;
  const paperCount =
    data.projects.reduce((total, project) => total + project.target_papers, 0) ||
    data.journalPlanner?.suggested_papers.length ||
    8;
  const activeProject = data.activeProject;
  const intelligence = data.intelligence;
  const journalPlanner = data.journalPlanner;
  const workflowRun = data.workflowRun;
  const artifacts = data.artifacts;
  const latestRegeneration = artifacts?.latest_artifacts?.auto_regeneration;
  const auditIssueCount = intelligence
    ? Object.values(intelligence.audit).reduce((total, value) => total + value, 0)
    : 8;

  const dashboardStats = useMemo(
    () => [
      {
        label: "Projects",
        value: String(projectCount).padStart(2, "0"),
        icon: <FolderKanban className="size-5" />,
        note: `${data.projects.filter((project) => project.status === "Active").length || 2} active`,
      },
      {
        label: "Papers",
        value: String(paperCount).padStart(2, "0"),
        icon: <FileText className="size-5" />,
        note: `${journalPlanner?.suggested_papers.length || 4} planned`,
      },
      { label: "Sections Locked", value: "31", icon: <FileCheck2 className="size-5" />, note: "18 this month" },
      { label: "References", value: "218", icon: <Database className="size-5" />, note: "MFL verified" },
      {
        label: "Audit Status",
        value: `${Math.max(0, 100 - auditIssueCount)}%`,
        icon: <ShieldCheck className="size-5" />,
        note: "Low risk",
      },
      {
        label: "Last Activity",
        value: activeProject?.last_activity?.split(", ")[1] || "08:30",
        icon: <Clock3 className="size-5" />,
        note: activeProject?.last_activity?.split(", ")[0] || "Today",
      },
    ],
    [activeProject?.last_activity, auditIssueCount, data.projects, journalPlanner?.suggested_papers.length, paperCount, projectCount],
  );

  const dashboardRecentProjects =
    data.projects.length > 0
      ? data.projects.map((project) => ({
          id: project.id,
          title: project.name,
          papers: `${project.target_papers} target papers`,
          status: project.status,
        }))
      : recentProjects;

  const intelligenceMetrics: Array<[string, number]> = [
    ["Citation Integrity", intelligence?.citation_integrity ?? 94],
    ["Continuity", intelligence?.objective_alignment ?? 88],
    ["Scope Clarity", intelligence?.methodology_consistency ?? 82],
    ["Reference Readiness", intelligence?.reviewer_readiness ?? 79],
  ];

  const systemNotifications = [
    data.health
      ? `${data.health.service} is online.`
      : "Citation Map is synchronized with MFL 2026.",
    journalPlanner
      ? `${journalPlanner.suggested_papers.length} paper plans loaded from backend.`
      : "Paper 2 is ready for reviewer simulation.",
    latestRegeneration
      ? `Latest auto regeneration: ${latestRegeneration.updated_at}.`
      : "No auto regeneration activity yet.",
    error ? "Backend data unavailable; showing fallback dashboard values." : "ICC2026 template rules loaded successfully.",
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="space-y-6">
          <div className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                  <Sparkles className="size-3.5" />
                  Thesis Intelligence Workspace
                </div>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome back, Dr. Zahirwan
                  <span className="ml-2" aria-hidden="true">
                    👋
                  </span>
                </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Turn your thesis into high-quality, conference-ready papers
                  with AI-powered guidance.
                </p>
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
                Continue Workflow
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                <span
                  className={`size-2 rounded-full ${
                    error ? "bg-amber-300" : isLoading ? "bg-cyan-300" : "bg-emerald-300"
                  }`}
                />
                {error ? "Backend fallback mode" : isLoading ? "Loading API data" : "Backend connected"}
              </span>
              {error ? (
                <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                  {error}
                </span>
              ) : null}
            </div>
          </div>

          <Card className="bg-white">
            <SectionTitle icon={<BookOpenCheck className="size-5" />} title="Active Project" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                    {activeProject?.id || "PROJECT_001"}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-950">
                    {activeProject?.name || "Thesis-to-Journal Master System"}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[13px] font-semibold text-emerald-700">
                  {activeProject?.status || "Active"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [String(journalPlanner?.suggested_papers.length || activeProject?.target_papers || 2), "Papers"],
                  ["14", "References"],
                  [`${intelligence?.overall_score ?? activeProject?.intelligence_score ?? 86}%`, "Score"],
                ].map(([value, label]) => (
                  <div className="rounded-xl bg-white p-3" key={label}>
                    <div className="text-lg font-bold text-slate-950">{value}</div>
                    <div className="text-[13px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {dashboardStats.map((stat) => (
            <Card className="p-4" key={stat.label}>
              <div className="flex items-center justify-between">
                <div className="text-slate-500">{stat.icon}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  {stat.note}
                </span>
              </div>
              <div className="mt-4 text-2xl font-bold text-slate-950">{stat.value}</div>
              <div className="mt-1 text-[15px] font-medium text-slate-600">{stat.label}</div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="min-w-0">
            <SectionTitle
              icon={<GitBranch className="size-5" />}
              title="15-step Thesis to Journal Workflow"
              action="View all"
            />
            <div className="grid gap-3 md:grid-cols-2 lg:hidden">
              {workflowSteps.map((step, index) => {
                const done = step.status === "done";
                const active = step.status === "active";
                return (
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      active
                        ? "border-cyan-200 bg-cyan-50"
                        : done
                          ? "border-emerald-100 bg-emerald-50/70"
                          : "border-slate-200 bg-slate-50"
                    }`}
                    key={step.label}
                  >
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        active
                          ? "bg-cyan-600 text-white"
                          : done
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {done ? <CheckCircle2 className="size-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-slate-900">
                        {step.label}
                      </div>
                      <div className="text-[13px] capitalize text-slate-500">
                        {active ? "In progress" : done ? "Completed" : "Pending"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto pb-3 lg:block">
              <div className="relative min-w-[1380px] px-2 pt-5">
                <div className="absolute left-8 right-8 top-[42px] h-1 rounded-full bg-slate-200" />
                <div className="absolute left-8 top-[42px] h-1 w-[43%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
                <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-3">
                  {workflowSteps.map((step, index) => {
                    const done = step.status === "done";
                    const active = step.status === "active";
                    return (
                      <div className="relative z-10 flex flex-col items-center" key={step.label}>
                        <div
                          className={`grid size-11 place-items-center rounded-full border-4 text-sm font-bold shadow-sm ${
                            active
                              ? "border-cyan-100 bg-cyan-600 text-white shadow-cyan-900/20"
                              : done
                                ? "border-emerald-100 bg-emerald-600 text-white shadow-emerald-900/15"
                                : "border-slate-100 bg-slate-200 text-slate-500"
                          }`}
                        >
                          {done ? <CheckCircle2 className="size-5" /> : index + 1}
                        </div>
                        <div
                          className={`mt-3 min-h-24 w-full rounded-xl border px-2.5 py-3 text-center ${
                            active
                              ? "border-cyan-200 bg-cyan-50"
                              : done
                                ? "border-emerald-100 bg-emerald-50/80"
                                : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="text-[13px] font-semibold leading-5 text-slate-900">
                            {step.label}
                          </div>
                          <div
                            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              active
                                ? "bg-cyan-100 text-cyan-700"
                                : done
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {active ? "In progress" : done ? "Completed" : "Pending"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<BrainCircuit className="size-5" />}
              title="Thesis Intelligence Overview"
            />
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <ProgressRing value={intelligence?.overall_score ?? 86} />
              <div className="w-full flex-1 space-y-3">
                {intelligenceMetrics.map(([label, value]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex justify-between text-[15px]">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="text-slate-500">{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-cyan-600"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card>
            <SectionTitle icon={<Network className="size-5" />} title="Knowledge Graph" />
            <div className="relative h-72 overflow-hidden rounded-2xl bg-[#07162c]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_38%)]" />
              {graphConnectors.map((connector) => (
                <div
                  className={`absolute h-px origin-center bg-cyan-200/25 ${connector}`}
                  key={connector}
                />
              ))}
              <div className="absolute left-1/2 top-1/2 z-10 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/50 bg-cyan-400 text-sm font-bold text-[#07162c] shadow-lg shadow-cyan-950/30">
                Thesis
              </div>
              {graphNodes.map((node) => (
                <div
                  className={`absolute z-10 ${node.position} ${node.tone} rounded-full border px-3 py-2 text-[13px] font-semibold text-white shadow-sm backdrop-blur`}
                  key={node.label}
                >
                  {node.label}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Sparkles className="size-5" />} title="AI Assistant" />
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
                AI Online
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-[15px] leading-7 text-slate-600">
                Paper 2 shows strong methodological positioning. Next suggested
                action: run reviewer simulation before final template export.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <textarea
                  className="min-h-24 w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-slate-700 outline-none placeholder:text-slate-400"
                  defaultValue=""
                  placeholder="Ask the AI to review continuity, citations, novelty, or structure..."
                />
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[13px] text-slate-400">Mock assistant input</span>
                  <button className="inline-flex size-9 items-center justify-center rounded-lg bg-cyan-600 text-white transition hover:bg-cyan-500">
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {assistantPrompts.map((label) => (
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
                    key={label}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<AlertTriangle className="size-5" />}
              title="Reviewer Risk Meter"
            />
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="relative mx-auto h-32 w-64 max-w-full overflow-hidden">
                <div
                  className="absolute left-1/2 top-2 h-56 w-56 -translate-x-1/2 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 270deg, #10b981 0deg, #10b981 32deg, #f59e0b 32deg, #fde68a 180deg, transparent 180deg)",
                  }}
                />
                <div className="absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-50" />
                <div className="absolute inset-x-0 bottom-0 text-center">
                  <div className="text-[15px] font-semibold text-emerald-700">Low Risk</div>
                  <div className="mt-1 text-3xl font-bold text-amber-950">18%</div>
                  <div className="text-[13px] font-medium text-amber-700">rejection risk</div>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {riskBreakdown.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2 text-[14px] font-medium text-slate-700"
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                        item.status === "ok"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "ok" ? "OK" : "Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <Card>
            <SectionTitle
              icon={<FolderKanban className="size-5" />}
              title="Recent Projects"
              action="Open"
            />
            <div className="space-y-3">
              {dashboardRecentProjects.map((project) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={project.id}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold tracking-[0.14em] text-cyan-700">
                      {project.id}
                    </div>
                    <div className="mt-1 truncate text-[15px] font-semibold text-slate-950">
                      {project.title}
                    </div>
                    <div className="mt-1 text-[13px] text-slate-500">{project.papers}</div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[13px] font-medium text-slate-600 shadow-sm">
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Wand2 className="size-5" />} title="Quick Actions" />
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
                  key={action.label}
                >
                  <span className="text-cyan-700">{action.icon}</span>
                  <span className="text-[15px] font-semibold text-slate-900">
                    {action.label}
                  </span>
                </button>
              ))}
              <button
                className="col-span-2 flex min-h-24 flex-col items-start justify-between rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isRunningWorkflow}
                onClick={handleRunWorkflow}
              >
                <span className="text-cyan-700">
                  {isRunningWorkflow ? <Clock3 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                </span>
                <span className="text-[15px] font-semibold text-slate-900">
                  {isRunningWorkflow ? "Running Full Workflow" : "Run Full Workflow Test"}
                </span>
              </button>
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<ShieldCheck className="size-5" />}
              title="System Notifications"
            />
            <div className="space-y-3">
              {systemNotifications.map((note) => (
                <div className="flex gap-3 rounded-xl bg-slate-50 p-3" key={note}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <div className="text-[15px] leading-6 text-slate-600">{note}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<Sparkles className="size-5" />} title="End-to-End Workflow Runner" />
          {workflowRun ? (
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr_1fr]">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Pipeline status
                </div>
                <div className={`mt-2 text-2xl font-bold ${workflowRun.pipeline_status === "completed" ? "text-emerald-700" : "text-rose-700"}`}>
                  {workflowRun.pipeline_status}
                </div>
                <div className="mt-2 text-[15px] leading-6 text-slate-600">
                  {workflowRun.completed_count} step(s) completed for {workflowRun.paper_id}.
                </div>
                {workflowRun.failed_step ? (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3 text-[14px] font-medium text-rose-700">
                    Failed at: {workflowRun.failed_step}
                  </div>
                ) : null}
                {workflowRun.final_download_urls.docx ? (
                  <button
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900"
                    onClick={() => window.open(`http://127.0.0.1:8000${workflowRun.final_download_urls.docx}`, "_blank")}
                  >
                    Download Final DOCX
                    <ArrowRight className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Completed steps
                </div>
                <div className="mt-3 max-h-52 space-y-2 overflow-auto">
                  {workflowRun.steps_completed.slice(-12).map((step) => (
                    <div className="flex gap-2 rounded-xl bg-white p-3 text-[14px] text-slate-700" key={step.step}>
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span>{step.step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Generated outputs
                </div>
                <div className="mt-3 max-h-52 space-y-2 overflow-auto">
                  {workflowRun.generated_files_summary.filter((file) => file.exists).map((file) => (
                    <div className="rounded-xl bg-white p-3" key={file.label}>
                      <div className="text-[14px] font-semibold text-slate-900">{file.label}</div>
                      <div className="mt-1 truncate text-[12px] text-slate-500">{file.path}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-[15px] font-medium text-slate-500">
              No workflow run found yet. Use Quick Actions to run the full workflow test.
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={<Database className="size-5" />} title="Artifact Registry" />
          <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr_1fr]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total artifacts
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-950">
                {artifacts?.total_artifacts ?? 0}
              </div>
              <div className="mt-2 text-[15px] leading-6 text-slate-600">
                Metadata index for generated JSON, Markdown, and DOCX outputs.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Latest generated outputs
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(artifacts?.latest_artifacts ?? {})
                  .slice(0, 6)
                  .map(([artifactType, artifact]) => (
                    <div className="rounded-xl bg-white p-3" key={artifactType}>
                      <div className="text-[14px] font-semibold text-slate-900">
                        {artifactType.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 truncate text-[12px] text-slate-500">
                        {artifact.file_path}
                      </div>
                    </div>
                  ))}
                {!artifacts?.total_artifacts ? (
                  <div className="rounded-xl bg-white p-3 text-[14px] font-medium text-slate-500">
                    No registered artifacts yet.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Latest key artifacts
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["Formatted DOCX", artifacts?.latest_docx?.updated_at || "Not generated"],
                  ["Markdown", artifacts?.latest_markdown?.updated_at || "Not generated"],
                  ["Audit", artifacts?.latest_audit?.updated_at || "Not generated"],
                  ["Auto regeneration", latestRegeneration?.updated_at || "Not generated"],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between rounded-xl bg-white p-3" key={label}>
                    <span className="text-[14px] font-semibold text-slate-700">{label}</span>
                    <span className="max-w-40 truncate text-[12px] font-medium text-slate-500">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
