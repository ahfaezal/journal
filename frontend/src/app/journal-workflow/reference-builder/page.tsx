"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Library,
  ListChecks,
  Loader2,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import {
  buildReferences,
  getReferences,
  type ReferenceBank,
  type ReferenceBankReference,
} from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";
const paperOptions = [
  { id: "PAPER_1", title: "Need Analysis Paper" },
  { id: "PAPER_2", title: "Development & Validation Paper" },
  { id: "PAPER_3", title: "Framework / Model Paper" },
];

const fallbackReferenceBank: ReferenceBank = {
  paper_id: "PAPER_1",
  title: "Need Analysis Paper",
  total_in_text_citations: 0,
  matched_references: 0,
  unmatched_references: 0,
  duplicate_references: 0,
  apa_issues: 0,
  references: [],
  citation_guard: {
    fake_citation_risk: "Unknown",
    unsupported_claim_risk: "Unknown",
    mfl_dependency: "Not checked",
    notes: ["Build reference list after citation map and full paper are available."],
  },
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
  if (status === "matched") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "review_required") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function riskTone(value: string) {
  if (value === "Low" || value === "Enabled") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value === "Medium" || value === "Review required") {
    return "bg-amber-100 text-amber-700";
  }
  if (value === "High") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function ReferenceBuilderPage() {
  const [selectedPaper, setSelectedPaper] = useState("PAPER_1");
  const [referenceBank, setReferenceBank] = useState<ReferenceBank>(fallbackReferenceBank);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReferences() {
      try {
        setIsLoading(true);
        const data = await getReferences(PROJECT_ID, selectedPaper);
        if (!cancelled) {
          setReferenceBank(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setReferenceBank({ ...fallbackReferenceBank, paper_id: selectedPaper });
          setNotice("Reference bank has not been built yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReferences();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper]);

  async function handleBuildReferences() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildReferences(PROJECT_ID, selectedPaper);
      setReferenceBank(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build reference bank.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const summaryCards = [
    {
      label: "Total In-text Citations",
      value: referenceBank.total_in_text_citations,
      tone: "text-cyan-700",
    },
    {
      label: "Matched with MFL",
      value: referenceBank.matched_references,
      tone: "text-emerald-700",
    },
    {
      label: "Unmatched Citations",
      value: referenceBank.unmatched_references,
      tone: "text-amber-700",
    },
    {
      label: "Duplicate References",
      value: referenceBank.duplicate_references,
      tone: "text-violet-700",
    },
    {
      label: "APA Issues",
      value: referenceBank.apa_issues,
      tone: "text-rose-700",
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <ScrollText className="size-3.5" />
                Citation Governance
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Reference Builder
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Build verified reference lists from thesis citations and Master File List.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuilding}
              onClick={handleBuildReferences}
            >
              {isBuilding ? "Building Reference List" : "Build Reference List"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : referenceBank.references.length ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading references" : referenceBank.references.length ? "Reference bank ready" : "Waiting for build"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <Card>
          <SectionTitle icon={<ScrollText className="size-5" />} title="Paper Selector" />
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
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {selectedPaper === paper.id ? referenceBank.title : paper.title}
                    </div>
                  </div>
                  {selectedPaper === paper.id ? <CheckCircle2 className="size-5 text-cyan-700" /> : null}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className={`text-3xl font-bold ${card.tone}`}>{card.value}</div>
              <div className="mt-2 text-[15px] font-semibold leading-6 text-slate-700">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <Card>
          <SectionTitle icon={<GitBranch className="size-5" />} title="Citation Matching Table" />
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1fr_0.9fr_0.8fr_1.8fr_0.9fr_0.7fr] bg-slate-50 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <div>Citation</div>
                <div>Source Section</div>
                <div>MFL Status</div>
                <div>Reference Entry</div>
                <div>Issue</div>
                <div>Action</div>
              </div>
              {referenceBank.references.length ? (
                referenceBank.references.map((row: ReferenceBankReference) => (
                  <div
                    className="grid grid-cols-[1fr_0.9fr_0.8fr_1.8fr_0.9fr_0.7fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                    key={`${row.citation_text}-${row.source_section}`}
                  >
                    <div className="font-semibold text-slate-950">{row.citation_text}</div>
                    <div>{row.source_section}</div>
                    <div>
                      <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusTone(row.mfl_status)}`}>
                        {row.mfl_status}
                      </span>
                    </div>
                    <div>{row.apa_reference}</div>
                    <div>{row.issue}</div>
                    <button className="text-left text-[14px] font-semibold text-cyan-700">
                      {row.issue === "None" ? "Verify" : "Resolve"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="border-t border-slate-100 px-4 py-8 text-center text-[15px] font-medium text-slate-500">
                  No citation mapping available yet. Build citation map, integrate full paper, then build references.
                </div>
              )}
            </div>
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionTitle icon={<Library className="size-5" />} title="APA Reference Bank" />
            <div className="space-y-3">
              {referenceBank.references.length ? (
                referenceBank.references.map((reference) => (
                  <div
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[15px] leading-7 text-slate-700"
                    key={`${reference.citation_text}-${reference.apa_reference}`}
                  >
                    {reference.apa_reference}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-[15px] font-medium text-slate-500">
                  APA reference bank will appear after backend reference generation.
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card>
              <SectionTitle icon={<ListChecks className="size-5" />} title="APA Audit Panel" />
              <div className="space-y-3">
                {[
                  ["Unmatched citations", referenceBank.unmatched_references],
                  ["Duplicate references", referenceBank.duplicate_references],
                  ["APA issues", referenceBank.apa_issues],
                ].map(([label, value]) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={label}
                  >
                    <span className="text-[15px] font-semibold text-slate-700">{label}</span>
                    <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-950">
                      {value}
                      <AlertTriangle className="size-4 text-amber-600" />
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<ShieldCheck className="size-5" />} title="Citation Guard Panel" />
              <div className="space-y-3">
                {[
                  ["Fake citation risk", referenceBank.citation_guard.fake_citation_risk],
                  ["Unsupported claim risk", referenceBank.citation_guard.unsupported_claim_risk],
                  ["MFL dependency", referenceBank.citation_guard.mfl_dependency],
                ].map(([label, value]) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={label}
                  >
                    <span className="text-[15px] font-semibold text-slate-700">{label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${riskTone(value)}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {referenceBank.citation_guard.notes.map((note) => (
                  <div className="rounded-xl bg-cyan-50 p-3 text-[14px] leading-6 text-slate-700" key={note}>
                    {note}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <CheckCircle2 className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Build Final Reference List</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Generate a verified APA reference list from matched in-text citations,
                MFL entries, and resolved audit issues.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuilding}
              onClick={handleBuildReferences}
            >
              {isBuilding ? "Building Final Reference List" : "Build Final Reference List"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
