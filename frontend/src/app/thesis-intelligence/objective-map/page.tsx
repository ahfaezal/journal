"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Target,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getInitialActiveProjectId,
  getInitialActiveProjectTitle,
  persistActiveProject,
} from "@/src/lib/active-project";
import {
  buildObjectiveMap,
  getObjectiveMap,
  getProject,
  type ObjectiveMap,
} from "@/src/lib/api";

function createFallbackObjectiveMap(projectId: string): ObjectiveMap {
  return {
  project_id: projectId,
  status: "fallback",
  extraction_status: "fallback",
  total_objectives: 0,
  mapped_objectives: 0,
  unmapped_objectives: 0,
  objectives: [],
};
}

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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function ObjectiveMapPage() {
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [objectiveMap, setObjectiveMap] = useState<ObjectiveMap>(() => createFallbackObjectiveMap(activeProjectId));
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadObjectiveMap() {
      try {
        const data = await getObjectiveMap(activeProjectId);
        if (!cancelled) {
          setObjectiveMap(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setObjectiveMap(createFallbackObjectiveMap(activeProjectId));
          setNotice("Objective map has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadObjectiveMap();

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

  async function handleBuildObjectiveMap() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildObjectiveMap(activeProjectId);
      setObjectiveMap(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build objective map.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const averageConfidence = objectiveMap.objectives.length
    ? Math.round(
        objectiveMap.objectives.reduce(
          (total, objective) => total + objective.confidence_score,
          0,
        ) / objectiveMap.objectives.length,
      )
    : 0;
  const issueRows = objectiveMap.objectives.filter(
    (objective) => objective.alignment_status === "review_required",
  );
  const summaryCards = [
    { label: "Total objectives", value: objectiveMap.total_objectives },
    { label: "Mapped objectives", value: objectiveMap.mapped_objectives },
    { label: "Unmapped objectives", value: objectiveMap.unmapped_objectives },
    { label: "Avg confidence", value: `${averageConfidence}%` },
    { label: "Extraction status", value: statusLabel(objectiveMap.extraction_status ?? objectiveMap.status) },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Target className="size-3.5" />
                Objective Intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Objective Map
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Align research objectives with methodology, findings, discussion,
                and planned journal paper scope.
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
              disabled={isBuilding}
              onClick={handleBuildObjectiveMap}
            >
              {isBuilding ? "Building Objective Map" : "Build Objective Map"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : objectiveMap.status === "mapped" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading objective map" : objectiveMap.status === "mapped" ? "Objective map ready" : "Not generated"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              Extraction: {statusLabel(objectiveMap.extraction_status ?? "unknown")}
            </span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <Target className="size-5 text-cyan-700" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Live
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

        {objectiveMap.general_objective?.objective_text ? (
          <Card>
            <div className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
              General Objective
            </div>
            <h2 className="text-lg font-semibold text-slate-950">
              {objectiveMap.general_objective.objective_text}
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              {objectiveMap.general_objective.source_heading ?? "General objective"} - {objectiveMap.general_objective.confidence_score ?? 60}% confidence
            </p>
          </Card>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Objective Alignment
              </h2>
              <p className="mt-1 text-[14px] font-medium text-slate-500">
                Heuristic links between parsed objectives, findings headings, and discussion headings.
              </p>
            </div>
            <div className="space-y-4">
              {objectiveMap.objectives.length ? (
                objectiveMap.objectives.map((objective) => (
                  <div
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    key={objective.objective_id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                          {objective.objective_id}
                        </div>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                          {objective.objective_text}
                        </h2>
                        <p className="mt-1 text-[14px] text-slate-500">
                          {objective.source_chapter ?? "Bab 1"} - {objective.source_heading ?? objective.source_section}
                        </p>
                        <p className="mt-1 text-[13px] text-slate-400">
                          {objective.source_file}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                            objective.alignment_status === "partially_mapped"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {statusLabel(objective.alignment_status)}
                        </span>
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-[13px] font-semibold text-cyan-700">
                          {objective.confidence_score}% confidence
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-600">
                          {statusLabel(objective.extraction_status ?? "extracted")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white bg-white p-3">
                        <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Linked findings
                        </div>
                        <div className="mt-2 space-y-2">
                          {objective.linked_findings.length ? (
                            objective.linked_findings.map((link, index) => (
                              <div className="text-[14px] font-medium text-slate-700" key={`${link.section}-${index}`}>
                                {link.section}
                              </div>
                            ))
                          ) : (
                            <div className="text-[14px] font-medium text-slate-400">
                              No findings link detected
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white bg-white p-3">
                        <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Linked discussion
                        </div>
                        <div className="mt-2 space-y-2">
                          {objective.linked_discussion.length ? (
                            objective.linked_discussion.map((link, index) => (
                              <div className="text-[14px] font-medium text-slate-700" key={`${link.section}-${index}`}>
                                {link.section}
                              </div>
                            ))
                          ) : (
                            <div className="text-[14px] font-medium text-slate-400">
                              No discussion link detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[14px] leading-6 text-slate-600">
                      {objective.issue}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[15px] font-medium text-slate-500">
                  No objective map data yet. Build the objective map after parsing the thesis.
                </div>
              )}
            </div>
          </Card>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Issues
                </h2>
              </div>
              <div className="space-y-3">
                {issueRows.length ? (
                  issueRows.map((objective) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${objective.objective_id}-issue`}
                    >
                      <div className="font-semibold text-slate-950">
                        {objective.objective_id}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {objective.issue}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      No review issue detected
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
                Use objective alignment before extraction planning so each paper
                has a clear objective, findings, and discussion boundary.
              </p>
              <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                Continue Planner
                <ArrowRight className="size-4" />
              </button>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
