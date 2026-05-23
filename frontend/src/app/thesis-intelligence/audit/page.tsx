"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getInitialActiveProjectId,
  getInitialActiveProjectTitle,
  persistActiveProject,
} from "@/src/lib/active-project";
import {
  getProject,
  getThesisAudit,
  runThesisAudit,
  type ThesisAudit,
  type ThesisAuditIssue,
} from "@/src/lib/api";

function createFallbackAudit(projectId: string): ThesisAudit {
  return {
  project_id: projectId,
  status: "fallback",
  audit_timestamp: "",
  overall_audit_score: 0,
  citation_score: 0,
  objective_alignment_score: 0,
  table_mapping_score: 0,
  methodology_consistency_score: 0,
  reviewer_readiness_score: 0,
  issues: [],
};
}

const severityOrder = ["high", "medium", "low"] as const;

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

function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return "Not audited yet";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function severityClass(severity: ThesisAuditIssue["severity"]) {
  if (severity === "high") {
    return "bg-rose-50 text-rose-700";
  }
  if (severity === "medium") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-cyan-50 text-cyan-700";
}

export default function ThesisAuditPage() {
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [audit, setAudit] = useState<ThesisAudit>(() => createFallbackAudit(activeProjectId));
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAudit() {
      try {
        const data = await getThesisAudit(activeProjectId);
        if (!cancelled) {
          setAudit(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setAudit(createFallbackAudit(activeProjectId));
          setNotice("Thesis audit has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAudit();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  useEffect(() => {
    persistActiveProject(activeProjectId);
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

  async function handleRunAudit() {
    try {
      setIsRunning(true);
      setNotice(null);
      const data = await runThesisAudit(activeProjectId);
      setAudit(data);
    } catch (auditError) {
      setNotice(
        auditError instanceof Error
          ? auditError.message
          : "Unable to run thesis audit.",
      );
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  }

  const summaryCards = [
    { label: "Overall audit", value: `${audit.overall_audit_score}%` },
    { label: "Citation", value: `${audit.citation_score}%` },
    { label: "Objectives", value: `${audit.objective_alignment_score}%` },
    { label: "Tables", value: `${audit.table_mapping_score}%` },
    { label: "Reviewer", value: `${audit.reviewer_readiness_score}%` },
  ];
  const groupedIssues = severityOrder.map((severity) => ({
    severity,
    issues: audit.issues.filter((issue) => issue.severity === severity),
  }));
  const topRecommendations = audit.issues.slice(0, 5);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <ClipboardCheck className="size-3.5" />
                Audit Intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Thesis Audit
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Audit unsupported claims, citation mismatches, table metadata,
                and objective-finding continuity before journal extraction.
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isRunning}
              onClick={handleRunAudit}
            >
              {isRunning ? "Running Full Thesis Audit" : "Run Full Thesis Audit"}
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : audit.status === "audited" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading audit" : audit.status === "audited" ? "Audit ready" : "Not audited"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              Last audit: {formatTimestamp(audit.audit_timestamp)}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <ClipboardCheck className="size-5 text-cyan-700" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Score
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-950">
                {card.value}
              </div>
              <div className="mt-1 text-[15px] font-medium leading-6 text-slate-600">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Issues by Severity
              </h2>
              <p className="mt-1 text-[14px] font-medium text-slate-500">
                Reviewer-facing audit issues generated from citation, objective,
                table, and parsed thesis evidence.
              </p>
            </div>
            <div className="space-y-5">
              {groupedIssues.map((group) => (
                <div key={group.severity}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold capitalize text-slate-950">
                      {group.severity} severity
                    </h3>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${severityClass(group.severity)}`}>
                      {group.issues.length} issue
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <div className="min-w-[900px]">
                      <div className="grid grid-cols-[0.7fr_1fr_1fr_1.7fr_1.5fr_1fr] bg-slate-50 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        <div>ID</div>
                        <div>Type</div>
                        <div>Section</div>
                        <div>Description</div>
                        <div>Suggested Fix</div>
                        <div>Source</div>
                      </div>
                      {group.issues.length ? (
                        group.issues.map((issue) => (
                          <div
                            className="grid grid-cols-[0.7fr_1fr_1fr_1.7fr_1.5fr_1fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                            key={issue.issue_id}
                          >
                            <div className="font-semibold text-slate-950">{issue.issue_id}</div>
                            <div>{issue.issue_type.replaceAll("_", " ")}</div>
                            <div className="truncate pr-2">{issue.section}</div>
                            <div>{issue.description}</div>
                            <div>{issue.suggested_fix}</div>
                            <div className="truncate pr-2">{issue.related_source}</div>
                          </div>
                        ))
                      ) : (
                        <div className="border-t border-slate-100 px-4 py-6 text-center text-[14px] font-medium text-slate-500">
                          No {group.severity} severity issue detected.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Recommendations
                </h2>
              </div>
              <div className="space-y-3">
                {topRecommendations.length ? (
                  topRecommendations.map((issue) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${issue.issue_id}-recommendation`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-950">
                          {issue.issue_id}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityClass(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {issue.suggested_fix}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      No active recommendation
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/70">
              <h2 className="text-lg font-semibold text-slate-950">
                Next Action
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-slate-600">
                Resolve high and medium severity issues before journal section
                writing, formatting, and reviewer simulation.
              </p>
              <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                Open Reviewer Simulator
                <ArrowRight className="size-4" />
              </button>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
