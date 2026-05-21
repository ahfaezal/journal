"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FileDown,
  FileText,
  Loader2,
  PackageCheck,
  ScrollText,
  Send,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  getFormattedDocxDownloadUrl,
  getFullPaperMarkdownDownloadUrl,
  getPaperActivities,
  getSubmissionStatus,
  type SubmissionStatus,
  type WorkflowActivity,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const paperOptions = [
  { id: "PAPER_1", title: "Need Analysis Paper" },
  { id: "PAPER_2", title: "Development & Validation Paper" },
  { id: "PAPER_3", title: "Framework / Model Paper" },
];

const fallbackSubmission: SubmissionStatus = {
  paper_id: "PAPER_1",
  submission_readiness_percentage: 0,
  readiness_cards: [
    { label: "Paper Completeness", value: "0%", status: "missing" },
    { label: "Citation Audit", value: "Not checked", status: "review" },
    { label: "Formatting Compliance", value: "Not checked", status: "review" },
    { label: "Reviewer Risk", value: "Unknown", status: "review" },
    { label: "Submission Package", value: "Not ready", status: "review" },
  ],
  final_files: [],
  checklist: [],
  export_urls: { docx: "", markdown: "" },
  missing_items: [],
  warnings: ["Submission status has not been loaded."],
  regeneration_status: {
    state: "not_generated",
    last_regenerated_at: "",
    last_revision_timestamp: "",
    triggered_by_revision: "",
  },
  status: "in_progress",
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
  if (status === "ready" || status === "Generated" || status === "Verified") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Missing" || status === "missing") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

export default function FinalSubmissionPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [submission, setSubmission] = useState<SubmissionStatus>(fallbackSubmission);
  const [submissionHistory, setSubmissionHistory] = useState<WorkflowActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissionStatus() {
      try {
        setIsLoading(true);
        const [data, activities] = await Promise.all([
          getSubmissionStatus(PROJECT_ID, selectedPaper),
          getPaperActivities(PROJECT_ID, selectedPaper).catch(() => []),
        ]);
        if (!cancelled) {
          setSubmission(data);
          setSubmissionHistory(activities);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setSubmission({ ...fallbackSubmission, paper_id: selectedPaper });
          setSubmissionHistory([]);
          setNotice("Submission status could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSubmissionStatus();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper]);

  const selectedPaperTitle =
    paperOptions.find((paper) => paper.id === selectedPaper)?.title ?? selectedPaper;
  const submissionEvents = submissionHistory.filter((activity) =>
    [
      "final_submission",
      "docx_generation",
      "auto_regeneration",
      "reviewer_simulation",
      "apply_revision",
    ].includes(activity.activity_type),
  );

  const exportActions = [
    {
      label: "Download DOCX",
      icon: <FileDown className="size-5" />,
      enabled: Boolean(submission.export_urls.docx),
      onClick: () => window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank"),
    },
    {
      label: "Download Markdown",
      icon: <FileText className="size-5" />,
      enabled: Boolean(submission.export_urls.markdown),
      onClick: () => window.open(getFullPaperMarkdownDownloadUrl(PROJECT_ID, selectedPaper), "_blank"),
    },
    {
      label: "Download Package",
      icon: <Download className="size-5" />,
      enabled: false,
      onClick: () => undefined,
    },
    {
      label: "Create Backup",
      icon: <Archive className="size-5" />,
      enabled: false,
      onClick: () => undefined,
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Send className="size-3.5" />
                Submission Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Final Submission
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Prepare final DOCX, PDF, cover letter, metadata, and submission checklist.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isLoading}
                onClick={() => getSubmissionStatus(PROJECT_ID, selectedPaper).then(setSubmission)}
              >
                {isLoading ? "Checking Package" : "Review Package"}
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              </button>
              {submission.export_urls.docx ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-50"
                  onClick={() => window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank")}
                >
                  Download DOCX
                  <Download className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span className={`size-2 rounded-full ${submission.status === "ready" ? "bg-emerald-300" : "bg-amber-300"}`} />
              {isLoading ? "Loading submission status" : `${submission.submission_readiness_percentage}% ready`}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ${
                submission.regeneration_status?.state === "fresh"
                  ? "bg-emerald-300/15 text-emerald-100 ring-emerald-200/20"
                  : submission.regeneration_status?.state === "stale"
                    ? "bg-rose-300/15 text-rose-100 ring-rose-200/20"
                    : "bg-white/10 text-cyan-100 ring-white/10"
              }`}
            >
              Regeneration: {submission.regeneration_status?.state ?? "not_generated"}
            </span>
          </div>
        </section>

        <Card>
          <SectionTitle icon={<FileText className="size-5" />} title="Paper Selector" />
          <div className="grid gap-3 md:grid-cols-3">
            {paperOptions.map((paper) => (
              <button
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedPaper === paper.id
                    ? "border-cyan-200 bg-cyan-50 ring-1 ring-cyan-100"
                    : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/50"
                }`}
                key={paper.id}
                onClick={() => setSelectedPaper(paper.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                      {paper.id}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{paper.title}</div>
                  </div>
                  {selectedPaper === paper.id ? <CheckCircle2 className="size-5 text-cyan-700" /> : null}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {submission.readiness_cards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className={`text-2xl font-bold ${card.status === "ready" ? "text-emerald-700" : "text-amber-700"}`}>
                {card.value}
              </div>
              <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <Card>
          <SectionTitle icon={<ShieldCheck className="size-5" />} title="Regeneration Status" />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["State", submission.regeneration_status?.state ?? "not_generated"],
              ["Last regenerated", submission.regeneration_status?.last_regenerated_at || "Not regenerated"],
              ["Triggered by", submission.regeneration_status?.triggered_by_revision || "No applied revision"],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-4" key={label}>
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </div>
                <div className="mt-2 break-words text-[15px] font-semibold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<ScrollText className="size-5" />} title="Submission History" />
          {submissionEvents.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {submissionEvents.slice(0, 8).map((activity) => (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={activity.activity_id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[15px] font-semibold text-slate-950">
                        {activity.activity_title}
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-500">
                        {activity.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[14px] leading-6 text-slate-600">
                      {activity.activity_description}
                    </div>
                    <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {activity.created_at ? new Date(activity.created_at).toLocaleString() : "Just now"}
                    </div>
                  </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-[15px] font-medium text-slate-500">
              No submission history has been recorded yet.
            </div>
          )}
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <SectionTitle icon={<PackageCheck className="size-5" />} title="Final Files Panel" />
            <div className="space-y-3">
              {submission.final_files.map((file) => (
                <div
                  className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_140px_1.2fr_120px] md:items-center"
                  key={file.name}
                >
                  <div className="font-semibold text-slate-950">{file.name}</div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusTone(file.status)}`}>
                    {file.status}
                  </span>
                  <div className="break-all text-[13px] text-slate-500">{file.path || "Not generated"}</div>
                  <button
                    className="text-left text-[14px] font-semibold text-cyan-700 disabled:text-slate-400"
                    disabled={file.status === "Missing"}
                    onClick={() => {
                      if (file.name === "Final DOCX") {
                        window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank");
                      }
                      if (file.name === "Full Paper Markdown") {
                        window.open(getFullPaperMarkdownDownloadUrl(PROJECT_ID, selectedPaper), "_blank");
                      }
                    }}
                  >
                    {file.action}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FileCheck2 className="size-5" />} title="Submission Checklist" />
            <div className="grid gap-3 sm:grid-cols-2">
              {submission.checklist.map((item) => (
                <div
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  key={item.label}
                >
                  <CheckCircle2
                    className={`mt-0.5 size-4 shrink-0 ${item.status ? "text-emerald-600" : "text-amber-600"}`}
                  />
                  <span className="text-[15px] font-medium leading-6 text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
            {submission.warnings.length ? (
              <div className="mt-4 space-y-2">
                {submission.warnings.map((warning) => (
                  <div className="rounded-xl bg-amber-50 p-3 text-[14px] font-medium leading-6 text-slate-700" key={warning}>
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card>
            <SectionTitle icon={<ScrollText className="size-5" />} title="Cover Letter Preview" />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-inner">
              <div className="mx-auto max-w-3xl rounded-xl border border-slate-100 bg-slate-50 p-6 text-[15px] leading-7 text-slate-700">
                <p>Dear Conference Scientific Committee,</p>
                <p className="mt-4">
                  Please find attached our manuscript for {selectedPaperTitle} for consideration in ICC2026.
                </p>
                <p className="mt-4">
                  The manuscript presents a methodological development and expert validation contribution based on thesis-derived evidence, citation governance, and structured framework construction.
                </p>
                <p className="mt-4">
                  We confirm that the submission package includes the formatted manuscript, verified reference list, and required metadata where available.
                </p>
                <p className="mt-4">Sincerely,</p>
                <p className="font-semibold">Dr. Zahirwan</p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Download className="size-5" />} title="Export Panel" />
            <div className="grid gap-3 sm:grid-cols-2">
              {exportActions.map((action) => (
                <button
                  className="flex min-h-28 flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!action.enabled}
                  key={action.label}
                  onClick={action.onClick}
                >
                  <span className="text-cyan-700">{action.icon}</span>
                  <span className="text-[15px] font-semibold text-slate-900">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <ShieldCheck className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Mark as Submission Ready</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Current backend readiness: {submission.submission_readiness_percentage}%.
                Resolve missing items before final upload.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Mark as Submission Ready
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
