"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  GitBranch,
  Layers3,
  Loader2,
  Lock,
  PenLine,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  buildSectionStructure,
  generateSection,
  getAppliedRevisions,
  getFullPaper,
  getFullPaperMarkdownDownloadUrl,
  getGeneratedSections,
  getPapers,
  getSectionStructure,
  integrateFullPaper,
  lockSection,
  type AppliedRevision,
  type FullPaper,
  type GeneratedSection,
  type PaperWorkspace,
  type SectionStructure,
  type SectionStructureItem,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const fallbackPaperOptions: PaperWorkspace[] = [
  { paper_id: "PAPER_1", project_id: PROJECT_ID, title: "Need Analysis Paper", paper_type: "Need Analysis", target_journal: "ICC2026", status: "planned", version: "v1", created_at: "", updated_at: "" },
  { paper_id: "PAPER_2", project_id: PROJECT_ID, title: "Development Paper", paper_type: "Development", target_journal: "ICC2026", status: "planned", version: "v1", created_at: "", updated_at: "" },
  { paper_id: "PAPER_3", project_id: PROJECT_ID, title: "Validation Paper", paper_type: "Validation", target_journal: "ICC2026", status: "planned", version: "v1", created_at: "", updated_at: "" },
];

const fallbackStructure: SectionStructure = {
  project_id: PROJECT_ID,
  paper_id: "PAPER_1",
  paper_title: "Need Analysis Paper",
  status: "fallback",
  sections: [],
};

