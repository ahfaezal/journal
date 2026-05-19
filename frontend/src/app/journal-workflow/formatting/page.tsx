"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  LayoutTemplate,
  ListChecks,
  Loader2,
  RefreshCcw,
  ScrollText,
  Wand2,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  generateFormattedDocx,
  getFormattedDocxDownloadUrl,
  getFormattingReport,
  type FormattingReport,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const paperOptions = [
  { id: "PAPER_1", title: "Need Analysis Paper" },
  { id: "PAPER_2", title: "Development & Validation Paper" },
  { id: "PAPER_3", title: "Framework / Model Paper" },
];

const templates = [
  { name: "ICC2026", status: "Active", wordLimit: "5,000-7,000", citation: "APA-aligned" },
  { name: "APA 7", status: "Available", wordLimit: "Flexible", citation: "APA 7" },
  { name: "MyCite", status: "Available", wordLimit: "Journal-specific", citation: "APA / journal style" },
  { name: "IEEE", status: "Available", wordLimit: "Conference-specific", citation: "Numeric" },
  { name: "Scopus", status: "Available", wordLimit: "Journal-specific", citation: "Publisher style" },
];

const rules = [
  ["Title format", "Bold, centered, Times New Roman"],
  ["Author format", "Author metadata placeholder for later export layer"],
  ["Abstract word count", "Checked against generated paper word count"],
  ["Heading levels", "Main sections exported as Word heading level 1"],
  ["Table format", "Table numbering audit reported for review"],
  ["Citation style", "Author-year citation governance from reference bank"],
  ["Reference format", "APA-like reference list from backend reference bank"],
];

const fallbackReport: FormattingReport = {
  paper_id: "PAPER_1",
  template_used: "ICC2026",
  docx_path: "",
  sections_formatted: [],
  reference_list_included: false,
  total_word_count: 0,
  formatting_audit: {
    heading_consistency: "Not generated",
    citation_style: "Not generated",
    reference_list: "Not generated",
    table_numbering: "Not generated",
    figure_numbering: "Not generated",
    margin_font_compliance: "Not generated",
  },
  status: "not_generated",
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

function auditTone(status: string) {
  if (status === "OK" || status === "No figures detected") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status.includes("Review")) {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Not generated") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-cyan-100 text-cyan-700";
}

export default function FormattingPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [report, setReport] = useState<FormattingReport>(fallbackReport);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        const data = await getFormattingReport(PROJECT_ID, selectedPaper);
        if (!cancelled) {
          setReport(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setReport({ ...fallbackReport, paper_id: selectedPaper });
          setNotice("Formatting report has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper]);

  async function handleGenerateDocx() {
    try {
      setIsGenerating(true);
      setNotice(null);
      const data = await generateFormattedDocx(PROJECT_ID, selectedPaper);
      setReport(data);
    } catch (generateError) {
      setNotice(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate formatted DOCX.",
      );
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }

  const auditItems = [
    ["Heading consistency", report.formatting_audit.heading_consistency],
    ["Citation style", report.formatting_audit.citation_style],
    ["Reference list", report.formatting_audit.reference_list],
    ["Table numbering", report.formatting_audit.table_numbering],
    ["Figure numbering", report.formatting_audit.figure_numbering],
    ["Margin/font compliance", report.formatting_audit.margin_font_compliance],
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Wand2 className="size-3.5" />
                Submission Formatting
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Formatting & Template
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Apply journal, conference, APA, MyCite, IEEE, or Scopus formatting rules.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isGenerating}
              onClick={handleGenerateDocx}
            >
              {isGenerating ? "Generating DOCX" : "Generate Formatted DOCX"}
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
            {report.status === "formatted" ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-50"
                onClick={() => window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank")}
              >
                Download DOCX
                <ArrowRight className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : report.status === "formatted" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading formatting report" : report.status === "formatted" ? "DOCX generated" : "Waiting for DOCX generation"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
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
          {templates.map((template) => (
            <Card className="p-4" key={template.name}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{template.name}</h2>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      template.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {template.status}
                  </span>
                </div>
                <LayoutTemplate className="size-5 text-cyan-700" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Word limit
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-700">
                    {template.wordLimit}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Citation style
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-700">
                    {template.citation}
                  </div>
                </div>
              </div>
              <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900">
                Select Template
                <ArrowRight className="size-4" />
              </button>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <SectionTitle icon={<FileCheck2 className="size-5" />} title="Formatting Rules Panel" />
            <div className="space-y-3">
              {rules.map(([label, value]) => (
                <div
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[180px_1fr]"
                  key={label}
                >
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </div>
                  <div className="text-[15px] font-semibold leading-6 text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FileText className="size-5" />} title="Generated DOCX Status" />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-inner">
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  ["Status", report.status],
                  ["Template", report.template_used],
                  ["Word count", String(report.total_word_count)],
                  ["References included", report.reference_list_included ? "Yes" : "No"],
                  ["Sections formatted", String(report.sections_formatted.length)],
                  ["Generated at", report.generated_at || "Not generated"],
                ].map(([label, value]) => (
                  <div className="rounded-xl bg-slate-50 p-4" key={label}>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Output path
                </div>
                <div className="mt-2 break-all text-[14px] font-semibold text-slate-700">
                  {report.docx_path || "DOCX output will appear here after generation."}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.sections_formatted.length ? (
                  report.sections_formatted.map((section) => (
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-[13px] font-semibold text-cyan-700" key={section}>
                      {section}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-600">
                    No section formatted yet
                  </span>
                )}
              </div>
              {report.status === "formatted" ? (
                <button
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900"
                  onClick={() => window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank")}
                >
                  Download DOCX
                  <ArrowRight className="size-4" />
                </button>
              ) : null}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<ListChecks className="size-5" />} title="Formatting Audit" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {auditItems.map(([label, status]) => (
              <div
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                key={label}
              >
                <span className="text-[15px] font-semibold text-slate-700">{label}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${auditTone(status)}`}>
                  {status === "OK" ? <CheckCircle2 className="size-3.5" /> : null}
                  {status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <ScrollText className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Generate Formatted DOCX</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Export the selected paper into a template-aligned Word document
                after format, citation, table, and reference checks pass.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isGenerating}
              onClick={handleGenerateDocx}
            >
              {isGenerating ? "Generating Formatted DOCX" : "Generate Formatted DOCX"}
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </button>
            {report.status === "formatted" ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-50"
                onClick={() => window.open(getFormattedDocxDownloadUrl(PROJECT_ID, selectedPaper), "_blank")}
              >
                Download DOCX
                <ArrowRight className="size-4" />
              </button>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
