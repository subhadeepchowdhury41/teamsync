import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import { api } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus   = "todo" | "in_progress" | "review" | "completed";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type ViewMode     = "month" | "week";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: { id: string; name: string | null; email: string | null; avatar_url: string | null } | null;
  project: { id: string; name: string } | null;
  tags?: Array<{ id: string; name: string; color: string }>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { bg: string; text: string }> = {
  low:    { bg: "bg-slate-100",  text: "text-slate-600"  },
  medium: { bg: "bg-amber-50",   text: "text-amber-700"  },
  high:   { bg: "bg-orange-50",  text: "text-orange-700" },
  urgent: { bg: "bg-red-50",     text: "text-red-700"    },
};

const STATUS_CONFIG: Record<TaskStatus, { dot: string; accent: string; label: string }> = {
  todo:        { dot: "#94a3b8", accent: "bg-slate-100 text-slate-600",    label: "To Do"       },
  in_progress: { dot: "#3b82f6", accent: "bg-blue-50 text-blue-700",      label: "In Progress" },
  review:      { dot: "#f59e0b", accent: "bg-amber-50 text-amber-700",    label: "Review"      },
  completed:   { dot: "#10b981", accent: "bg-emerald-50 text-emerald-700", label: "Done"        },
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "#94a3b8", medium: "#f59e0b", high: "#f97316", urgent: "#ef4444",
};

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(iso: string) {
  // Avoid UTC shift by parsing as local date
  return new Date(iso + "T00:00:00");
}

