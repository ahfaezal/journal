"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Lock,
  UploadCloud,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  FALLBACK_PROJECT_ID,
  getInitialActiveProjectId,
  getInitialActiveProjectTitle,
  persistActiveProject,
  withProjectQuery,
} from "@/src/lib/active-project";
import {
  buildThesisIntelligence,
  getParsedThesis,
  getProject,
  getUploadedFiles,
  parseThesis,
  type ParsedThesis,
  uploadThesisFile,
  type UploadedThesisFile,
} from "@/src/lib/api";

const uploadItems = [
  {
    title: "Bab 1",
    subtitle: "Introduction",
    fileType: "thesis_chapter",
    chapterLabel: "Bab 1",
    status: "Required",
    size: "No file selected",
    icon: <FileText className="size-5" />,
    required: true,
  },
  {
    title: "Bab 2",
    subtitle: "Literature Review",
    fileType: "thesis_chapter",
    chapterLabel: "Bab 2",
    status: "Required",
    size: "No file selected",
    icon: <FileText className="size-5" />,
    required: true,
  },
  {
    title: "Bab 3",
    subtitle: "Methodology",
    fileType: "thesis_chapter",
    chapterLabel: "Bab 3",
    status: "Required",
    size: "No file selected",
    icon: <FileText className="size-5" />,
    required: true,
  },
  {
    title: "Bab 4",
    subtitle: "Findings",
    fileType: "thesis_chapter",
    chapterLabel: "Bab 4",
    status: "Required",
    size: "No file selected",
    icon: <FileText className="size-5" />,
    required: true,
  },
  {
    title: "Bab 5",
    subtitle: "Discussion & Conclusion",
    fileType: "thesis_chapter",
    chapterLabel: "Bab 5",
    status: "Required",
    size: "No file selected",
    icon: <FileText className="size-5" />,
    required: true,
  },
  {
    title: "MFL / Master File List",
    subtitle: "Reference governance source",
    fileType: "mfl",
    chapterLabel: "MFL",
    status: "Required",
    size: "No file selected",
    icon: <FileSpreadsheet className="size-5" />,
    required: true,
  },
  {
    title: "Journal Template",
    subtitle: "Conference or journal formatting rules",
    fileType: "journal_template",
    chapterLabel: "Journal Template",
    status: "Optional",
    size: "No file selected",
    icon: <FileCheck2 className="size-5" />,
    required: false,
  },
  {
    title: "Supporting Documents",
    subtitle: "Tables, appendices, notes, or audit files",
    fileType: "supporting_document",
    chapterLabel: "Supporting Documents",
    status: "Optional",
    size: "No file selected",
    icon: <FileArchive className="size-5" />,
    required: false,
  },
];

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function StatusBadge({ label, required }: { label: string; required: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        required
          ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

export default function UploadThesisPage() {
  const router = useRouter();
  const [activeProjectId] = useState(getInitialActiveProjectId);
  const [activeProjectTitle, setActiveProjectTitle] = useState(getInitialActiveProjectTitle);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedThesisFile[]>([]);
  const [parsedThesis, setParsedThesis] = useState<ParsedThesis | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isParsingThesis, setIsParsingThesis] = useState(false);
  const [isBuildingIntelligence, setIsBuildingIntelligence] = useState(false);
  const [intelligenceBuilt, setIntelligenceBuilt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  useEffect(() => {
    persistActiveProject(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    const projectId = activeProjectId;
    let cancelled = false;

    async function loadProjectLabel() {
      try {
        const project = await getProject(projectId);
        const title = project.title || project.name || "";

        if (!cancelled) {
          setActiveProjectTitle(title);
          if (title) {
            persistActiveProject(activeProjectId, title);
          }
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

  async function refreshUploadedFiles() {
    if (!activeProjectId) {
      return;
    }

    try {
      setError(null);
      const files = await getUploadedFiles(activeProjectId);
      setUploadedFiles(files);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load uploaded files.",
      );
    } finally {
      setIsLoadingFiles(false);
    }
  }

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    let cancelled = false;

    async function loadUploadedFiles() {
      try {
        setIsLoadingFiles(true);
        setError(null);
        const files = await getUploadedFiles(activeProjectId);
        let parsed: ParsedThesis | null = null;

        try {
          parsed = await getParsedThesis(activeProjectId);
        } catch {
          parsed = null;
        }

        if (!cancelled) {
          setUploadedFiles(files);
          setParsedThesis(parsed);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load uploaded files.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFiles(false);
        }
      }
    }

    loadUploadedFiles();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const uploadedByChapter = useMemo(() => {
    return uploadedFiles.reduce<Record<string, UploadedThesisFile>>((accumulator, file) => {
      accumulator[file.chapter_label] = file;
      return accumulator;
    }, {});
  }, [uploadedFiles]);

  const requiredUploaded = useMemo(() => {
    const requiredLabels = uploadItems
      .filter((item) => item.required)
      .map((item) => item.chapterLabel);

    return requiredLabels.every((label) => uploadedByChapter[label]);
  }, [uploadedByChapter]);

  const parsingComplete = Boolean(parsedThesis);
  const parserMetrics = [
    { label: "Chapters detected", value: parsedThesis?.chapters.length ?? 0 },
    { label: "Tables detected", value: parsedThesis?.tables.length ?? 0 },
    { label: "Citations detected", value: parsedThesis?.citations.length ?? 0 },
    { label: "Objectives detected", value: parsedThesis?.objectives.length ?? 0 },
  ];

  const checklist = [
    {
      label: "Thesis chapters uploaded",
      done: ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"].every(
        (label) => uploadedByChapter[label],
      ),
    },
    { label: "MFL uploaded", done: Boolean(uploadedByChapter.MFL) },
    { label: "Thesis parsed", done: parsingComplete },
    { label: "Journal target selected", done: true },
    { label: "Intelligence build ready", done: requiredUploaded && parsingComplete },
  ];

  function selectFile(itemKey: string, file: File | undefined) {
    if (!file) {
      return;
    }

    setSelectedFiles((current) => ({
      ...current,
      [itemKey]: file,
    }));
  }

  async function uploadSelectedFile(item: (typeof uploadItems)[number]) {
    const file = selectedFiles[item.chapterLabel];
    if (!file) {
      setError(`Please select a file for ${item.title} first.`);
      return;
    }

    try {
      setUploadingKey(item.chapterLabel);
      setError(null);
      await uploadThesisFile(activeProjectId || FALLBACK_PROJECT_ID, file, item.fileType, item.chapterLabel);
      setParsedThesis(null);
      setIntelligenceBuilt(false);
      setSelectedFiles((current) => {
        const next = { ...current };
        delete next[item.chapterLabel];
        return next;
      });
      await refreshUploadedFiles();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload selected file.",
      );
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleParseThesis() {
    try {
      setIsParsingThesis(true);
      setError(null);
      const parsed = await parseThesis(activeProjectId || FALLBACK_PROJECT_ID);
      setParsedThesis(parsed);
      setIntelligenceBuilt(false);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Unable to parse thesis files.",
      );
    } finally {
      setIsParsingThesis(false);
    }
  }

  async function handleBuildIntelligence() {
    try {
      setIsBuildingIntelligence(true);
      setError(null);
      await buildThesisIntelligence(activeProjectId || FALLBACK_PROJECT_ID);
      setIntelligenceBuilt(true);
      router.push(withProjectQuery("/thesis-intelligence", activeProjectId));
    } catch (buildError) {
      setError(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build thesis intelligence.",
      );
    } finally {
      setIsBuildingIntelligence(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <UploadCloud className="size-3.5" />
                Project Intake
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Upload Thesis
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                Upload Bab 1-5, MFL, journal template, and supporting documents.
              </p>
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-cyan-200/20">
                <span className="size-2 rounded-full bg-cyan-300" />
                <span className="truncate">
                  Active Project: {activeProjectId || FALLBACK_PROJECT_ID}
                  {activeProjectTitle ? ` - ${activeProjectTitle}` : ""}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <div className="text-sm font-medium text-cyan-100">Supported formats</div>
              <div className="mt-1 text-[15px] font-semibold text-white">
                PDF, DOCX, XLSX, MD
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
                <span
                  className={`size-2 rounded-full ${
                    error ? "bg-amber-300" : isLoadingFiles ? "bg-cyan-300" : "bg-emerald-300"
                  }`}
                />
                {error ? "Upload API fallback notice" : isLoadingFiles ? "Loading uploaded files" : "Upload API ready"}
              </span>
              {error ? (
                <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                  {error}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {uploadItems.map((item) => (
              <Card className="p-4" key={item.title}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {item.title}
                      </h2>
                      <p className="mt-0.5 truncate text-[15px] text-slate-500">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    label={uploadedByChapter[item.chapterLabel] ? "Uploaded" : item.status}
                    required={item.required}
                  />
                </div>

                <label
                  className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-cyan-300 hover:bg-cyan-50/50"
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    selectFile(item.chapterLabel, event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    className="sr-only"
                    onChange={(event) => {
                      selectFile(item.chapterLabel, event.target.files?.[0]);
                    }}
                    type="file"
                  />
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                    <UploadCloud className="size-5" />
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-slate-900">
                    {selectedFiles[item.chapterLabel]?.name ||
                      uploadedByChapter[item.chapterLabel]?.filename ||
                      "Drag and drop file here"}
                  </div>
                  <div className="mt-1 text-[13px] text-slate-500">
                    PDF, DOCX, XLSX, MD
                  </div>
                </label>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-slate-400">File size</div>
                    <div className="text-[15px] font-semibold text-slate-700">
                      {selectedFiles[item.chapterLabel]
                        ? formatBytes(selectedFiles[item.chapterLabel].size)
                        : uploadedByChapter[item.chapterLabel]
                          ? formatBytes(uploadedByChapter[item.chapterLabel].size)
                          : item.size}
                    </div>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[14px] font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    disabled={!selectedFiles[item.chapterLabel] || uploadingKey === item.chapterLabel}
                    onClick={() => {
                      uploadSelectedFile(item);
                    }}
                  >
                    {uploadingKey === item.chapterLabel ? "Uploading" : "Upload"}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <CheckCircle2 className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Project Intake Checklist
                </h2>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                    key={item.label}
                  >
                    <span className="text-[15px] font-medium text-slate-700">
                      {item.label}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Clock3 className="size-4 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Parser Status
                  </h2>
                  <p className="text-[13px] font-medium text-slate-500">
                    {parsingComplete ? "Parsed thesis JSON ready" : "Waiting for thesis parsing"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {parserMetrics.map((metric) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                    key={metric.label}
                  >
                    <span className="text-[14px] font-medium text-slate-600">
                      {metric.label}
                    </span>
                    <span className="text-lg font-bold text-slate-950">
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/70">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Upload requirement
                  </h2>
                  <p className="mt-2 text-[15px] leading-6 text-slate-600">
                    Bab 1-5 and MFL are required before Thesis Intelligence can
                    build citation, table, objective, and audit maps.
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                NEXT STEP
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Build Thesis Intelligence
              </h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-600">
                Generate Citation Map, Table Map, Objective Map, Thesis Audit,
                and Knowledge Graph after the required project files are uploaded
                and parsed.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-5 text-[15px] font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                disabled={!requiredUploaded || isParsingThesis}
                onClick={handleParseThesis}
              >
                {isParsingThesis ? "Parsing Thesis" : parsingComplete ? "Parse Thesis Again" : "Parse Thesis"}
                <ArrowRight className="size-4" />
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                disabled={!requiredUploaded || !parsingComplete || isBuildingIntelligence}
                onClick={handleBuildIntelligence}
              >
                {isBuildingIntelligence ? "Building Intelligence" : "Build Thesis Intelligence"}
                <ArrowRight className="size-4" />
              </button>
              {intelligenceBuilt ? (
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 text-[14px] font-semibold text-cyan-700 transition hover:bg-cyan-100"
                  href={withProjectQuery("/thesis-intelligence", activeProjectId)}
                >
                  Open Thesis Intelligence
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
