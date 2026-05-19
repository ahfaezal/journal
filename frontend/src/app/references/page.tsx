"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  GitBranch,
  Library,
  ListChecks,
  UploadCloud,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const summary = [
  { label: "Total MFL Records", value: "218" },
  { label: "Valid References", value: "205" },
  { label: "Missing Metadata", value: "09" },
  { label: "Duplicate Entries", value: "04" },
  { label: "DOI Available", value: "126" },
];

const mflRows = [
  {
    author: "Embong et al.",
    year: "2018",
    title: "Academic da'wah practice in higher education",
    type: "Journal",
    doi: "https://doi.org/mock-001",
    status: "Valid",
    action: "Open",
  },
  {
    author: "Bhuttah et al.",
    year: "2019",
    title: "Curriculum development stages and alignment",
    type: "Journal",
    doi: "Missing",
    status: "Review",
    action: "Fix",
  },
  {
    author: "Sidek & Jamaludin",
    year: "2005",
    title: "Pembinaan modul latihan dan modul akademik",
    type: "Book",
    doi: "Publisher record",
    status: "Valid",
    action: "Open",
  },
  {
    author: "Mohamad & Ali",
    year: "2021",
    title: "Module development alignment",
    type: "Conference",
    doi: "Duplicate URL",
    status: "Duplicate",
    action: "Merge",
  },
];

const matchingPreview = [
  ["In-text citation", "Bhuttah et al. (2019)"],
  ["MFL entry", "Bhuttah, T. M., Xiaoduan, C., Ullah, H., & Javed, S. (2019)."],
  ["Match confidence", "92%"],
  ["Citation status", "Matched with metadata warning"],
];

const auditItems = [
  { label: "Duplicate author-year", value: "4", tone: "bg-amber-100 text-amber-700" },
  { label: "Incomplete journal title", value: "3", tone: "bg-rose-100 text-rose-700" },
  { label: "Missing publisher", value: "2", tone: "bg-violet-100 text-violet-700" },
  { label: "Invalid DOI", value: "1", tone: "bg-cyan-100 text-cyan-700" },
  { label: "Unmatched citation risk", value: "Low", tone: "bg-emerald-100 text-emerald-700" },
];

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

export default function ReferencesPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Library className="size-3.5" />
                Reference Governance
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                MFL / References
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Manage Master File List, citation sources, and verified reference bank.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Import MFL
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle icon={<UploadCloud className="size-5" />} title="MFL Upload Panel" />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-cyan-300 hover:bg-cyan-50/50">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                <FileSpreadsheet className="size-6" />
              </div>
              <div className="mt-4 text-lg font-semibold text-slate-950">Upload MFL.xlsx</div>
              <div className="mt-1 text-[14px] text-slate-500">Supported format XLSX, CSV</div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Detected records", "218"],
                ["Last updated", "Today, 5:40 PM"],
                ["Validation status", "Ready"],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-slate-50 p-3" key={label}>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-700">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Database className="size-5" />} title="Reference Source Summary" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {summary.map((item) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
                  <div className="text-2xl font-bold text-slate-950">{item.value}</div>
                  <div className="mt-2 text-[13px] font-semibold leading-5 text-slate-600">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<FileSpreadsheet className="size-5" />} title="MFL Table" />
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[0.9fr_0.45fr_1.8fr_0.75fr_1.1fr_0.7fr_0.55fr] bg-slate-50 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <div>Author</div>
                <div>Year</div>
                <div>Title</div>
                <div>Source Type</div>
                <div>DOI / URL</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {mflRows.map((row) => (
                <div
                  className="grid grid-cols-[0.9fr_0.45fr_1.8fr_0.75fr_1.1fr_0.7fr_0.55fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                  key={`${row.author}-${row.year}`}
                >
                  <div className="font-semibold text-slate-950">{row.author}</div>
                  <div>{row.year}</div>
                  <div>{row.title}</div>
                  <div>{row.type}</div>
                  <div>{row.doi}</div>
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        row.status === "Valid"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "Duplicate"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <button className="text-left text-[14px] font-semibold text-cyan-700">
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card>
            <SectionTitle icon={<GitBranch className="size-5" />} title="Citation Matching Preview" />
            <div className="space-y-3">
              {matchingPreview.map(([label, value]) => (
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
            <SectionTitle icon={<ListChecks className="size-5" />} title="MFL Audit Panel" />
            <div className="space-y-3">
              {auditItems.map((item) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                  key={item.label}
                >
                  <span className="text-[15px] font-semibold text-slate-700">{item.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${item.tone}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <CheckCircle2 className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Validate MFL & Build Reference Bank</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Validate MFL metadata, resolve duplicate entries, and prepare a
                verified reference bank for citation-safe journal writing.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Validate MFL & Build Reference Bank
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
