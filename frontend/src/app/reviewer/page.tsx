"use client";

import { useEffect, useState } from "react";
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
import {
  applyRevision,
  generateRevisionReport,
  getAppliedRevisions,
  getReviewerReport,
  getRevisionReport,
  runReviewerSimulation,
  type AppliedRevision,
  type ReviewerReport,
  type RevisionReport,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const paperOptions = ["PAPER_1", "PAPER_2", "PAPER_3"];

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

const fallbackReport: ReviewerReport = {
  project_id: PROJECT_ID,
  paper_id: "PAPER_1",
  overall_recommendation: "Review required",
  acceptance_probability: 79,
  major_issues: reviewerReports.map((report) => report.major),
  minor_issues: reviewerReports.map((report) => report.minor),
  methodological_concerns: ["Clarify how DDR phases connect to the extraction and validation workflow."],
  novelty_concerns: ["Novelty contribution needs to appear earlier and more explicitly."],
  citation_concerns: ["Confirm all in-text citations appear in the final reference list."],
  writing_quality_concerns: ["Reduce repeated contribution phrasing between Discussion and Conclusion."],
  revision_suggestions: suggestions.map((item) => ({
    priority: item.priority,
    suggestion: item.revision,
    target_section: item.section,
  })),
  reviewer_personas: reviewerReports.map((report) => ({
    name: `${report.reviewer}: ${report.focus}`,
    decision_tendency: report.decision,
    major_comments: report.major,
    minor_comments: report.minor,
    recommendation: report.recommendation,
  })),
  ai_enabled: false,
  ai_model: "",
  review_mode: "heuristic",
  review_version: "reviewer_simulator_v1",
  generated_at: "",
};

const fallbackRevisionReport: RevisionReport = {
  project_id: PROJECT_ID,
  paper_id: "PAPER_1",
  revisions: [],
  total_revisions: 0,
  ai_enabled: false,
  ai_model: "",
  revision_mode: "heuristic",
  revision_version: "revision_engine_v1",
  generated_at: "",
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

export default function ReviewerPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [report, setReport] = useState<ReviewerReport>(fallbackReport);
  const [revisionReport, setRevisionReport] = useState<RevisionReport>(fallbackRevisionReport);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false);
  const [activeApplyRevision, setActiveApplyRevision] = useState<string | null>(null);
  const [appliedRevisions, setAppliedRevisions] = useState<AppliedRevision[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadReviewerReport(paperId: string) {
    try {
      setIsLoading(true);
      const data = await getReviewerReport(PROJECT_ID, paperId);
      setReport(data);
      const revision = await getRevisionReport(PROJECT_ID, paperId).catch(() => ({
        ...fallbackRevisionReport,
        paper_id: paperId,
      }));
      const applied = await getAppliedRevisions(PROJECT_ID, paperId).catch(() => ({
        applied_revisions: [],
      }));
      setRevisionReport(revision);
      setAppliedRevisions(applied.applied_revisions);
      setNotice(null);
    } catch (error) {
      console.error("Load reviewer report failed", { paperId, error });
      setReport({ ...fallbackReport, paper_id: paperId });
      setRevisionReport({ ...fallbackRevisionReport, paper_id: paperId });
      setAppliedRevisions([]);
      setNotice("Reviewer report has not been generated yet.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadReviewerReport(selectedPaper);
    });
  }, [selectedPaper]);

  async function handleRunSimulation() {
    try {
      setIsRunning(true);
      setNotice(null);
      const data = await runReviewerSimulation(PROJECT_ID, selectedPaper);
      setReport(data);
      setNotice("Reviewer simulation completed successfully.");
    } catch (error) {
      console.error("Run reviewer simulation failed", { selectedPaper, error });
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to run reviewer simulation.",
      );
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  }

  async function handleGenerateRevisionSuggestions() {
    try {
      setIsGeneratingRevision(true);
      setNotice(null);
      const data = await generateRevisionReport(PROJECT_ID, selectedPaper);
      setRevisionReport(data);
      setNotice("Revision suggestions generated successfully.");
    } catch (error) {
      console.error("Generate revision suggestions failed", { selectedPaper, error });
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to generate revision suggestions.",
      );
    } finally {
      setIsGeneratingRevision(false);
    }
  }

  async function handleApplyRevision(revisionId: string) {
    try {
      setActiveApplyRevision(revisionId);
      setNotice(null);
      const result = await applyRevision(PROJECT_ID, selectedPaper, revisionId);
      setAppliedRevisions((current) => [
        ...current.filter((item) => item.revision_id !== revisionId),
        result.applied_revision,
      ]);
      setRevisionReport((current) => ({
        ...current,
        revisions: current.revisions.map((revision) =>
          revision.revision_id === revisionId
            ? { ...revision, apply_status: "applied" }
            : revision,
        ),
      }));
      setNotice(`Revision ${revisionId} applied to ${result.applied_revision.affected_section}.`);
    } catch (error) {
      console.error("Apply revision failed", { selectedPaper, revisionId, error });
      setNotice(
        error instanceof Error ? error.message : "Unable to apply revision.",
      );
    } finally {
      setActiveApplyRevision(null);
    }
  }

  const dynamicSummaryCards = [
    {
      label: "Overall Reviewer Readiness",
      value: `${report.acceptance_probability}%`,
      tone: "text-cyan-700",
    },
    {
      label: "Rejection Risk",
      value: `${Math.max(0, 100 - report.acceptance_probability)}%`,
      tone: "text-amber-700",
    },
    {
      label: "Novelty Strength",
      value: report.novelty_concerns.length > 1 ? "Moderate" : "Strong",
      tone: "text-violet-700",
    },
    {
      label: "Methodology Confidence",
      value: report.methodological_concerns.length > 1 ? "Review" : "High",
      tone: "text-emerald-700",
    },
    {
      label: "Citation Integrity",
      value: report.citation_concerns.length > 1 ? "Review" : "Strong",
      tone: "text-emerald-700",
    },
  ];
  const riskBreakdownFromReport = [
    {
      label: "Novelty weakness",
      value: report.novelty_concerns.length > 1 ? "Medium" : "Low",
      width: report.novelty_concerns.length > 1 ? "46%" : "20%",
    },
    {
      label: "Unclear contribution",
      value: report.major_issues.length > 1 ? "Medium" : "Low",
      width: report.major_issues.length > 1 ? "42%" : "24%",
    },
    {
      label: "Citation mismatch",
      value: report.citation_concerns.length > 1 ? "Medium" : "Low",
      width: report.citation_concerns.length > 1 ? "44%" : "18%",
    },
    {
      label: "Methodology gap",
      value: report.methodological_concerns.length > 1 ? "Medium" : "Low",
      width: report.methodological_concerns.length > 1 ? "40%" : "16%",
    },
    {
      label: "Writing quality issue",
      value: report.writing_quality_concerns.length > 1 ? "Medium" : "Low",
      width: report.writing_quality_concerns.length > 1 ? "40%" : "18%",
    },
  ];

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
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isRunning}
              onClick={handleRunSimulation}
              type="button"
            >
              {isRunning
                ? "Running Simulation"
                : appliedRevisions.length
                  ? "Re-run Reviewer Simulation"
                  : "Run Reviewer Simulation"}
              <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {paperOptions.map((paper) => (
              <button
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  selectedPaper === paper
                    ? "bg-cyan-300 text-[#07162c]"
                    : "bg-white/10 text-cyan-100 ring-1 ring-white/10 hover:bg-white/15"
                }`}
                key={paper}
                onClick={() => setSelectedPaper(paper)}
                type="button"
              >
                {paper}
              </button>
            ))}
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              {report.ai_enabled ? `AI Assisted: ${report.ai_model}` : "Heuristic Reviewer"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              {revisionReport.ai_enabled ? `Revision AI: ${revisionReport.ai_model}` : "Revision Heuristic"}
            </span>
            {isLoading ? (
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                Loading reviewer report
              </span>
            ) : null}
          </div>
        </section>

        {notice ? (
          <div
            className={`rounded-2xl border p-4 text-[15px] font-semibold ${
              notice === "Reviewer simulation completed successfully."
              || notice === "Revision suggestions generated successfully."
              || notice.startsWith("Revision ")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {notice}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {dynamicSummaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className={`text-3xl font-bold ${card.tone}`}>{card.value}</div>
              <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {report.reviewer_personas.map((persona) => (
            <Card key={persona.name}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                    Reviewer Persona
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{persona.name}</h2>
                </div>
                <MessageSquareText className="size-5 text-cyan-700" />
              </div>
              <div className="rounded-xl bg-cyan-50 p-3">
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  Decision tendency
                </div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  {persona.decision_tendency}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Major comments", persona.major_comments],
                  ["Minor comments", persona.minor_comments],
                  ["Recommendation", persona.recommendation],
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

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionTitle icon={<AlertTriangle className="size-5" />} title="Major Issues" />
            <div className="space-y-3">
              {report.major_issues.map((issue) => (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-[15px] leading-6 text-rose-900" key={issue}>
                  {issue}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<MessageSquareText className="size-5" />} title="Minor Issues" />
            <div className="space-y-3">
              {report.minor_issues.map((issue) => (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-[15px] leading-6 text-amber-900" key={issue}>
                  {issue}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle icon={<AlertTriangle className="size-5" />} title="Rejection Risk Breakdown" />
            <div className="space-y-4">
              {riskBreakdownFromReport.map((risk) => (
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
              {report.revision_suggestions.map((item) => (
                <div
                  className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[110px_1fr_140px]"
                  key={`${item.priority}-${item.target_section}-${item.suggestion}`}
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
                  <div className="text-[15px] leading-6 text-slate-700">{item.suggestion}</div>
                  <div className="text-[14px] font-semibold text-cyan-700">{item.target_section}</div>
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
              {appliedRevisions.length ? "Re-run Reviewer Simulation" : "Apply Reviewer Suggestions"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionTitle icon={<Sparkles className="size-5" />} title="AI Revision Engine" />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-5 text-[15px] font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isGeneratingRevision}
              onClick={handleGenerateRevisionSuggestions}
              type="button"
            >
              {isGeneratingRevision ? "Generating Revisions" : "Generate Revision Suggestions"}
              <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[13px] font-semibold text-cyan-700">
              {revisionReport.ai_enabled ? `AI Assisted: ${revisionReport.ai_model}` : "Heuristic Revision"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600">
              {revisionReport.total_revisions} revision item(s)
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700">
              {appliedRevisions.length} applied
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {revisionReport.revisions.length ? (
              revisionReport.revisions.map((revision) => (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={revision.revision_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                        {revision.revision_id} - {revision.affected_section}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        {revision.linked_issue}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        revision.priority === "High"
                          ? "bg-rose-100 text-rose-700"
                          : revision.priority === "Low"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {revision.priority}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Before
                      </div>
                      <p className="mt-2 max-h-40 overflow-auto text-[14px] leading-6 text-slate-600">
                        {revision.before_text}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                        After
                      </div>
                      <p className="mt-2 max-h-40 overflow-auto text-[14px] leading-6 text-slate-700">
                        {revision.after_text || revision.improved_paragraph}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px]">
                    <div className="rounded-xl bg-white p-4 text-[14px] leading-6 text-slate-600">
                      <div className="font-semibold text-slate-950">Revision rationale</div>
                      <p className="mt-1">{revision.revision_rationale}</p>
                      <div className="mt-3 font-semibold text-slate-950">Comparison</div>
                      <p className="mt-1">{revision.comparison_summary}</p>
                    </div>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-cyan-600 px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={revision.apply_status === "applied" || activeApplyRevision === revision.revision_id}
                      onClick={() => handleApplyRevision(revision.revision_id)}
                      type="button"
                    >
                      {revision.apply_status === "applied"
                        ? "Applied"
                        : activeApplyRevision === revision.revision_id
                          ? "Applying"
                          : "Apply Revision"}
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-[15px] font-medium text-slate-500">
                No revision suggestions generated yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
