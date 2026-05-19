"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderPlus,
  Layers3,
  ListChecks,
  Settings2,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const researchTypes = ["DDR", "Quantitative", "Qualitative", "Mixed Method"];
const targetOutputs = ["Journal Article", "Conference Paper", "Multiple Papers"];
const targetTemplates = ["ICC2026", "APA 7", "MyCite", "IEEE", "Scopus"];
const chapters = ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"];
const workflowOptions = [
  "Build Citation Map",
  "Build Objective Map",
  "Build Table Map",
  "Run Thesis Audit",
  "Enable Reviewer Simulator",
];
const checklist = [
  "Project metadata prepared",
  "Research type selected",
  "Target output selected",
  "Template selected",
  "Thesis structure defined",
  "AI workflow configured",
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

function Field({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white"
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold text-slate-700">{label}</span>
      <select className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[15px] text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function NewProjectPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <FolderPlus className="size-3.5" />
                Workspace Intake
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Create New Project
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Set up a new thesis-to-journal workspace.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Save Draft
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <SectionTitle icon={<FileText className="size-5" />} title="Project Setup Form" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Project name" placeholder="e.g. Dakwah Content Selection Module" />
                <Field label="Thesis title" placeholder="Enter full thesis title" />
                <SelectField label="Research type" options={researchTypes} />
                <SelectField label="Target output" options={targetOutputs} />
                <SelectField label="Target template" options={targetTemplates} />
                <Field label="Primary author" placeholder="Dr. Zahirwan" />
                <Field label="Institution" placeholder="Universiti Islam Selangor" />
                <label className="block md:col-span-2">
                  <span className="text-[14px] font-semibold text-slate-700">Notes</span>
                  <textarea
                    className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white"
                    placeholder="Add project scope notes, target paper plan, or submission reminders."
                  />
                </label>
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<Layers3 className="size-5" />} title="Thesis Structure Setup" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {chapters.map((chapter) => (
                  <label
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={chapter}
                  >
                    <span className="text-[15px] font-semibold text-slate-700">{chapter}</span>
                    <input className="size-4 accent-cyan-600" defaultChecked type="checkbox" />
                  </label>
                ))}
                <label className="flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                  <span className="text-[15px] font-semibold text-cyan-800">MFL required</span>
                  <input className="size-4 accent-cyan-600" defaultChecked type="checkbox" />
                </label>
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<Settings2 className="size-5" />} title="AI Workflow Configuration" />
              <div className="grid gap-3 md:grid-cols-2">
                {workflowOptions.map((option) => (
                  <label
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
                    key={option}
                  >
                    <span className="text-[15px] font-semibold text-slate-700">{option}</span>
                    <input className="size-4 accent-cyan-600" defaultChecked type="checkbox" />
                  </label>
                ))}
              </div>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <SectionTitle icon={<ListChecks className="size-5" />} title="Project Creation Checklist" />
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <div
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                    key={item}
                  >
                    <CheckCircle2
                      className={`mt-0.5 size-4 shrink-0 ${
                        index < 4 ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    <span className="text-[15px] font-medium leading-6 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white">
              <div className="rounded-2xl bg-[#07162c] p-5 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                  <Sparkles className="size-3.5" />
                  Setup guidance
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Project intelligence starts here</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-300">
                  These settings decide which thesis maps, audits, and writing workflows
                  are prepared for the new workspace.
                </p>
              </div>
            </Card>
          </aside>
        </section>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <FolderPlus className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Create Project Workspace</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Initialize the project shell with upload slots, MFL governance,
                intelligence maps, journal workflow, and reviewer simulation.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Create Project Workspace
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
