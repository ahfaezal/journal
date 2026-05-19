"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  FileSearch,
  FileText,
  GitBranch,
  Layers3,
  ListChecks,
  Loader2,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
  Table2,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  buildPaperExtraction,
  getPaperExtraction,
  type PaperExtraction,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const paperOptions = ["PAPER_1", "PAPER_2", "PAPER_3"];

const fallbackExtraction: PaperExtraction = {
  project_id: PROJECT_ID,
  paper_id: "PAPER_1",
  paper_title: "Need Analysis Paper",
  target_template: "ICC2026",
  source_chapters: [],
  extraction_map: {},
  extracted_content_preview: {
    key_claims: [],
    supporting_citations: [],
    tables_used: [],
    excluded_content: [],
  },
  quality_checks: {},
  extraction_status: "fallback",
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

function checkTone(status: string) {
  if (["Ready", "Aligned", "Low"].includes(status)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["Moderate", "Medium", "Review"].includes(status)) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

export default function PaperExtractionPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [extraction, setExtraction] = useState<PaperExtraction>(fallbackExtraction);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExtraction() {
      try {
        setIsLoading(true);
        const data = await getPaperExtraction(PROJECT_ID, selectedPaper);
        if (!cancelled) {
          setExtraction(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setExtraction({ ...fallbackExtraction, paper_id: selectedPaper });
          setNotice("Paper extraction has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadExtraction();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper]);

  async function handleBuildExtraction() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildPaperExtraction(PROJECT_ID, selectedPaper);
      setExtraction(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build paper extraction.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const extractionEntries = Object.entries(extraction.extraction_map);
  const qualityEntries = Object.entries(extraction.quality_checks);
  const previewItems = [
    {
      label: "Key claims",
      value: extraction.extracted_content_preview.key_claims,
      icon: <FileText className="size-5" />,
    },
    {
      label: "Supporting citations",
      value: extraction.extracted_content_preview.supporting_citations,
      icon: <GitBranch className="size-5" />,
    },
    {
      label: "Tables used",
      value: extraction.extracted_content_preview.tables_used,
      icon: <Table2 className="size-5" />,
    },
    {
      label: "Excluded thesis content",
      value: extraction.extracted_content_preview.excluded_content,
      icon: <Layers3 className="size-5" />,
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <FileSearch className="size-3.5" />
                Journal Workflow
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Paper Extraction
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Extract selected thesis content into a structured journal paper workspace.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuilding}
              onClick={handleBuildExtraction}
            >
              {isBuilding ? "Building Paper Extraction" : "Build Paper Extraction"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {paperOptions.map((paperId) => (
              <button
                className={`rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ${
                  selectedPaper === paperId
                    ? "bg-cyan-300 text-[#07162c] ring-cyan-200"
                    : "bg-white/10 text-cyan-100 ring-white/10"
                }`}
                key={paperId}
                onClick={() => setSelectedPaper(paperId)}
              >
                {paperId}
              </button>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : extraction.extraction_status === "built" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading extraction" : extraction.extraction_status === "built" ? "Extraction ready" : "Extraction preview"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <Card>
          <SectionTitle icon={<BookOpenCheck className="size-5" />} title="Selected Paper Overview" />
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              ["Selected paper", `${extraction.paper_id}: ${extraction.paper_title}`],
              ["Source chapters", extraction.source_chapters.join(", ") || "Not mapped"],
              ["Target", extraction.target_template],
              ["Status", extraction.extraction_status],
            ].map(([label, value]) => (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={label}>
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </div>
                <div className="mt-2 text-[16px] font-semibold leading-6 text-slate-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle icon={<GitBranch className="size-5" />} title="Extraction Map" />
            <div className="space-y-3">
              {extractionEntries.length ? (
                extractionEntries.map(([section, item]) => (
                  <div
                    className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[180px_1fr]"
                    key={section}
                  >
                    <div>
                      <div className="text-[16px] font-semibold text-slate-950">{section}</div>
                      <div className="mt-1 text-[13px] font-semibold text-cyan-700">
                        {"<-"} {item.source}
                      </div>
                    </div>
                    <p className="text-[15px] leading-6 text-slate-600">{item.note}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-[15px] font-medium text-slate-500">
                  Build paper extraction to generate section-source mapping.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<ListChecks className="size-5" />}
              title="Extraction Quality Checks"
            />
            <div className="space-y-3">
              {qualityEntries.length ? (
                qualityEntries.map(([key, check]) => (
                  <div
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={key}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[15px] font-semibold capitalize text-slate-950">
                        {key.replaceAll("_", " ")}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${checkTone(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] leading-6 text-slate-600">{check.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-[15px] font-medium text-slate-500">
                  Quality checks will appear after extraction build.
                </div>
              )}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle
            icon={<SearchCheck className="size-5" />}
            title="Extracted Content Preview"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {previewItems.map((item) => (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  {item.icon}
                </div>
                <div className="text-[16px] font-semibold text-slate-950">{item.label}</div>
                <div className="mt-2 space-y-2">
                  {item.value.length ? (
                    item.value.slice(0, 5).map((value) => (
                      <p className="text-[15px] leading-6 text-slate-600" key={value}>
                        {value}
                      </p>
                    ))
                  ) : (
                    <p className="text-[15px] leading-6 text-slate-400">No preview generated yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <ShieldCheck className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Generate Section Structure</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Convert the extraction map into section headings, argument flow,
                citation boundaries, and table placement for the selected paper.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Generate Section Structure
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
