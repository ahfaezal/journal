"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import { AppShell } from "@/src/components/layouts/AppShell";
import { buildTableMap, getTableMap, type TableMap } from "@/src/lib/api";

const PROJECT_ID = "PROJECT_001";

const fallbackTableMap: TableMap = {
  project_id: PROJECT_ID,
  status: "fallback",
  total_tables: 0,
  mapped_tables: 0,
  unmapped_tables: 0,
  findings_tables: 0,
  tables: [],
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function TableMapPage() {
  const [tableMap, setTableMap] = useState<TableMap>(fallbackTableMap);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTableMap() {
      try {
        const data = await getTableMap(PROJECT_ID);
        if (!cancelled) {
          setTableMap(data);
          setNotice(null);
        }
      } catch {
        if (!cancelled) {
          setTableMap(fallbackTableMap);
          setNotice("Table map has not been generated yet.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTableMap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuildTableMap() {
    try {
      setIsBuilding(true);
      setNotice(null);
      const data = await buildTableMap(PROJECT_ID);
      setTableMap(data);
    } catch (buildError) {
      setNotice(
        buildError instanceof Error
          ? buildError.message
          : "Unable to build table map.",
      );
    } finally {
      setIsBuilding(false);
      setIsLoading(false);
    }
  }

  const reviewTables = tableMap.tables.filter(
    (table) => table.usage_status === "review_required",
  );
  const findingsTables = tableMap.tables.filter(
    (table) => table.suggested_paper_section === "Findings",
  );
  const summaryCards = [
    { label: "Total tables", value: tableMap.total_tables },
    { label: "Mapped tables", value: tableMap.mapped_tables },
    { label: "Findings tables", value: tableMap.findings_tables },
    { label: "Needs review", value: tableMap.unmapped_tables },
  ];

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-3xl bg-[#07162c] p-6 text-white shadow-[0_24px_70px_rgba(7,22,44,0.25)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-cyan-100 ring-1 ring-white/10">
                <BarChart3 className="size-3.5" />
                Table Intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Table Map
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Review thesis tables, source chapters, paper usage, and evidence
                placement across journal sections.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-[15px] font-semibold text-[#07162c] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isBuilding}
              onClick={handleBuildTableMap}
            >
              {isBuilding ? "Building Table Map" : "Build Table Map"}
              {isBuilding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-cyan-100 ring-1 ring-white/10">
              <span
                className={`size-2 rounded-full ${
                  isLoading ? "bg-cyan-300" : tableMap.status === "mapped" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {isLoading ? "Loading table map" : tableMap.status === "mapped" ? "Table map ready" : "Not generated"}
            </span>
            {notice ? (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[13px] font-semibold text-amber-100 ring-1 ring-amber-200/20">
                {notice}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card className="p-4" key={card.label}>
              <div className="flex items-center justify-between">
                <BarChart3 className="size-5 text-cyan-700" />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Live
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-950">
                {card.value}
              </div>
              <div className="mt-1 text-[15px] font-medium leading-6 text-slate-600">
                {card.label}
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">
                Table Mapping List
              </h2>
              <p className="mt-1 text-[14px] font-medium text-slate-500">
                Parsed tables mapped to source chapter, suggested paper section,
                and review status.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[0.8fr_1.35fr_0.95fr_0.95fr_0.65fr_0.75fr_0.95fr_0.75fr] bg-slate-50 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  <div>Table</div>
                  <div>Title</div>
                  <div>Chapter</div>
                  <div>Section</div>
                  <div>Rows</div>
                  <div>Columns</div>
                  <div>Suggested</div>
                  <div>Status</div>
                </div>
                {tableMap.tables.length ? (
                  tableMap.tables.map((table) => (
                    <div
                      className="grid grid-cols-[0.8fr_1.35fr_0.95fr_0.95fr_0.65fr_0.75fr_0.95fr_0.75fr] border-t border-slate-100 px-4 py-4 text-[14px] text-slate-700"
                      key={table.table_id}
                    >
                      <div className="font-semibold text-slate-950">{table.table_number}</div>
                      <div className="truncate pr-2">{table.table_title}</div>
                      <div className="truncate pr-2">{table.source_chapter}</div>
                      <div className="truncate pr-2">{table.source_section}</div>
                      <div>{table.detected_rows}</div>
                      <div>{table.detected_columns}</div>
                      <div>{table.suggested_paper_section}</div>
                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                            table.usage_status === "mapped"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {statusLabel(table.usage_status)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border-t border-slate-100 px-4 py-10 text-center text-[15px] font-medium text-slate-500">
                    No table map data yet. Build the table map after parsing the thesis.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <aside className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Findings Tables
                </h2>
              </div>
              <div className="space-y-3">
                {findingsTables.length ? (
                  findingsTables.slice(0, 6).map((table) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${table.table_id}-findings`}
                    >
                      <div className="font-semibold text-slate-950">
                        {table.table_number}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {table.table_title}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[14px] font-medium text-slate-500">
                    No findings table detected yet.
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Review Required
                </h2>
              </div>
              <div className="space-y-3">
                {reviewTables.length ? (
                  reviewTables.slice(0, 6).map((table) => (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      key={`${table.table_id}-review`}
                    >
                      <div className="font-semibold text-slate-950">
                        {table.table_number}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-500">
                        {table.issue}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      No table review issue detected
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/70">
              <h2 className="text-lg font-semibold text-slate-950">
                Next Action
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-slate-600">
                Use mapped tables as evidence anchors for Findings, Methodology,
                and Discussion section planning.
              </p>
              <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07162c] px-4 text-[15px] font-semibold text-white transition hover:bg-cyan-900">
                Continue Extraction
                <ArrowRight className="size-4" />
              </button>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
