"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import Footer from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { VIOLATION_POLICIES, AUP_HELP_URL } from "@/lib/violation-policies";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Check } from "lucide-react";

type StatsData = {
  period: {
    start: string;
    end: string;
    days: number;
  };
  kpis: {
    total_captures: number;
    captures_with_violations: number;
    total_reports: number;
    user_uploads: number;
    honeytraps: number;
  };
  captures_by_bucket: Array<{
    bucket: string;
    count: number;
  }> | null;
  violations_by_bucket: Array<{
    bucket: string;
    count: number;
  }> | null;
  reports_by_bucket: Array<{
    bucket: string;
    count: number;
  }> | null;
  top_senders: Array<{
    sender: string;
    total_captures: number;
    captures_with_violations: number;
    is_repeat_offender: boolean;
  }> | null;
  violation_mix: Array<{
    code: string;
    count: number;
    percentage: number;
  }> | null;
  source_split: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
};

type RangeOption = "7" | "30" | "90" | "lifetime";

const CHART_COLORS = {
  // Unified shades of blue for the entire dashboard
  captures: "hsl(217, 91%, 60%)", // blue-500
  violations: "hsl(224, 76%, 48%)", // blue-600
  reports: "hsl(213, 94%, 68%)", // blue-400
  userUpload: "hsl(213, 94%, 68%)", // blue-400
  honeytrap: "hsl(226, 71%, 40%)", // blue-700
};

// Blue palette for pie charts
const PIE_COLORS = [
  "hsl(213, 94%, 68%)", // blue-400
  "hsl(217, 91%, 60%)", // blue-500
  "hsl(224, 76%, 48%)", // blue-600
  "hsl(226, 71%, 40%)", // blue-700
  "hsl(224, 64%, 33%)", // blue-800
  "hsl(222, 47%, 11%)", // slate-900-ish deep blue
  "hsl(206, 92%, 54%)", // vivid blue
  "hsl(215, 28%, 17%)", // deep slate blue
];

