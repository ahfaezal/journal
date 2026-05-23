"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  FileCheck2,
  FileText,
  FolderKanban,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  createPaper,
  getPapers,
  getPaperProgress,
  getProjectActivities,
  getProjects,
  type PaperProgressItem,
  type PaperWorkspace,
  type Project,
  type WorkflowActivity,
} from "@/src/lib/api";

const filters = ["All", "Active", "Draft", "Submission Ready", "Archived"];

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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [papers, setPapers] = useState<PaperWorkspace[]>([]);
  const [paperProgress, setPaperProgress] = useState<PaperProgressItem[]>([]);
  const [activities, setActivities] = useState<WorkflowActivity[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "papers" | "activity">("overview");
  const [isCreatingPaper, setIsCreatingPaper] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getProjects();
        const projectId = result[0]?.project_id || result[0]?.id || "PROJECT_001";
        const [projectActivities, projectPapers, progress] = await Promise.all([
          getProjectActivities(projectId).catch(() => []),
          getPapers(projectId).catch(() => []),
          getPaperProgress(projectId).catch(() => null),
        ]);
        if (!cancelled) {
          setProjects(result);
          setActivities(projectActivities);
          setPapers(projectPapers);
          setPaperProgress(progress?.papers ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load projects.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreatePaper() {
    try {
      setIsCreatingPaper(true);
      const projectId = projects[0]?.project_id || projects[0]?.id || "PROJECT_001";
      const paper = await createPaper(projectId, {
        title: `New Journal Paper ${papers.length + 1}`,
        paper_type: "Journal Paper",
        target_journal: "ICC2026",
        status: "draft",
      });
      setPapers((current) => [...current, paper]);
      setActiveTab("papers");
    } finally {
      setIsCreatingPaper(false);
    }
  }

  function handleOpenProject(project: Project) {
    const projectId = project.project_id || project.id;
    const projectTitle = project.title || project.name;

    localStorage.setItem("activeProjectId", projectId);
    localStorage.setItem("activeProjectTitle", projectTitle);
    router.push(`/upload-thesis?project_id=${encodeURIComponent(projectId)}`);
  }

  const summary = useMemo(
    () => [
      {
        label: "Total projects",
        value: String(projects.length).padStart(2, "0"),
        icon: <FolderKanban className="size-5" />,
      },
      {
        label: "Active papers",
        value: String(projects.reduce((total, project) => total + project.target_papers, 0)).padStart(
          2,
          "0",
        ),
        icon: <FileText className="size-5" />,
      },
      { label: "Locked sections", value: "31", icon: <FileCheck2 className="size-5" /> },
      { label: "Pending audits", value: "05", icon: <ShieldCheck className="size-5" /> },
    ],
    [projects],
  );

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <FolderKanban className="size-3.5" />
                Project Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My Projects</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Manage thesis-to-journal workspaces.
              </p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300"
              href="/projects/new"
            >
              Create New Project
              <PlusCircle className="size-4" />
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <button
                    className={`rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                      index === 0
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                    }`}
                    key={filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              {isLoading ? (
                <Card>
                  <div className="text-[15px] font-semibold text-slate-500">Loading projects...</div>
                </Card>
              ) : null}

              {projects.map((project) => {
                const progress = `${project.progress}%`;
                const projectTitle = project.title || project.name;
                const thesisType = project.research_type || project.thesis_type;
                const activity = project.last_activity || "Just now";
                const score = `${project.intelligence_score}%`;
                const papers = `${project.target_papers} target ${
                  project.target_papers === 1 ? "paper" : "papers"
                }`;

                return (
                  <Card key={project.id}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                          {project.id}
                        </div>
                        <h2 className="mt-1 text-xl font-semibold text-slate-950">
                          {projectTitle}
                        </h2>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                          project.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : project.status === "Draft"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-cyan-100 text-cyan-700"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Thesis type", thesisType],
                        ["Target papers", papers],
                        ["Last activity", activity],
                        ["Intelligence score", score],
                      ].map(([label, value]) => (
                        <div className="rounded-xl bg-slate-50 p-3" key={label}>
                          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                            {label}
                          </div>
                          <div className="mt-1 text-[14px] font-semibold leading-6 text-slate-700">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[14px] font-semibold">
                        <span className="text-slate-600">Progress</span>
                        <span className="text-cyan-700">{progress}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-cyan-600" style={{ width: progress }} />
                      </div>
                    </div>

                    <button
                      className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900"
                      onClick={() => {
                        handleOpenProject(project);
                      }}
                      type="button"
                    >
                      Open Project
                      <ArrowRight className="size-4" />
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
                {[
                  ["overview", "Overview"],
                  ["papers", "Papers"],
                  ["activity", "Activity"],
                ].map(([value, label]) => (
                  <button
                    className={`flex-1 rounded-lg px-3 py-2 text-[14px] font-semibold transition ${
                      activeTab === value
                        ? "bg-white text-cyan-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                    key={value}
                    onClick={() => setActiveTab(value as "overview" | "papers" | "activity")}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "papers" ? (
                <div className="space-y-3">
                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isCreatingPaper}
                    onClick={handleCreatePaper}
                    type="button"
                  >
                    {isCreatingPaper ? "Creating Paper" : "Create Paper"}
                    <PlusCircle className="size-4" />
                  </button>
                  {papers.map((paper) => (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3" key={paper.paper_id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[13px] font-semibold tracking-[0.14em] text-cyan-700">
                          {paper.paper_id}
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-500">
                          {paper.status}
                        </span>
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-slate-950">{paper.title}</div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-600">
                        {paper.paper_type} - {paper.target_journal}
                      </div>
                    </div>
                  ))}
                  {!papers.length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[14px] font-medium text-slate-500">
                      No papers created yet.
                    </div>
                  ) : null}
                </div>
              ) : activeTab === "activity" ? (
                <div className="space-y-3">
                  {activities.slice(0, 8).map((activity) => (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3" key={activity.activity_id}>
                      <div className="text-[14px] font-semibold text-slate-950">
                        {activity.activity_title}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-600">
                        {activity.activity_description}
                      </div>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {activity.source_module} - {activity.status}
                      </div>
                    </div>
                  ))}
                  {!activities.length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[14px] font-medium text-slate-500">
                      No activity recorded yet.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-[15px] leading-6 text-slate-600">
                  Select Activity to review project workflow events from upload through submission.
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <FileText className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">Paper Status Table</h2>
              </div>
              <div className="space-y-3">
                {(paperProgress.length ? paperProgress : papers.map((paper) => ({
                  ...paper,
                  progress_percent: 0,
                  completed_steps: [],
                  pending_steps: [],
                }))).map((paper) => (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3" key={paper.paper_id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold tracking-[0.14em] text-cyan-700">
                          {paper.paper_id}
                        </div>
                        <div className="mt-1 text-[14px] font-semibold text-slate-950">{paper.title}</div>
                      </div>
                      <span className="text-[13px] font-bold text-cyan-700">{paper.progress_percent}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${paper.progress_percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <BarChart3 className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">Workspace Summary</h2>
              </div>
              <div className="space-y-3">
                {summary.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-700">{item.icon}</span>
                      <span className="text-[15px] font-semibold text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white">
              <div className="rounded-2xl bg-[#07162c] p-5 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <PlusCircle className="size-3.5" />
                  CTA
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Create New Project</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-300">
                  Start a new thesis-to-journal workspace with thesis upload,
                  MFL mapping, and journal workflow planning.
                </p>
                <Link
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300"
                  href="/projects/new"
                >
                  Create New Project
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
