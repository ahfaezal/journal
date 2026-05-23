"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  FileText,
  GitBranch,
  Network,
  SearchCheck,
  ShieldCheck,
  Target,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getInitialActiveProjectId,
  getInitialActiveProjectTitle,
  persistActiveProject,
  withProjectQuery,
} from "@/src/lib/active-project";
import { getIntelligence, getProject, type IntelligenceSummary } from "@/src/lib/api";

const objectives = [
  { label: "Research Objective 1", findings: "Linked to Findings", discussion: "Discussion aligned" },
  { label: "Research Objective 2", findings: "Linked to Findings", discussion: "Discussion aligned" },
  { label: "Research Objective 3", findings: "Partial Findings Link", discussion: "Needs discussion check" },
];

const detectedTables = [
  {
    number: "Table 4.25",
    title: "Expert Panel Composition",
    chapter: "Bab 4",
    usage: "Methodology, Findings",
  },
  {
    number: "Table 4.26",
    title: "DACUM Activity Extraction",
    chapter: "Bab 4",
    usage: "Findings",
  },
  {
    number: "Table 4.30",
    title: "Module Framework Construction",
    chapter: "Bab 4",
    usage: "Findings, Discussion",
  },
];

const auditIssues = [
  { label: "Unsupported claims", value: 3, tone: "bg-amber-50 text-amber-700" },
  { label: "Citation mismatch", value: 2, tone: "bg-rose-50 text-rose-700" },
  { label: "Terminology inconsistency", value: 1, tone: "bg-cyan-50 text-cyan-700" },
  { label: "Objective-finding gap", value: 1, tone: "bg-violet-50 text-violet-700" },
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
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          {icon}
        </div>
        <h2 className="truncate text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {action && actionHref ? (
        <Link className="flex shrink-0 items-center gap-1 text-[15px] font-medium text-cyan-700" href={actionHref}>
          {action}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export default function ThesisIntelligencePage() {
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshIntelligence() {
    try {
      setError(null);
      const data = await getIntelligence(activeProjectId);
      setIntelligence(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load thesis intelligence.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    persistActiveProject(activeProjectId);
    let cancelled = false;

    async function loadIntelligence() {
      try {
        const data = await getIntelligence(activeProjectId);

        if (!cancelled) {
          setError(null);
          setIntelligence(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load thesis intelligence.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadIntelligence();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectLabel() {
      try {
        const project = await getProject(activeProjectId);
        const title = project.title || project.name || "";
        if (!cancelled) {
          setActiveProjectTitle(title);
          persistActiveProject(activeProjectId, title);
        }
      } catch {
        if (!cancelled) {
          setActiveProjectTitle("");
        }
      }
    }

    loadProjectLabel();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const dynamicSummaryCards = [
    {
      label: "Overall Intelligence Score",
      value: `${intelligence?.overall_score ?? 86}%`,
      icon: <BrainCircuit className="size-5" />,
    },
    {
      label: "Citation Integrity",
      value: `${intelligence?.citation_integrity ?? 94}%`,
      icon: <GitBranch className="size-5" />,
    },
    {
      label: "Objective Alignment",
      value: `${intelligence?.objective_alignment ?? 88}%`,
      icon: <Target className="size-5" />,
    },
    {
      label: "Methodology Consistency",
      value: `${intelligence?.methodology_consistency ?? 82}%`,
      icon: <SearchCheck className="size-5" />,
    },
    {
      label: "Reviewer Readiness",
      value: `${intelligence?.reviewer_readiness ?? 79}%`,
      icon: <ShieldCheck className="size-5" />,
    },
  ];

  const parsedMetrics = [
    { label: "Headings", value: intelligence?.headings_count ?? 0 },
    { label: "Tables", value: intelligence?.tables_count ?? 0 },
    { label: "Citations", value: intelligence?.citations_count ?? 0 },
    { label: "References", value: intelligence?.references_count ?? 0 },
    { label: "Objectives", value: intelligence?.objectives_count ?? 0 },
  ];

  const citationMap = intelligence?.citation_map;
  const dynamicDetectedTables = intelligence?.table_map?.length
    ? intelligence.table_map.map((table, index) => ({
        number: table.table || `Table ${index + 1}`,
        title: table.status || "Generated table mapping",
        chapter: table.source || "Uploaded files",
        usage: "Intelligence workspace",
      }))
    : detectedTables;

  const dynamicObjectives = intelligence?.objective_map?.length
    ? intelligence.objective_map.map((objective) => ({
        label: String(objective.objective || "Research Objective"),
        findings: String(objective.status || "Mapped"),
        discussion: objective.confidence_score
          ? `${objective.confidence_score}% confidence`
          : "Discussion alignment pending",
      }))
    : objectives;

  const activeAuditIssues = intelligence?.audit_issues || intelligence?.audit;
  const dynamicAuditIssues = activeAuditIssues
    ? [
        { label: "Unsupported claims", value: activeAuditIssues.unsupported_claims, tone: "bg-amber-50 text-amber-700" },
        { label: "Citation mismatch", value: activeAuditIssues.citation_mismatch, tone: "bg-rose-50 text-rose-700" },
        {
          label: "Terminology inconsistency",
          value: activeAuditIssues.terminology_inconsistency,
          tone: "bg-cyan-50 text-cyan-700",
        },
        {
          label: "Objective-finding gap",
          value: activeAuditIssues.objective_finding_gap,
          tone: "bg-violet-50 text-violet-700",
        },
      ]
    : auditIssues;

  return (
    <AppShell>
      <div className="relative isolate mx-auto flex w-full max-w-[1600px] flex-col gap-6 overflow-x-hidden">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <BrainCircuit className="size-3.5" />
                Research Mapping Engine
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Thesis Intelligence
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                AI-generated research maps, citation integrity, objective alignment,
                and audit readiness.
              </p>
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-cyan-200/20">
                <span className="size-2 rounded-full bg-cyan-300" />
                <span className="truncate">
                  Active Project: {activeProjectId}
                  {activeProjectTitle ? ` - ${activeProjectTitle}` : ""}
                </span>
              </div>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300"
              onClick={refreshIntelligence}
            >
              {isLoading ? "Loading Intelligence" : "Refresh Intelligence"}
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
              {error ? "Fallback intelligence mode" : isLoading ? "Loading backend intelligence" : "Backend intelligence loaded"}
            </span>
            {intelligence?.mfl_status ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                MFL: {intelligence.mfl_status}
              </span>
            ) : null}
            {typeof intelligence?.uploaded_chapters_count === "number" ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                Chapters: {intelligence.uploaded_chapters_count}
              </span>
            ) : null}
            {intelligence?.objective_extraction_status ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                Objectives: {intelligence.objective_extraction_status}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {dynamicSummaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <div className="text-cyan-700">{card.icon}</div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  Ready
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-950">{card.value}</div>
              <div className="mt-1 text-[15px] font-medium leading-6 text-slate-600">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Parsed Thesis Metrics
              </h2>
              <p className="text-[14px] font-medium text-slate-500">
                Backend-generated counts from parsed thesis documents.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {parsedMetrics.map((metric) => (
              <div
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                key={metric.label}
              >
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-950">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionTitle
              icon={<GitBranch className="size-5" />}
              title="Citation Master Map"
              action="View Citation Map"
              actionHref={withProjectQuery("/thesis-intelligence/citation-map", activeProjectId)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Total citations", String(citationMap?.total_citations ?? 218)],
                ["Mapped citations", String(citationMap?.mapped_citations ?? 205)],
                ["Unmatched citations", String(citationMap?.unmatched_citations ?? 13)],
                ["MFL references", String(citationMap?.references_count ?? intelligence?.references_count ?? 0)],
                ["MFL match status", citationMap?.mfl_match_status ?? "94%"],
              ].map(([label, value]) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={label}>
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<Target className="size-5" />}
              title="Objective Map"
              action="View Objective Map"
              actionHref={withProjectQuery("/thesis-intelligence/objective-map", activeProjectId)}
            />
            <div className="space-y-3">
              {dynamicObjectives.map((objective) => (
                <div
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={objective.label}
                >
                  <div className="font-semibold text-slate-950">{objective.label}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[13px] font-semibold text-emerald-700">
                      {objective.findings}
                    </span>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[13px] font-semibold text-cyan-700">
                      {objective.discussion}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <SectionTitle
              icon={<BarChart3 className="size-5" />}
              title="Table Map"
              action="View Table Map"
              actionHref={withProjectQuery("/thesis-intelligence/table-map", activeProjectId)}
            />
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="grid grid-cols-[0.8fr_1.7fr_0.9fr_1.2fr] bg-slate-50 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <div>Table</div>
                <div>Title</div>
                <div>Source</div>
                <div>Usage</div>
              </div>
              {dynamicDetectedTables.map((table) => (
                <div
                  className="grid grid-cols-[0.8fr_1.7fr_0.9fr_1.2fr] border-t border-slate-100 px-4 py-4 text-[15px] text-slate-700"
                  key={table.number}
                >
                  <div className="font-semibold text-slate-950">{table.number}</div>
                  <div>{table.title}</div>
                  <div>{table.chapter}</div>
                  <div>{table.usage}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<AlertTriangle className="size-5" />}
              title="Thesis Audit"
              action="Open Audit"
              actionHref={withProjectQuery("/thesis-intelligence/audit", activeProjectId)}
            />
            <div className="space-y-3">
              {dynamicAuditIssues.map((issue) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={issue.label}
                >
                  <span className="text-[15px] font-medium text-slate-700">{issue.label}</span>
                  <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${issue.tone}`}>
                    {issue.value}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
              Run Full Audit
              <ArrowRight className="size-4" />
            </button>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card>
            <SectionTitle
              icon={<Network className="size-5" />}
              title="Knowledge Graph"
              action="Open Graph"
              actionHref={withProjectQuery("/thesis-intelligence/knowledge-graph", activeProjectId)}
            />
            <div className="relative h-80 overflow-hidden rounded-2xl bg-[#07162c]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_38%)]" />
              <svg
                aria-hidden="true"
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <g stroke="rgba(165, 243, 252, 0.25)" strokeWidth="0.45">
                  <line x1="50" x2="18" y1="50" y2="18" />
                  <line x1="50" x2="16" y1="50" y2="50" />
                  <line x1="50" x2="20" y1="50" y2="78" />
                  <line x1="50" x2="82" y1="50" y2="18" />
                  <line x1="50" x2="84" y1="50" y2="50" />
                  <line x1="50" x2="80" y1="50" y2="78" />
                  <line x1="50" x2="50" y1="50" y2="92" />
                </g>
              </svg>
              <div className="absolute left-1/2 top-1/2 z-10 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/50 bg-cyan-400 text-sm font-bold text-[#07162c] shadow-lg shadow-cyan-950/30">
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

          <Card className="bg-white">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-slate-50 p-5">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-[13px] font-semibold text-cyan-700">
                  <FileText className="size-3.5" />
                  Bottom Next Step
                </div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Journal Extraction Planner
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  Use this intelligence map to plan Paper 1 and Paper 2.
                </p>
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-[15px] font-semibold text-white transition hover:bg-cyan-500">
                Open Planner
                <ArrowRight className="size-4" />
              </button>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
