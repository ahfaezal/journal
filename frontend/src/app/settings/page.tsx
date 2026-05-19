"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  FileArchive,
  FolderCog,
  HardDrive,
  Save,
  Settings,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";

const models = ["Thesis2Journal Balanced", "Strict Reviewer Mode", "Fast Drafting Mode"];
const strictness = ["Moderate", "High", "Very High"];
const continuity = ["Standard", "Detailed", "Reviewer-level"];
const thesisTypes = ["DDR", "Quantitative", "Qualitative", "Mixed Method"];
const outputTypes = ["Journal Article", "Conference Paper", "Multiple Papers"];
const citationStyles = ["APA 7", "IEEE", "MyCite", "Scopus"];
const templates = ["ICC2026", "APA 7", "MyCite", "IEEE", "Scopus"];
const languages = ["English", "Malay", "Bilingual"];
const backupFrequency = ["Every save", "Daily", "Weekly"];
const writingStyles = ["Scholarly concise", "Methodological", "Conference-friendly"];

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

function TextField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[15px] text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white"
        defaultValue={value}
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked = true,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="text-[15px] font-semibold text-slate-700">{label}</span>
      <input className="size-4 accent-cyan-600" defaultChecked={checked} type="checkbox" />
    </label>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <Settings className="size-3.5" />
                System Configuration
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Configure AI behavior, project defaults, storage, and export preferences.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Save Settings
              <Save className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionTitle icon={<Bot className="size-5" />} title="AI Configuration" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Preferred model" options={models} />
              <SelectField label="Reviewer simulator strictness" options={strictness} />
              <SelectField label="Continuity checking level" options={continuity} />
              <ToggleRow label="Citation hallucination guard" />
              <ToggleRow label="Auto-lock stable sections" checked={false} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FolderCog className="size-5" />} title="Project Defaults" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Default thesis type" options={thesisTypes} />
              <SelectField label="Default output type" options={outputTypes} />
              <SelectField label="Default citation style" options={citationStyles} />
              <SelectField label="Default target template" options={templates} />
              <SelectField label="Default language" options={languages} />
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionTitle icon={<HardDrive className="size-5" />} title="Storage & Workspace" />
            <div className="grid gap-4">
              <TextField
                label="Local workspace path"
                value="C:\\projects\\myresearch\\Thesis-to-Journal"
              />
              <TextField
                label="Generated output path"
                value="C:\\projects\\myresearch\\Thesis-to-Journal\\outputs"
              />
              <SelectField label="Backup frequency" options={backupFrequency} />
              <ToggleRow label="Auto-save status" />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<FileArchive className="size-5" />} title="Export Preferences" />
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow label="DOCX" />
              <ToggleRow label="PDF" />
              <ToggleRow label="Markdown" />
              <ToggleRow label="ZIP package" />
              <ToggleRow label="Cover letter enabled" />
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle icon={<UserRound className="size-5" />} title="Account / Profile" />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Author name" value="Dr. Zahirwan" />
            <TextField label="Institution" value="Universiti Islam Selangor" />
            <SelectField label="Writing style preference" options={writingStyles} />
            <TextField label="Preferred journals" value="ICC2026, MyCite journals, Scopus-ready journals" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex flex-col gap-5 rounded-2xl bg-[#07162c] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100">
                <Save className="size-3.5" />
                Bottom CTA
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Save Settings</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-300">
                Save AI behavior, project defaults, storage paths, export preferences,
                and author profile for future thesis-to-journal workspaces.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] transition hover:bg-cyan-300">
              Save Settings
              <ArrowRight className="size-4" />
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