// ─── Mini components ──────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url)
    return <img className="h-5 w-5 rounded-full object-cover ring-1 ring-white flex-shrink-0" src={url} alt={name} />;
  return (
    <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center ring-1 ring-white flex-shrink-0">
      <span className="text-[8px] font-bold text-white">{name?.charAt(0).toUpperCase() ?? "?"}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as TaskStatus] ?? STATUS_CONFIG.todo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${cfg.accent}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { data: session } = useSession();

  const [view, setView]         = useState<ViewMode>("month");
  const [current, setCurrent]   = useState<Date>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [selected, setSelected] = useState<string>(() => toKey(new Date()));

  const { data, isLoading } = api.task.getAll.useQuery({ filter: "all" });
  const tasks = useMemo(() => (data?.tasks ?? []) as Task[], [data]);

  // date → tasks map
  const taskMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return m;
  }, [tasks]);

  // Calendar cells
  const cells = useMemo<(Date | null)[]>(() => {
    if (view === "month") {
      const y = current.getFullYear(), mo = current.getMonth();
      const firstDow  = new Date(y, mo, 1).getDay();
      const daysCount = new Date(y, mo + 1, 0).getDate();
      const arr: (Date | null)[] = Array(firstDow).fill(null);
      for (let d = 1; d <= daysCount; d++) arr.push(new Date(y, mo, d));
      while (arr.length % 7 !== 0) arr.push(null);
      return arr;
    } else {
      // Week: start on Sunday of current week
      const base = new Date(current);
      base.setDate(base.getDate() - base.getDay());
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base); d.setDate(d.getDate() + i); return d;
      });
    }
  }, [current, view]);

  const today = toKey(new Date());

  function prev() {
    const d = new Date(current);
    view === "month" ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
    setCurrent(d);
  }
  function next() {
    const d = new Date(current);
    view === "month" ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
    setCurrent(d);
  }
  function goToday() {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    setCurrent(view === "month" ? d : new Date());
    setSelected(toKey(new Date()));
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
    const days = cells.filter(Boolean) as Date[];
    const s = days[0]!, e = days[days.length - 1]!;
    return s.getMonth() === e.getMonth()
      ? `${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
      : `${MONTH_NAMES[s.getMonth()]} – ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
  }, [view, current, cells]);

  const selectedTasks = taskMap.get(selected) ?? [];

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    return parseLocalDate(selected).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
  }, [selected]);

  return (
    <Layout>
      <Head>
        <title>Calendar · TeamSync</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: 'DM Sans', sans-serif; }
        .cal-cell { min-height: 112px; }
        .week-cell { min-height: 150px; }
        .pill-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .line-clamp-2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .side-scroll { overflow-y: auto; max-height: calc(100vh - 340px); scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
        .side-scroll::-webkit-scrollbar { width: 4px; }
        .side-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        .fade-in { animation: fadeUp .15s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      ` }} />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="flex flex-col xl:flex-row gap-6 items-start">

            {/* ══ CALENDAR ════════════════════════════════════════════════ */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Schedule</p>
                  <h1 className="text-xl font-bold text-slate-800">{headerLabel}</h1>
                </div>

                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold shadow-sm">
                    {(["month", "week"] as ViewMode[]).map(v => (
                      <button key={v} onClick={() => {
                        setView(v);
                        if (v === "week") {
                          // Go to the week that contains `current` (month start) or today if same month
                          const base = new Date();
                          setCurrent(base);
                        } else {
                          const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
                          setCurrent(d);
                        }
                      }}
                        className={`px-4 py-2 capitalize transition-colors ${view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <button onClick={prev}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={goToday}
                    className="h-9 px-3 text-xs font-semibold rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    Today
                  </button>
                  <button onClick={next}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Day name headers */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {d}
                    </div>
                  ))}
                </div>

                {/* ── Month view ── */}
                {view === "month" && (
                  <div className="grid grid-cols-7">
                    {(cells as (Date | null)[]).map((day, i) => {
                      const key       = day ? toKey(day) : null;
                      const dayTasks  = key ? (taskMap.get(key) ?? []) : [];
                      const isToday   = key === today;
                      const isSel     = key === selected;
                      const isWeekend = i % 7 === 0 || i % 7 === 6;

                      return (
                        <div key={i}
                          onClick={() => { if (key) setSelected(key); }}
                          className={[
                            "cal-cell p-2 border-b border-r border-slate-100 transition-all duration-100",
                            (i + 1) % 7 === 0 ? "border-r-0" : "",
                            !day ? "bg-slate-50/40" : "cursor-pointer",
                            isSel && day ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200" : "",
                            !isSel && day ? (isWeekend ? "hover:bg-slate-50" : "hover:bg-indigo-50/30") : "",
                          ].join(" ")}>

                          {day && (
                            <>
                              {/* Date number */}
                              <div className="flex items-center justify-between mb-1">
                                <span className={[
                                  "w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors",
                                  isToday  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" :
                                  isSel    ? "bg-indigo-100 text-indigo-700" :
                                  isWeekend? "text-slate-400" : "text-slate-700",
                                ].join(" ")}>
                                  {day.getDate()}
                                </span>
                                {dayTasks.length > 0 && (
                                  <span className="text-[10px] font-semibold text-slate-400">{dayTasks.length}</span>
                                )}
                              </div>

                              {/* Task pills */}
                              <div className="space-y-0.5">
                                {dayTasks.slice(0, 3).map(t => (
                                  <div key={t.id}
                                    className={`pill-text flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_CONFIG[t.priority as TaskPriority]?.bg ?? "bg-slate-100"} ${PRIORITY_CONFIG[t.priority as TaskPriority]?.text ?? "text-slate-600"}`}
                                    style={{ borderLeft: `2px solid ${PRIORITY_DOT[t.priority as TaskPriority] ?? "#94a3b8"}` }}>
                                    <span className="pill-text">{t.title}</span>
                                  </div>
                                ))}
                                {dayTasks.length > 3 && (
                                  <p className="text-[10px] font-semibold text-indigo-400 pl-1">+{dayTasks.length - 3} more</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Week view ── */}
                {view === "week" && (
                  <div className="grid grid-cols-7">
                    {(cells as Date[]).map((day, i) => {
                      const key      = toKey(day);
                      const dayTasks = taskMap.get(key) ?? [];
                      const isToday  = key === today;
                      const isSel    = key === selected;
                      const isWeekend = i === 0 || i === 6;

                      return (
                        <div key={i}
                          onClick={() => setSelected(key)}
                          className={[
                            "week-cell p-2 border-r border-slate-100 last:border-r-0 cursor-pointer transition-all duration-100",
                            isSel ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200" : "",
                            !isSel ? (isWeekend ? "hover:bg-slate-50" : "hover:bg-indigo-50/30") : "",
                          ].join(" ")}>

                          {/* Date header */}
                          <div className="flex flex-col items-center mb-2">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">
                              {DAY_NAMES[day.getDay()]}
                            </span>
                            <span className={[
                              "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                              isToday  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" :
                              isSel    ? "bg-indigo-100 text-indigo-700" :
                              isWeekend? "text-slate-400" : "text-slate-700",
                            ].join(" ")}>
                              {day.getDate()}
                            </span>
                          </div>

                          {/* Tasks */}
                          <div className="space-y-1">
                            {dayTasks.map(t => (
                              <div key={t.id}
                                className={`px-1.5 py-1 rounded text-[10px] font-medium leading-tight ${PRIORITY_CONFIG[t.priority as TaskPriority]?.bg ?? "bg-slate-100"} ${PRIORITY_CONFIG[t.priority as TaskPriority]?.text ?? "text-slate-600"}`}
                                style={{ borderLeft: `2px solid ${PRIORITY_DOT[t.priority as TaskPriority] ?? "#94a3b8"}` }}>
                                <p className="pill-text">{t.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 px-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority:</p>
                {(["low","medium","high","urgent"] as TaskPriority[]).map(p => (
                  <span key={p} className={`inline-flex items-center gap-1.5 text-xs font-medium ${PRIORITY_CONFIG[p].text}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_DOT[p] }} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* ══ SIDE PANEL ══════════════════════════════════════════════ */}
            <div className="w-full xl:w-80 2xl:w-96 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6 fade-in">

                {/* Panel header */}
                <div className="px-5 py-4 border-b border-slate-100">
                  {selected === today ? (
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Today</p>
                  ) : (
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Selected day</p>
                  )}
                  <h2 className="text-sm font-bold text-slate-800">{selectedLabel}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} due
                  </p>
                </div>

                {/* Task list */}
                <div className="side-scroll">
                  {isLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                  ) : selectedTasks.length > 0 ? (
                    <div className="divide-y divide-slate-50 px-2 py-1">
                      {selectedTasks.map(t => {
                        const pri = PRIORITY_CONFIG[t.priority as TaskPriority] ?? PRIORITY_CONFIG.medium;
                        return (
                          <Link key={t.id} href={`/tasks/${t.id}/edit`}
                            className="flex flex-col gap-2 px-3 py-3.5 rounded-xl hover:bg-slate-50 transition-colors group fade-in">

                            {/* Title + priority badge */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                                {t.title}
                              </p>
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${pri.bg} ${pri.text}`}>
                                {t.priority}
                              </span>
                            </div>

                            {/* Status + project */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusPill status={t.status} />
                              {t.project && (
                                <span className="text-[11px] text-slate-400 truncate">{t.project.name}</span>
                              )}
                            </div>

                            {/* Tags */}
                            {(t.tags?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {t.tags!.slice(0, 3).map(tag => (
                                  <span key={tag.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ background: `${tag.color}22`, color: tag.color }}>
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Assignee */}
                            {t.assignee && (
                              <div className="flex items-center gap-1.5">
                                <Avatar name={t.assignee.name ?? ""} url={t.assignee.avatar_url} />
                                <span className="text-[11px] text-slate-400 truncate">{t.assignee.name}</span>
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-400 font-medium">No tasks due</p>
                      <p className="text-xs text-slate-300">Nothing scheduled for this day</p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <Link href="/tasks"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold transition-all shadow-sm shadow-indigo-200">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Task
                  </Link>
                  <Link href="/tasks"
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-500 text-xs font-semibold transition-colors">
                    View all tasks →
                  </Link>
                </div>
              </div>

              {/* Mini stats */}
              {!isLoading && tasks.length > 0 && (
                <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 fade-in">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">This month</p>
                  {(() => {
                    const y = new Date().getFullYear(), mo = new Date().getMonth();
                    const monthTasks = tasks.filter(t => {
                      if (!t.due_date) return false;
                      const d = new Date(t.due_date);
                      return d.getFullYear() === y && d.getMonth() === mo;
                    });
                    const done    = monthTasks.filter(t => t.status === "completed").length;
                    const overdue = monthTasks.filter(t => {
                      const d = new Date(t.due_date!);
                      return d < new Date() && t.status !== "completed";
                    }).length;
                    const pct = monthTasks.length > 0 ? Math.round((done / monthTasks.length) * 100) : 0;
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Tasks due</span>
                          <span className="font-bold text-slate-700">{monthTasks.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Completed</span>
                          <span className="font-bold text-emerald-600">{done}</span>
                        </div>
                        {overdue > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Overdue</span>
                            <span className="font-bold text-red-500">{overdue}</span>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Progress</span>
                            <span className="font-semibold text-indigo-500">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  if (!session) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }
  return { props: { session } };
};
