"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
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
  buildCitationMap,
  getCitationMap,
  getProject,
  type CitationMap,
} from "@/src/lib/api";

function createFallbackCitationMap(projectId: string): CitationMap {
  return {
  project_id: projectId,
  status: "fallback",
  mfl_available: false,
  total_citations: 0,
  unique_citations: 0,
  matched_citations: 0,
  unmatched_citations: 0,
  duplicate_citations: 0,
  references_count: 0,
  match_rate: 0,
  mfl_match_status: "Not generated",
  citations: [],
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

export default function CitationMapPage() {
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [citationMap, setCitationMap] = useState<CitationMap>(() => createFallbackCitationMap(activeProjectId));
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCitationMap() {
      try {
        const data = await getCitationMap(activeProjectId);
        if (!cancelled) {
          setCitationMap(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setCitationMap(createFallbackCitationMap(activeProjectId));
          setNotice("Citation map has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCitationMap();

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

  async function handleBuildCitationMap() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildCitationMap(activeProjectId);
      setCitationMap(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build citation map.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const summaryCards = [
    { label: "Total citations", value: citationMap.total_citations },
    { label: "MFL references", value: citationMap.references_count ?? 0 },
    { label: "Unique citations", value: citationMap.unique_citations },
    { label: "Matched citations", value: citationMap.matched_citations },
    { label: "Unmatched citations", value: citationMap.unmatched_citations },
    { label: "Duplicate citations", value: citationMap.duplicate_citations },
    { label: "Match rate", value: `${citationMap.match_rate ?? 0}%` },
  ];
  const issueRows = citationMap.citations.filter(
    (citation) => citation.mfl_status !== "matched" || citation.issue !== "No issue detected",
  );
  const unmatchedRows = citationMap.citations.filter((citation) => citation.mfl_status !== "matched");
  const duplicateRows = citationMap.citations.filter((citation) => citation.issue.includes("duplicate citation"));

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <GitBranch className="size-3.5" />
                Citation Intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Citation Map
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Track in-text citations, MFL matches, unmatched citations, and
                citation integrity before writing.
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
              onClick={handleBuildCitationMap}
            >
              {isBuilding ? "Building Citation Map" : "Build Citation Map"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : citationMap.status === "mapped" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading citation map" : citationMap.status === "mapped" ? "Citation map ready" : "Not generated"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              MFL: {citationMap.mfl_available ? "Available" : "Not detected"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              Match: {citationMap.mfl_match_status ?? `${citationMap.match_rate ?? 0}% matched`}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <GitBranch className="size-5 text-cyan-700" />
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

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Citation Matching Table
                </h2>
                <p className="mt-1 text-[14px] font-medium text-slate-500">
                  Parsed citations mapped against available MFL/reference evidence.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[1.2fr_0.85fr_0.7fr_1fr_1.1fr_0.8fr_1.2fr] bg-slate-50 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  <div>Citation</div>
                  <div>Author</div>
                  <div>Year</div>
                  <div>Source File</div>
                  <div>Source Section</div>
                  <div>MFL Status</div>
                  <div>Issue</div>
                </div>
                {citationMap.citations.length ? (
                  citationMap.citations.map((citation, index) => (
                    <div
                      className="grid grid-cols-[1.2fr_0.85fr_0.7fr_1fr_1.1fr_0.8fr_1.2fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                      key={`${citation.citation_text}-${citation.source_file}-${index}`}
                    >
                      <div className="font-semibold text-slate-950">{citation.citation_text}</div>
                      <div>{citation.detected_author}</div>
                      <div>{citation.detected_year}</div>
                      <div className="truncate pr-2">{citation.source_file}</div>
                      <div className="truncate pr-2">{citation.source_section}</div>
                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                            citation.mfl_status === "matched"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {citation.mfl_status}
                        </span>
                      </div>
                      <div>{citation.issue}</div>
                    </div>
                  ))
                ) : (
                  <div className="border-t border-slate-100 px-4 py-10 text-center text-[15px] font-medium text-slate-500">
                    No citation map data yet. Build the citation map after parsing the thesis.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Unmatched & Issues
                </h2>
              </div>
              <div className="space-y-3">
                {issueRows.length ? (
                  issueRows.slice(0, 6).map((citation, index) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${citation.citation_text}-issue-${index}`}
                    >
                      <div className="font-semibold text-slate-950">
                        {citation.citation_text}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {citation.issue}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      No issue detected
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Top Unmatched
                </h2>
              </div>
              <div className="space-y-3">
                {unmatchedRows.length ? (
                  unmatchedRows.slice(0, 6).map((citation, index) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${citation.citation_text}-unmatched-${index}`}
                    >
                      <div className="font-semibold text-slate-950">{citation.citation_text}</div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {citation.detected_author} ({citation.detected_year}) - {citation.issue}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-[15px] font-semibold text-emerald-700">
                    All detected citations matched.
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <GitBranch className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Duplicate Citations
                </h2>
              </div>
              <div className="space-y-3">
                {duplicateRows.length ? (
                  duplicateRows.slice(0, 6).map((citation, index) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${citation.citation_text}-duplicate-${index}`}
                    >
                      <div className="font-semibold text-slate-950">{citation.citation_text}</div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {citation.source_file}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[15px] font-medium text-slate-500">
                    No duplicate citation issue detected.
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/70">
              <h2 className="text-lg font-semibold text-slate-950">
                Next Action
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-slate-600">
                Use the citation map to verify unsupported claims, MFL gaps, and
                reference readiness before section writing.
              </p>
              <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                Continue Audit
                <ArrowRight className="size-4" />
              </button>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