function fallbackStructureForPaper(paperId: string): SectionStructure {
  const option = fallbackPaperOptions.find((paper) => paper.paper_id === paperId.toUpperCase());
  return {
    ...fallbackStructure,
    paper_id: paperId.toUpperCase(),
    paper_title: option?.title ?? "Journal Paper",
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

function statusClass(status: string) {
  if (status === "Ready") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status.includes("Review")) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function actionLabel(status: string) {
  if (status === "Ready") {
    return "Review";
  }
  if (status.includes("Review")) {
    return "Fix";
  }
  return "Generate";
}

function indexGeneratedSections(sections: GeneratedSection[]) {
  return sections.reduce<Record<string, GeneratedSection>>((accumulator, section) => {
    accumulator[section.section_name] = section;
    return accumulator;
  }, {});
}

function generatedStatusLabel(section?: GeneratedSection) {
  if (!section) {
    return "Not Started";
  }

  return section.status === "locked" ? "Locked" : "Drafted";
}

function generatedStatusClass(section?: GeneratedSection) {
  if (section?.status === "locked") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (section?.status === "drafted") {
    return "bg-cyan-100 text-cyan-700";
  }

  return "bg-slate-100 text-slate-600";
}

function generationModeLabel(section?: GeneratedSection) {
  if (!section) {
    return "Not Generated";
  }
  return section.ai_enabled ? "AI Assisted" : "Heuristic";
}

function generationModeClass(section?: GeneratedSection) {
  if (section?.ai_enabled) {
    return "bg-cyan-100 text-cyan-700";
  }
  if (section) {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-slate-50 text-slate-400";
}

export default function SectionWriterPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [paperOptions, setPaperOptions] = useState<PaperWorkspace[]>(fallbackPaperOptions);
  const [structure, setStructure] = useState<SectionStructure>(fallbackStructure);
  const [generatedSections, setGeneratedSections] = useState<Record<string, GeneratedSection>>({});
  const [appliedRevisions, setAppliedRevisions] = useState<AppliedRevision[]>([]);
  const [fullPaper, setFullPaper] = useState<FullPaper | null>(null);
  const [selectedSectionName, setSelectedSectionName] = useState("Findings");
  const [isLoading, setIsLoading] = useState(true);
  const [isBuildingSectionStructure, setIsBuildingSectionStructure] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [activeSectionAction, setActiveSectionAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadSectionStructure(paperId: string) {
    try {
      setIsLoading(true);
      const [structureResult, generatedResult, integratedResult] = await Promise.allSettled([
        getSectionStructure(PROJECT_ID, paperId),
        getGeneratedSections(PROJECT_ID, paperId),
        getFullPaper(PROJECT_ID, paperId),
      ]);
      const appliedResult = await getAppliedRevisions(PROJECT_ID, paperId).catch(() => ({
        applied_revisions: [],
      }));

      const data =
        structureResult.status === "fulfilled"
          ? structureResult.value
          : fallbackStructureForPaper(paperId);
      const generated = generatedResult.status === "fulfilled" ? generatedResult.value : [];
      const integrated = integratedResult.status === "fulfilled" ? integratedResult.value : null;

      setStructure(data);
      setGeneratedSections(indexGeneratedSections(generated));
      setAppliedRevisions(appliedResult.applied_revisions);
      setFullPaper(integrated);
      setSelectedSectionName((current) =>
        data.sections.some((section) => section.section_name === current)
          ? current
          : data.sections[0]?.section_name ?? "Findings",
      );
      setNotice(
        structureResult.status === "fulfilled"
          ? null
          : "No section structure generated yet.",
      );
    } catch (loadError) {
      console.error("Load section structure failed", {
        paperId,
        error: loadError,
      });
      setStructure(fallbackStructureForPaper(paperId));
      setGeneratedSections({});
      setAppliedRevisions([]);
      setFullPaper(null);
      setNotice("No section structure generated yet.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadSectionStructure(selectedPaper.toUpperCase());
    });
  }, [selectedPaper]);

  useEffect(() => {
    let cancelled = false;

    async function loadPapers() {
      const papers = await getPapers(PROJECT_ID).catch(() => fallbackPaperOptions);
      if (!cancelled) {
        setPaperOptions(papers.length ? papers : fallbackPaperOptions);
      }
    }

    loadPapers();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuildSectionStructure() {
    console.log("BUILD BUTTON CLICKED", selectedPaper);
    const selectedPaperId = selectedPaper.toUpperCase();
    try {
      setIsBuildingSectionStructure(true);
      setIsLoading(false);
      setNotice(null);
      await buildSectionStructure("PROJECT_001", selectedPaperId);
      await loadSectionStructure(selectedPaperId);
      setNotice("Section structure built successfully.");
    } catch (buildError) {
      console.error("Build Section Structure failed", {
        endpoint: `POST /journal/${PROJECT_ID}/section-structure/${selectedPaperId}/build`,
        error: buildError,
      });
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build section structure.",
      );
    } finally {
      setIsBuildingSectionStructure(false);
      setIsLoading(false);
    }
  }

  async function handleGenerateSection(sectionName: string) {
    try {
      setActiveSectionAction(sectionName);
      setNotice(null);
      const generated = await generateSection(PROJECT_ID, selectedPaper, sectionName);
      setGeneratedSections((current) => ({
        ...current,
        [sectionName]: generated,
      }));
      setSelectedSectionName(sectionName);
    } catch (generateError) {
      setNotice(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate section.",
      );
    } finally {
      setActiveSectionAction(null);
    }
  }

  async function handleLockSection(sectionName: string) {
    try {
      setActiveSectionAction(sectionName);
      setNotice(null);
      const locked = await lockSection(PROJECT_ID, selectedPaper, sectionName);
      setGeneratedSections((current) => ({
        ...current,
        [sectionName]: locked,
      }));
      setSelectedSectionName(sectionName);
    } catch (lockError) {
      setNotice(
        lockError instanceof Error
          ? lockError.message
          : "Unable to lock section.",
      );
    } finally {
      setActiveSectionAction(null);
    }
  }

  async function handleIntegrateFullPaper() {
    try {
      setIsIntegrating(true);
      setNotice(null);
      const integrated = await integrateFullPaper(PROJECT_ID, selectedPaper);
      setFullPaper(integrated);
    } catch (integrateError) {
      setNotice(
        integrateError instanceof Error
          ? integrateError.message
          : "Unable to integrate full paper.",
      );
    } finally {
      setIsIntegrating(false);
    }
  }

  const selectedSection: SectionStructureItem | undefined =
    structure.sections.find((section) => section.section_name === selectedSectionName) ??
    structure.sections[0];
  const selectedGeneratedSection = selectedSection
    ? generatedSections[selectedSection.section_name]
    : undefined;
  const selectedAppliedRevisions = selectedSection
    ? appliedRevisions.filter(
        (revision) =>
          revision.affected_section.toLowerCase() === selectedSection.section_name.toLowerCase(),
      )
    : [];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <PenLine className="size-3.5" />
                Controlled Writing Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Section Writer
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Generate, review, and lock journal paper sections using controlled thesis context.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuildingSectionStructure}
              onClick={handleBuildSectionStructure}
              type="button"
            >
              {isBuildingSectionStructure ? "Building Section Structure" : "Build Section Structure"}
              {isBuildingSectionStructure ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : structure.status === "built" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading section structure" : structure.status === "built" ? "Structure ready" : "Structure preview"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        {notice ? (
          <div
            className={`rounded-2xl border p-4 text-[15px] font-semibold ${
              notice === "Section structure built successfully."
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {notice}
          </div>
        ) : null}

        <Card>
          <SectionTitle icon={<FileText className="size-5" />} title="Paper Selector" />
          <div className="grid gap-3 md:grid-cols-3">
            {paperOptions.map((paper) => (
              <button
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedPaper === paper.paper_id
                    ? "border-cyan-200 bg-cyan-50 ring-1 ring-cyan-100"
                    : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/50"
                }`}
                key={paper.paper_id}
                onClick={() => setSelectedPaper(paper.paper_id.toUpperCase())}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                      {paper.paper_id}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {selectedPaper === paper.paper_id ? structure.paper_title : paper.title}
                    </div>
                  </div>
                  {selectedPaper === paper.paper_id ? <CheckCircle2 className="size-5 text-cyan-700" /> : null}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {structure.sections.length ? (
            structure.sections.map((section) => (
              <Card className="p-4" key={section.section_name}>
                <button
                  className="w-full text-left"
                  onClick={() => setSelectedSectionName(section.section_name)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{section.section_name}</h2>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${generatedStatusClass(
                          generatedSections[section.section_name],
                        )}`}
                      >
                        {generatedStatusLabel(generatedSections[section.section_name])}
                      </span>
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                      {generatedSections[section.section_name]?.status === "locked" ? (
                        <Lock className="size-4" />
                      ) : (
                        <FileCheck2 className="size-4" />
                      )}
                    </div>
                  </div>
                </button>
                <div className="mt-4 space-y-2">
                  {[
                    ["Source context", section.source_chapters.join(", ") || "Full paper"],
                    ["Citation readiness", section.required_citations.length ? "Ready" : "Review"],
                    ["Word count", String(generatedSections[section.section_name]?.word_count ?? section.estimated_word_count)],
                  ].map(([label, value]) => (
                    <div className="rounded-xl bg-slate-50 px-3 py-2" key={label}>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        {label}
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-slate-700">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-3 text-[14px] font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    disabled={activeSectionAction === section.section_name}
                    onClick={() => handleGenerateSection(section.section_name)}
                  >
                    {activeSectionAction === section.section_name ? "Working" : generatedSections[section.section_name] ? "Review" : actionLabel(section.readiness_status)}
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 text-[14px] font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    disabled={!generatedSections[section.section_name] || generatedSections[section.section_name]?.status === "locked" || activeSectionAction === section.section_name}
                    onClick={() => handleLockSection(section.section_name)}
                  >
                    Lock
                    <Lock className="size-3.5" />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="xl:col-span-4">
              <div className="py-8 text-center text-[15px] font-medium text-slate-500">
                No section structure generated yet. Build section structure after paper extraction is ready.
              </div>
            </Card>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <SectionTitle icon={<Layers3 className="size-5" />} title="Selected Section Detail" />
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              {selectedSection ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                        SELECTED SECTION
                      </div>
                      <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                        {selectedSection.section_name}
                      </h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${statusClass(selectedSection.readiness_status)}`}>
                      {selectedSection.readiness_status}
                    </span>
                  </div>

                  <p className="mt-4 rounded-xl bg-white p-4 text-[15px] leading-6 text-slate-600">
                    {selectedSection.purpose}
                  </p>

                  {selectedGeneratedSection ? (
                    <div className="mt-4 rounded-xl border border-cyan-100 bg-white p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-semibold tracking-[0.16em] text-cyan-700">
                            GENERATED DRAFT
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {selectedGeneratedSection.title}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${generatedStatusClass(selectedGeneratedSection)}`}>
                          {generatedStatusLabel(selectedGeneratedSection)} - {selectedGeneratedSection.version}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${generationModeClass(selectedGeneratedSection)}`}>
                          {generationModeLabel(selectedGeneratedSection)}
                        </span>
                      </div>
                      <div className="whitespace-pre-line text-[15px] leading-7 text-slate-700">
                        {selectedGeneratedSection.generated_text}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-5 text-[15px] font-medium text-slate-500">
                      Generate this section to preview controlled draft text.
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                        <PenLine className="size-4 text-cyan-700" />
                        Suggested subheadings
                      </div>
                      <div className="space-y-2">
                        {selectedSection.suggested_subheadings.map((item) => (
                          <div className="rounded-xl bg-white p-3 text-[15px] leading-6 text-slate-600" key={item}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                          <GitBranch className="size-4 text-cyan-700" />
                          Thesis sources used
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[...selectedSection.source_chapters, ...selectedSection.source_tables].map((item) => (
                            <span
                              className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700"
                              key={item}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                          <ShieldCheck className="size-4 text-cyan-700" />
                          Citations used
                        </div>
                        <div className="rounded-xl bg-white p-4 text-[15px] leading-6 text-slate-600">
                          {(selectedGeneratedSection?.citations_used.length
                            ? selectedGeneratedSection.citations_used
                            : selectedSection.required_citations
                          ).length
                            ? (selectedGeneratedSection?.citations_used.length
                                ? selectedGeneratedSection.citations_used
                                : selectedSection.required_citations
                              ).join(", ")
                            : "Citation review required or not essential for this section."}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                          <FileCheck2 className="size-4 text-cyan-700" />
                          Draft metadata
                        </div>
                        <div className="grid gap-2 rounded-xl bg-white p-4 text-[14px] leading-6 text-slate-600">
                          <div>Status: {selectedGeneratedSection?.status ?? "not generated"}</div>
                          <div>Generation: {generationModeLabel(selectedGeneratedSection)}</div>
                          <div>AI model: {selectedGeneratedSection?.ai_model || "none"}</div>
                          <div>Version: {selectedGeneratedSection?.version ?? "none"}</div>
                          <div>Word count: {selectedGeneratedSection?.word_count ?? 0}</div>
                          <div>Generated at: {selectedGeneratedSection?.generated_at ?? "not generated"}</div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                          <SearchCheck className="size-4 text-cyan-700" />
                          Writing notes
                        </div>
                        <div className="space-y-2">
                          {selectedSection.writing_notes.map((note) => (
                            <div className="flex gap-2 rounded-xl bg-white p-3 text-[15px] text-slate-600" key={note}>
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                              <span>{note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-[15px] font-medium text-slate-500">
                  Select a section after structure generation.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Lock className="size-5" />} title="Lock Version" />
            <div className="space-y-3">
              {[
                ["Current version", selectedGeneratedSection?.version ?? `${selectedSection?.section_name ?? "Section"}_STRUCTURE_v1`],
                ["Last edited", selectedGeneratedSection?.generated_at ?? "Generated structure stage"],
                ["Approval status", selectedGeneratedSection?.status === "locked" ? "Locked" : selectedSection?.audit_warnings.length ? "Needs review" : "Ready for draft"],
              ].map(([label, value]) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={label}>
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 text-[16px] font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-[15px] font-semibold text-slate-950">Audit warnings</div>
              <div className="mt-2 space-y-2 text-[14px] leading-6 text-slate-600">
                {(selectedGeneratedSection?.audit_warnings.length
                  ? selectedGeneratedSection.audit_warnings
                  : selectedSection?.audit_warnings ?? []
                ).length
                  ? (selectedGeneratedSection?.audit_warnings.length
                      ? selectedGeneratedSection.audit_warnings
                      : selectedSection?.audit_warnings ?? []
                    ).map((warning) => <div key={warning}>{warning}</div>)
                  : <div>No section-level audit warning.</div>}
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <div className="text-[15px] font-semibold text-slate-950">Version timeline</div>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-white px-3 py-2 text-[14px] leading-6 text-slate-700">
                  Current active version: {selectedGeneratedSection?.version ?? "none"}
                </div>
                {selectedAppliedRevisions.length ? (
                  selectedAppliedRevisions.map((revision) => (
                    <div className="rounded-lg bg-white px-3 py-2 text-[14px] leading-6 text-slate-700" key={revision.revision_id}>
                      {revision.revision_id}: {revision.before_version} {"->"} {revision.revised_version} by {revision.applied_by}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-white px-3 py-2 text-[14px] leading-6 text-slate-500">
                    No applied revision yet for this section.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                disabled={!selectedSection || activeSectionAction === selectedSection.section_name}
                onClick={() => selectedSection && handleGenerateSection(selectedSection.section_name)}
              >
                Generate
                <PenLine className="size-4" />
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                disabled={!selectedSection || !selectedGeneratedSection || selectedGeneratedSection.status === "locked" || activeSectionAction === selectedSection.section_name}
                onClick={() => selectedSection && handleLockSection(selectedSection.section_name)}
              >
                Lock
                <Lock className="size-4" />
              </button>
            </div>
          </Card>
        </section>

        <Card className="bg-white">
          <div className="rounded-2xl bg-[#07162c] p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <FileText className="size-3.5" />
                  Bottom CTA
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Integrate Full Paper</h2>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                  Combine locked sections into one cohesive paper with citation,
                  transition, and formatting checks.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isIntegrating}
                  onClick={handleIntegrateFullPaper}
                >
                  {isIntegrating ? "Integrating Full Paper" : "Integrate Full Paper"}
                  {isIntegrating ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                </button>
                {fullPaper ? (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-50"
                    onClick={() => window.open(getFullPaperMarkdownDownloadUrl(PROJECT_ID, selectedPaper), "_blank")}
                  >
                    Download Markdown
                    <ArrowRight className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
            {fullPaper ? (
              <div className="mt-6 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Status", fullPaper.status],
                    ["Included", String(fullPaper.sections_included.length)],
                    ["Locked", String(fullPaper.locked_sections_count)],
                    ["Missing", String(fullPaper.missing_sections.length)],
                    ["Words", String(fullPaper.total_word_count)],
                    ["Citations", String(fullPaper.citation_count)],
                  ].map(([label, value]) => (
                    <div className="rounded-xl bg-white/10 p-3" key={label}>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                        {label}
                      </div>
                      <div className="mt-1 text-[16px] font-semibold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                    Integrated Paper Preview
                  </div>
                  <div className="mt-2 max-h-56 overflow-auto whitespace-pre-line text-[14px] leading-6 text-slate-200">
                    {fullPaper.integrated_text.slice(0, 1800)}
                    {fullPaper.integrated_text.length > 1800 ? "\n\n[Preview truncated]" : ""}
                  </div>
                </div>
                <div className="lg:col-span-2 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-4">
                    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                      Sections Included
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fullPaper.sections_included.map((section) => (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white" key={section.section_name}>
                          {section.section_name} - {section.status}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                      Integration Warnings
                    </div>
                    <div className="mt-2 space-y-1 text-[14px] leading-6 text-slate-200">
                      {[...fullPaper.integration_warnings, ...fullPaper.continuity_notes].map((warning) => (
                        <div key={warning}>{warning}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
