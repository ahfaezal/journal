"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Loader2,
  Network,
  RefreshCcw,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getInitialActiveProjectId,
  getInitialActiveProjectTitle,
  persistActiveProject,
} from "@/src/lib/active-project";
import {
  buildKnowledgeGraph,
  getKnowledgeGraph,
  getProject,
  type KnowledgeGraph,
  type KnowledgeGraphNode,
} from "@/src/lib/api";

function createFallbackGraph(projectId: string): KnowledgeGraph {
  return {
  project_id: projectId,
  status: "fallback",
  nodes: [],
  edges: [],
  summary: {
    total_nodes: 0,
    total_edges: 0,
    weak_links: 0,
    strong_links: 0,
    graph_health_score: 0,
  },
};
}

const nodePositions: Record<string, string> = {
  thesis: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  methodology: "left-5 top-[42%]",
  findings: "left-[22%] bottom-8",
  discussion: "right-[22%] bottom-8",
  references: "right-5 top-[42%]",
};

const typeStyles: Record<KnowledgeGraphNode["type"], string> = {
  thesis: "border-cyan-200/60 bg-cyan-400 text-[#07162c]",
  objective: "border-violet-300/40 bg-violet-300/15 text-white",
  methodology: "border-emerald-300/40 bg-emerald-300/15 text-white",
  findings: "border-sky-300/40 bg-sky-300/15 text-white",
  discussion: "border-amber-300/40 bg-amber-300/15 text-white",
  citation: "border-cyan-300/30 bg-cyan-300/10 text-white",
  table: "border-rose-300/40 bg-rose-300/15 text-white",
  reference: "border-white/20 bg-white/10 text-white",
  issue: "border-red-300/40 bg-red-300/15 text-white",
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

function graphPosition(node: KnowledgeGraphNode, index: number) {
  if (nodePositions[node.id]) {
    return nodePositions[node.id];
  }

  if (node.type === "objective") {
    return ["left-[28%] top-8", "left-1/2 top-5 -translate-x-1/2", "right-[28%] top-8"][index % 3];
  }
  if (node.type === "citation") {
    return ["right-12 top-20", "right-12 bottom-20", "right-[34%] top-28"][index % 3];
  }
  if (node.type === "table") {
    return ["left-12 bottom-20", "left-[36%] bottom-16", "left-12 top-20"][index % 3];
  }
  if (node.type === "issue") {
    return ["right-8 top-8", "left-8 top-8", "right-8 bottom-8"][index % 3];
  }

  return "left-1/2 bottom-5 -translate-x-1/2";
}

export default function KnowledgeGraphPage() {
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [graph, setGraph] = useState<KnowledgeGraph>(() => createFallbackGraph(activeProjectId));
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      try {
        const data = await getKnowledgeGraph(activeProjectId);
        if (!cancelled) {
          setGraph(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setGraph(createFallbackGraph(activeProjectId));
          setNotice("Knowledge graph has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGraph();

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

  async function handleBuildGraph() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildKnowledgeGraph(activeProjectId);
      setGraph(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build knowledge graph.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const summaryCards = [
    { label: "Graph nodes", value: graph.summary.total_nodes },
    { label: "Relationships", value: graph.summary.total_edges },
    { label: "Strong links", value: graph.summary.strong_links },
    { label: "Weak links", value: graph.summary.weak_links },
    { label: "Health", value: `${graph.summary.graph_health_score}%` },
  ];
  const displayNodes = graph.nodes.slice(0, 18);
  const weakLinks = graph.edges.filter((edge) => edge.strength < 60);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Network className="size-3.5" />
                Knowledge Graph
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Knowledge Graph
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                View relationships between thesis objectives, methodology,
                findings, discussion, citations, tables, references, and audit issues.
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
              onClick={handleBuildGraph}
            >
              {isBuilding ? "Building Knowledge Graph" : "Build Knowledge Graph"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : graph.status === "built" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading graph" : graph.status === "built" ? "Graph ready" : "Not generated"}
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
                <GitBranch className="size-5 text-cyan-700" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Graph
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
                Graph View
              </h2>
              <p className="mt-1 text-[14px] font-medium text-slate-500">
                Static visual graph generated from parsed thesis intelligence maps.
              </p>
            </div>
            <div className="relative h-[520px] overflow-hidden rounded-2xl bg-[#07162c]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_38%)]" />
              <svg
                aria-hidden="true"
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <g stroke="rgba(165,243,252,0.22)" strokeWidth="0.35">
                  <line x1="50" x2="18" y1="50" y2="45" />
                  <line x1="50" x2="28" y1="50" y2="84" />
                  <line x1="50" x2="72" y1="50" y2="84" />
                  <line x1="50" x2="82" y1="50" y2="45" />
                  <line x1="50" x2="50" y1="50" y2="12" />
                  <line x1="28" x2="72" y1="84" y2="84" />
                  <line x1="82" x2="72" y1="45" y2="84" />
                  <line x1="18" x2="28" y1="45" y2="84" />
                </g>
              </svg>
              {displayNodes.length ? (
                displayNodes.map((node, index) => (
                  <div
                    className={`absolute z-10 max-w-[150px] rounded-full border px-3 py-2 text-center text-[12px] font-semibold shadow-sm backdrop-blur ${graphPosition(node, index)} ${typeStyles[node.type]}`}
                    key={node.id}
                    title={`${node.label} · ${node.status} · ${node.score}%`}
                  >
                    <div className="truncate">{node.label}</div>
                    <div className="text-[10px] opacity-75">{node.score}%</div>
                  </div>
                ))
              ) : (
                <div className="absolute inset-0 grid place-items-center text-[15px] font-medium text-slate-300">
                  No graph data yet. Build the knowledge graph after generating intelligence maps.
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
                  Weak Links
                </h2>
              </div>
              <div className="space-y-3">
                {weakLinks.length ? (
                  weakLinks.slice(0, 8).map((edge, index) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${edge.source}-${edge.target}-${index}`}
                    >
                      <div className="font-semibold text-slate-950">
                        {edge.relationship.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {edge.source} → {edge.target}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${edge.strength}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-[15px] font-semibold text-emerald-700">
                    No weak link detected
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/70">
              <h2 className="text-lg font-semibold text-slate-950">
                Next Action
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-slate-600">
                Use weak links to prioritise audit fixes before journal planning,
                extraction, and reviewer simulation.
              </p>
              <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                Continue Planner
                <ArrowRight className="size-4" />
              </button>
            </Card>
          </aside>
        </section>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              Relationship Table
            </h2>
            <p className="mt-1 text-[14px] font-medium text-slate-500">
              Edges generated by the graph engine with relationship strength.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[1fr_1fr_1.2fr_0.6fr] bg-slate-50 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <div>Source</div>
                <div>Target</div>
                <div>Relationship</div>
                <div>Strength</div>
              </div>
              {graph.edges.length ? (
                graph.edges.slice(0, 30).map((edge, index) => (
                  <div
                    className="grid grid-cols-[1fr_1fr_1.2fr_0.6fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                    key={`${edge.source}-${edge.target}-${index}`}
                  >
                    <div className="truncate pr-2 font-semibold text-slate-950">{edge.source}</div>
                    <div className="truncate pr-2">{edge.target}</div>
                    <div>{edge.relationship.replaceAll("_", " ")}</div>
                    <div>{edge.strength}%</div>
                  </div>
                ))
              ) : (
                <div className="border-t border-slate-100 px-4 py-10 text-center text-[15px] font-medium text-slate-500">
                  No graph relationships generated yet.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