export default function StatsPage() {
  const [range, setRange] = useState<RangeOption>("30");
  const [data, setData] = useState<StatsData | null>(null);
  const [allSenders, setAllSenders] = useState<string[]>([]); // options list (unfiltered)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendersPage, setSendersPage] = useState(1);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ range });
        selectedSenders.forEach((s) => qs.append("sender", s));
        const res = await fetch(`/api/stats?${qs.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch stats: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    void fetchStats();
  }, [range, selectedSenders]);

  // Fetch sender options independent of current selection so list doesn't collapse
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ range });
        const resp = await fetch(`/api/stats?${qs.toString()}`); // no sender params
        if (!resp.ok) return;
        const json = (await resp.json()) as Partial<StatsData> | undefined;
        const opts = Array.from(new Set((json?.top_senders || []).map((s: { sender: string }) => String(s.sender)))) as string[];
        if (!cancelled) setAllSenders(opts);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const rangeLabels: Record<RangeOption, string> = {
    "7": "Last 7 days",
    "30": "Last 30 days",
    "90": "Last 90 days",
    lifetime: "Lifetime",
  };
  const rangeOrder: Array<RangeOption> = ["7", "30", "90", "lifetime"];

  return (
    <main
      className="min-h-[calc(100vh+160px)] bg-white"
      style={{
        background:
          "radial-gradient(80% 80% at 15% -10%, rgba(4, 156, 219, 0.22), transparent 65%)," +
          "radial-gradient(80% 80% at 92% 0%, rgba(198, 96, 44, 0.20), transparent 65%)," +
          "linear-gradient(to bottom, #eef7ff 0%, #ffffff 45%, #fff2e9 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 relative">
        <PageHeader />

        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Stats" },
            ]}
          />
        </div>

        <section className="space-y-6">
          {/* Header with range picker */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Transparent Reporting
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Public statistics on captures, violations, and reports
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end md:justify-start ml-auto md:ml-0">
              {/* Range filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 min-w-[150px] shrink-0"
                    aria-label="Select date range"
                  >
                    {rangeLabels[range]}
                    <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-50 w-[min(92vw,220px)] max-w-[92vw] p-1 bg-white border border-slate-200 shadow-xl rounded-xl" align="start">
                  <div className="py-1">
                    {rangeOrder.map((opt) => (
                      <button
                        key={`range-${opt}`}
                        onClick={() => setRange(opt)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-100 ${
                          range === opt ? "bg-slate-900 text-white hover:bg-slate-900" : "text-slate-800"
                        }`}
                      >
                        {rangeLabels[opt]}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sender filter - Simple Multi-select */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="ml-1 inline-flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 min-w-[120px] md:min-w-[150px] shrink-0"
                  >
                    {selectedSenders.length === 0 ? (
                      "Senders"
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">
                          {selectedSenders.length}
                        </span>
                        <span>selected</span>
                      </span>
                    )}
                    <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-50 w-[min(92vw,320px)] max-w-[92vw] p-0 bg-white border border-slate-200 shadow-xl rounded-xl" align="start">
                  <div className="p-2 border-b border-slate-200">
                    <input
                      type="text"
                      placeholder="Search senders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-900 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2">
                    {(allSenders || [])
                      .filter((s) =>
                        s.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((s) => {
                        const isSelected = selectedSenders.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setSelectedSenders((prev) =>
                                prev.includes(s)
                                  ? prev.filter((x) => x !== s)
                                  : [...prev, s]
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-slate-100 rounded-md text-left"
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                isSelected
                                  ? "bg-slate-900 border-slate-900"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="flex-1 truncate text-slate-900">{s}</span>
                          </button>
                        );
                      })}
                    {(allSenders || []).filter((s) =>
                      s.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="py-6 text-center text-sm text-slate-500">
                        No senders found
                      </div>
                    )}
                  </div>
                  {selectedSenders.length > 0 && (
                    <div className="border-t border-slate-200 p-2 flex items-center justify-between bg-white">
                      <span className="text-xs text-slate-600">
                        {selectedSenders.length} selected
                      </span>
                      <button
                        className="text-xs px-2 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={() => setSelectedSenders([])}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading && (
            <>
              {/* KPI skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map((i) => (
                  <div key={`sk-kpi-${i}`} className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
                    <div className="h-10 w-16 bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-40 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
              {/* Chart skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="h-5 w-64 bg-slate-200 rounded mb-4" />
                <div className="h-48 w-full bg-slate-100 rounded" />
              </div>
              {/* Pie skeletons */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1,2].map((i) => (
                  <div key={`sk-pie-${i}`} className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                    <div className="h-[260px] flex items-center justify-center">
                      <div className="h-40 w-40 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Table skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                <div className="space-y-3">
                  {[1,2,3,4].map((r) => (
                    <div key={`sk-row-${r}`} className="h-4 w-full bg-slate-100 rounded" />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Violations Detected"
                  value={data.kpis.captures_with_violations}
                  description="Cases flagged with violations"
                />
                <KpiCard
                  label="Reports Sent"
                  value={data.kpis.total_reports}
                  description="Reports submitted to ActBlue"
                />
                <KpiCard
                  label="Unique Senders"
                  value={data.top_senders?.length || 0}
                  description="Distinct sender accounts"
                />
                <KpiCard
                  label="Source Split"
                  value={`${data.kpis.user_uploads} / ${data.kpis.honeytraps}`}
                  description="User Submitted / Bot Submitted"
                />
              </div>

              {/* Combined Line Chart */}
              <CombinedTimelineChart
                violationsBuckets={data.violations_by_bucket || []}
                reportsBuckets={data.reports_by_bucket || []}
                days={data.period.days}
                periodStart={data.period.start}
                periodEnd={data.period.end}
              />

              {/* Pie Charts Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ViolationMixPieChart violations={data.violation_mix || []} />
                <SourceSplitPieChart sources={data.source_split} />
              </div>

              {/* Top Senders Table */}
              <TopSendersTable
                senders={data.top_senders || []}
                currentPage={sendersPage}
                onPageChange={setSendersPage}
              />
            </>
          )}
        </section>

        <Footer />
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
}

function CombinedTimelineChart({
  violationsBuckets,
  reportsBuckets,
  days,
  periodStart,
  periodEnd,
}: {
  violationsBuckets: Array<{ bucket: string; count: number }>;
  reportsBuckets: Array<{ bucket: string; count: number }>;
  days: number;
  periodStart?: string;
  periodEnd?: string;
}) {
  const useWeeks = days > 45;


  // Helpers to build stable NY-local keys (YYYY-MM-DD)
  function nyDateKey(d: Date): string {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-CA yields YYYY-MM-DD
    return fmt.format(d);
  }

  function startOfWeekNY(d: Date): Date {
    // Postgres date_trunc('week', ...) starts Monday
    const ny = new Date(d);
    // normalize to NY date by creating new Date with same absolute time; we'll adjust by weekday in NY via formatter below
    const dow = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).formatToParts(ny).find(p => p.type === "weekday")?.value || "Mon";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const w = map[dow] ?? 1;
    // convert to Monday index (1)
    const daysFromMonday = (w + 6) % 7; // Mon->0, Sun->6
    const out = new Date(ny);
    out.setUTCDate(out.getUTCDate() - daysFromMonday);
    return out;
  }

  // Build a complete sequence of keys to ensure chart reaches end of period
  function buildKeys(): string[] {
    try {
      if (!periodStart || !periodEnd) return violationsBuckets.map((b) => nyDateKey(new Date(b.bucket)));
      const keys: string[] = [];
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      if (!useWeeks) {
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          keys.push(nyDateKey(d));
        }
      } else {
        for (let d = startOfWeekNY(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
          keys.push(nyDateKey(d));
        }
      }
      return keys;
    } catch {
      return violationsBuckets.map((b) => nyDateKey(new Date(b.bucket)));
    }
  }
  // Server now returns buckets as 'YYYY-MM-DD' strings; fall back to converting if needed
  function normalizeKey(v: string): string {
    // Already normalized
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return nyDateKey(new Date(v));
  }
  const vio = new Map(violationsBuckets.map((b) => [normalizeKey(String(b.bucket)), Number(b.count || 0)] as const));
  const rep = new Map(reportsBuckets.map((b) => [normalizeKey(String(b.bucket)), Number(b.count || 0)] as const));
  const mergedData = buildKeys().map((k) => ({
    date: k.replace(/^\d{4}-/, () => ""), // short display (MM-DD)
    violations: vio.get(k) || 0,
    reports: rep.get(k) || 0,
  }));

  if (mergedData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Violations & Reports Over Time
        </h3>
        <div className="py-12 text-center text-sm text-slate-500">
          No data available
        </div>
      </div>
    );
  }

  const chartConfig = {
    violations: {
      label: "Violations",
      color: CHART_COLORS.violations,
    },
    reports: {
      label: "Reports",
      color: CHART_COLORS.reports,
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Violations & Reports Over Time
      </h3>
      <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
        <LineChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={{ stroke: "#cbd5e1" }}
            padding={{ left: 10, right: 28 }}
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={{ stroke: "#cbd5e1" }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label: unknown) => (useWeeks ? `Week of ${String(label)}` : String(label))}
                labelClassName="text-slate-900"
              />
            }
          />
          <Legend content={<ChartLegendContent payload={undefined} />} />
          <Line
            type="monotone"
            dataKey="violations"
            stroke="var(--color-violations)"
            strokeWidth={2}
            dot={{ fill: "var(--color-violations)", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="reports"
            stroke="var(--color-reports)"
            strokeWidth={2}
            dot={{ fill: "var(--color-reports)", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function ViolationMixPieChart({
  violations,
}: {
  violations: Array<{
    code: string;
    count: number;
    percentage: number;
  }>;
}) {
  if (violations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Violation Mix
        </h3>
        <div className="py-12 text-center text-sm text-slate-500">
          No violations yet
        </div>
      </div>
    );
  }

  const chartData = violations.map((v, idx) => ({
    name: v.code,
    value: v.count,
    percentage: v.percentage,
    fill: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">
        Violation Mix
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name} (${entry.percentage}%)`}
              outerRadius={96}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const policy = VIOLATION_POLICIES.find((p) => p.code === data.name);
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
                      <div className="font-semibold text-slate-900 mb-1">
                        {data.name} {policy && `- ${policy.title}`}
                      </div>
                      <div className="text-slate-700">
                        Count: <span className="font-mono font-medium">{data.value}</span>
                      </div>
                      <div className="text-slate-700">
                        Share: <span className="font-mono font-medium">{data.percentage}%</span>
                      </div>
                      {policy && (
                        <div className="mt-2 text-slate-600 max-w-xs">
                          {policy.policy}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend with Hover Cards */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {violations.map((v, idx) => {
          const policy = VIOLATION_POLICIES.find((p) => p.code === v.code);
          return (
            <HoverCard key={v.code} openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-help">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-xs font-mono text-slate-700">{v.code}</span>
                  <span className="text-xs text-slate-500">
                    ({v.count})
                  </span>
                </div>
              </HoverCardTrigger>
              {policy && (
                <HoverCardContent className="w-96 bg-white border-slate-200" side="top">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs text-slate-500">{policy.code}</div>
                        <div className="font-semibold text-sm text-slate-900">{policy.title}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{policy.policy}</p>
                    <a
                      href={AUP_HELP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      View full policy
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
}

function SourceSplitPieChart({
  sources,
}: {
  sources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}) {
  const chartData = sources.map((s) => ({
    name: s.source === "user_upload" ? "User Submitted" : "Bot Submitted",
    value: s.count,
    percentage: s.percentage,
    fill: s.source === "user_upload" ? CHART_COLORS.userUpload : CHART_COLORS.honeytrap,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Source Split</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name} (${entry.percentage}%)`}
              outerRadius={96}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
                      <div className="font-semibold text-slate-900">{data.name}</div>
                      <div className="text-slate-700">
                        Count: <span className="font-mono font-medium">{data.value}</span>
                      </div>
                      <div className="text-slate-700">
                        Share: <span className="font-mono font-medium">{data.percentage}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center gap-6">
        {chartData.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.fill }} />
            <span className="text-xs text-slate-700">{s.name}</span>
            <span className="text-xs text-slate-500">({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSendersTable({
  senders,
  currentPage,
  onPageChange,
}: {
  senders: Array<{
    sender: string;
    total_captures: number;
    captures_with_violations: number;
    is_repeat_offender: boolean;
  }>;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const itemsPerPage = 10;
  const totalPages = Math.ceil(senders.length / itemsPerPage);
  
  // Calculate displayed senders for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedSenders = senders.slice(startIndex, endIndex);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start
        pages.push(2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end
        pages.push('ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle
        pages.push('ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Most Frequent Senders</h3>
      {senders.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No senders yet
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-4 font-medium text-slate-700">Sender</th>
                  <th className="py-2 pr-4 font-medium text-slate-700 text-right">
                    Captures
                  </th>
                  <th className="py-2 pr-4 font-medium text-slate-700 text-right">
                    w/ Violations
                  </th>
                  <th className="py-2 font-medium text-slate-700 text-center">
                    Repeat Offender
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedSenders.map((s, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                    role="button"
                    tabIndex={0}
                    aria-label={`View cases for ${s.sender}`}
                    onClick={() => router.push(`/cases?senders=${encodeURIComponent(s.sender)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/cases?senders=${encodeURIComponent(s.sender)}`);
                      }
                    }}
                  >
                    <td className="py-2 pr-4 text-slate-900 truncate max-w-[250px]">
                      <span className="text-slate-900">{s.sender}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-900 tabular-nums text-right">
                      {s.total_captures}
                    </td>
                    <td className="py-2 pr-4 text-slate-900 tabular-nums text-right">
                      {s.captures_with_violations}
                    </td>
                    <td className="py-2 text-center">
                      {s.is_repeat_offender && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-red-500"
                          title="Repeat offender (≥3 violations)"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-700 whitespace-nowrap">
                Showing {startIndex + 1}-{Math.min(endIndex, senders.length)} of {senders.length} senders
              </p>
              <Pagination>
                <PaginationContent className="[&_a]:text-slate-800 [&_a]:hover:text-slate-900">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      size="default"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) onPageChange(currentPage - 1);
                      }}
                      className={(currentPage === 1 ? "pointer-events-none opacity-50 " : "") + "cursor-pointer text-slate-800 hover:text-slate-900"}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, idx) => (
                    <PaginationItem key={idx}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(page);
                          }}
                          isActive={currentPage === page}
                          className="cursor-pointer text-slate-800 hover:text-slate-900"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      size="default"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) onPageChange(currentPage + 1);
                      }}
                      className={(currentPage === totalPages ? "pointer-events-none opacity-50 " : "") + "cursor-pointer text-slate-800 hover:text-slate-900"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}