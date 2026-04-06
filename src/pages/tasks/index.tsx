import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import TaskCard from "@/components/tasks/TaskCard";
import TaskForm from "@/components/tasks/TaskForm";
import { api } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus   = "todo" | "in_progress" | "review" | "completed";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type ViewMode     = "board" | "table" | "list";
type QuickFilter  = "all" | "assigned" | "upcoming" | "overdue";
type SortField    = "title" | "priority" | "due_date" | "project";
type SortDir      = "asc" | "desc";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: { id: string; name: string | null; email: string | null; avatar_url: string | null; } | null;
  project: { id: string; name: string; } | null;
  tags?: Array<{ id: string; name: string; color: string; }>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; dot: string; accent: string }[] = [
  { id: "todo",        label: "To Do",       color: "border-t-slate-300",  dot: "#94a3b8", accent: "bg-slate-100 text-slate-600"  },
  { id: "in_progress", label: "In Progress", color: "border-t-blue-400",   dot: "#3b82f6", accent: "bg-blue-50 text-blue-700"    },
  { id: "review",      label: "Review",      color: "border-t-amber-400",  dot: "#f59e0b", accent: "bg-amber-50 text-amber-700"  },
  { id: "completed",   label: "Done",        color: "border-t-emerald-400",dot: "#10b981", accent: "bg-emerald-50 text-emerald-700"},
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; icon: string }> = {
  low:    { label: "Low",    color: "text-slate-400",  bg: "bg-slate-100",  icon: "↓"  },
  medium: { label: "Medium", color: "text-amber-500",  bg: "bg-amber-50",   icon: "→"  },
  high:   { label: "High",   color: "text-orange-500", bg: "bg-orange-50",  icon: "↑"  },
  urgent: { label: "Urgent", color: "text-red-500",    bg: "bg-red-50",     icon: "↑↑" },
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ─── Mini-components ──────────────────────────────────────────────────────────

function Avatar({ name, url, size = "sm" }: { name: string; url?: string | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  if (url) return <img className={`${cls} rounded-full object-cover ring-1 ring-white`} src={url} alt={name} />;
  return (
    <div className={`${cls} rounded-full bg-indigo-500 flex items-center justify-center ring-1 ring-white flex-shrink-0`}>
      <span className="font-semibold text-white">{name?.charAt(0).toUpperCase() ?? "?"}</span>
    </div>
  );
}

function PriorityDot({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.color}`}>
      <span>{cfg.icon}</span>{cfg.label}
    </span>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  const col = COLUMNS.find(c => c.id === status)!;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${col.accent}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.dot }} />
      {col.label}
    </span>
  );
}

function SortArrow({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <span className="ml-1 text-slate-300 text-xs">↕</span>;
  return <span className="ml-1 text-indigo-500 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

// ─── Board Card ───────────────────────────────────────────────────────────────

function BoardTaskCard({ task, now, onDelete, onClick }: { task: Task; now: Date | null; onDelete: () => void; onClick: () => void }) {
  const isOverdue = now && task.due_date && new Date(task.due_date) < now && task.status !== "completed";
  const priCfg = PRIORITY_CONFIG[task.priority as TaskPriority];

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-150 group cursor-pointer" onClick={onClick}>
      <div className="p-3.5">
        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 2).map(tag => (
              <span key={tag.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${tag.color}20`, color: tag.color }}>{tag.name}</span>
            ))}
            {task.tags.length > 2 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-400">+{task.tags.length - 2}</span>}
          </div>
        )}
        <p className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors mb-1">{task.title}</p>
        {task.description && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-2.5">{task.description}</p>}

        {/* Meta row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold ${priCfg.color}`}>{priCfg.icon} {priCfg.label}</span>
            {task.project && <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{task.project.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className={`text-[10px] font-medium font-mono ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                {isOverdue && "⚠ "}{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {task.assignee && <Avatar name={task.assignee.name || ""} url={task.assignee.avatar_url} size="sm" />}
          </div>
        </div>
      </div>
      {/* Delete on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity px-3.5 pb-2.5" onClick={e => e.stopPropagation()}>
        <button onClick={onDelete} className="w-full text-[10px] text-slate-300 hover:text-red-400 transition-colors text-center py-0.5 rounded hover:bg-red-50">
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showTaskForm,  setShowTaskForm]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [view,          setView]          = useState<ViewMode>("board");
  // Stable "now" that only exists on the client — prevents SSR/client hydration mismatch
  const [now,           setNow]           = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  const [search,        setSearch]        = useState("");
  const [sortField,     setSortField]     = useState<SortField>("priority");
  const [sortDir,       setSortDir]       = useState<SortDir>("asc");

  const [filter,         setFilter]         = useState<QuickFilter>(
    typeof router.query.filter === "string" ? (router.query.filter as QuickFilter) : "all"
  );
  const [projectFilter,  setProjectFilter]  = useState<string | null>(null);
  const [statusFilter,   setStatusFilter]   = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  useEffect(() => {
    if (router.query.filter && typeof router.query.filter === "string")
      setFilter(router.query.filter as QuickFilter);
  }, [router.query.filter]);

  const { data: projectsData } = api.project.list.useQuery(undefined, { enabled: !!session?.user });

  const { data: tasksData, error: tasksError, refetch: refetchTasks } = api.task.getAll.useQuery(
    { filter, projectId: projectFilter || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined },
    { enabled: !!session?.user }
  );

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData.tasks.map(t => ({ ...t, tags: t.tags?.map(tag => ({ ...tag, color: tag.color || "#6366f1" })) || [] })));
      setLoading(false);
    }
    if (tasksError) { setError("Failed to fetch tasks"); setLoading(false); }
  }, [tasksData, tasksError]);

  const deleteTaskMutation = api.task.delete.useMutation({
    onSuccess: () => void refetchTasks(),
    onError: (e) => alert(`Error: ${e.message}`),
  });

  const handleFilterChange = (f: QuickFilter) => {
    setFilter(f);
    void router.push({ pathname: router.pathname, query: { ...router.query, filter: f } });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Delete this task?")) deleteTaskMutation.mutate({ id });
  };

  // ── Derived
  const filteredTasks = useMemo(() => {
    let out = [...tasks];
    if (search.trim()) { const q = search.toLowerCase(); out = out.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)); }
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":    cmp = a.title.localeCompare(b.title); break;
        case "priority": cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case "due_date": cmp = (a.due_date ?? "zzzz").localeCompare(b.due_date ?? "zzzz"); break;
        case "project":  cmp = (a.project?.name ?? "").localeCompare(b.project?.name ?? ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [tasks, search, sortField, sortDir]);

  const byStatus = (s: TaskStatus) => filteredTasks.filter(t => t.status === s);

  const totalCount     = tasks.length;
  const doneCount      = tasks.filter(t => t.status === "completed").length;
  const activeCount    = tasks.filter(t => t.status === "in_progress").length;
  const overdueCount   = now ? tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "completed").length : 0;
  const progressPct    = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const hasFilters = !!(search || projectFilter || statusFilter || priorityFilter || filter !== "all");

  if (!session) return (
    <Layout><div className="flex h-full items-center justify-center text-slate-400">Please sign in to view tasks</div></Layout>
  );

  return (
    <Layout>
      <Head>
        <title>Tasks · TeamSync</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        .col-scroll { overflow-y: auto; max-height: calc(100vh - 300px); scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
        .col-scroll::-webkit-scrollbar { width: 4px; } .col-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        .th-sort { cursor: pointer; user-select: none; } .th-sort:hover { color: #4f46e5; }
        .row-hover:hover { background: #f8fafc; }
        .fade-in { animation: fadeUp .2s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .pill { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500; }
      ` }} />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">

          {/* ── TASK FORM MODAL ─────────────────────────────────────── */}
          {showTaskForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl fade-in">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">New Task</p>
                    <h2 className="text-lg font-bold text-slate-800">Create a Task</h2>
                  </div>
                  <button onClick={() => setShowTaskForm(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6">
                  <TaskForm onSuccess={() => { setShowTaskForm(false); void refetchTasks(); }} onCancel={() => setShowTaskForm(false)} />
                </div>
              </div>
            </div>
          )}

          {/* ── PAGE HEADER ──────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
              <p className="text-sm text-slate-400 mt-0.5">Track and manage work across all your projects</p>
            </div>
            <button onClick={() => setShowTaskForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 self-start sm:self-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              New Task
            </button>
          </div>

          {/* ── STAT STRIP ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: totalCount, sub: "across all projects" },
              { label: "In Progress", value: activeCount, sub: "active now" },
              { label: "Completed", value: doneCount, sub: `${progressPct}% done` },
              { label: "Overdue", value: overdueCount, sub: overdueCount > 0 ? "needs attention ⚠" : "all on track" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-800 leading-none mono">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── TOOLBAR ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 space-y-3">
            {/* Quick filter tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 pb-3">
              {(["all", "assigned", "upcoming", "overdue"] as QuickFilter[]).map(f => (
                <button key={f} onClick={() => handleFilterChange(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                  {f === "all" ? "All Tasks" : f === "assigned" ? "Assigned to Me" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Search + filters + view toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={projectFilter || ""} onChange={e => setProjectFilter(e.target.value || null)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">All Projects</option>
                  {projectsData?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={statusFilter || ""} onChange={e => setStatusFilter(e.target.value || null)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
                <select value={priorityFilter || ""} onChange={e => setPriorityFilter(e.target.value || null)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* View toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  {([
                    { id: "board", icon: <><rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/></> },
                    { id: "table", icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></> },
                    { id: "list",  icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></> },
                  ] as const).map(v => (
                    <button key={v.id} title={`${v.id} view`} onClick={() => setView(v.id as ViewMode)}
                      className={`p-1.5 rounded-md transition-all ${view === v.id ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                      <svg className="w-4 h-4" fill={v.id === "board" ? "currentColor" : "none"} stroke={v.id !== "board" ? "currentColor" : "none"} viewBox="0 0 24 24">{v.icon}</svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-slate-400">Active:</span>
                {filter !== "all" && <span className="pill bg-indigo-50 text-indigo-600">{filter}<button onClick={() => handleFilterChange("all")} className="ml-1">×</button></span>}
                {projectFilter && <span className="pill bg-slate-100 text-slate-600">{projectsData?.find(p => p.id === projectFilter)?.name ?? "Project"}<button onClick={() => setProjectFilter(null)} className="ml-1">×</button></span>}
                {statusFilter && <span className="pill bg-blue-50 text-blue-600">{statusFilter.replace("_"," ")}<button onClick={() => setStatusFilter(null)} className="ml-1">×</button></span>}
                {priorityFilter && <span className="pill bg-amber-50 text-amber-700">{priorityFilter}<button onClick={() => setPriorityFilter(null)} className="ml-1">×</button></span>}
                {search && <span className="pill bg-slate-100 text-slate-600">"{search}"<button onClick={() => setSearch("")} className="ml-1">×</button></span>}
                <button onClick={() => { handleFilterChange("all"); setProjectFilter(null); setStatusFilter(null); setPriorityFilter(null); setSearch(""); }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1">Clear all</button>
              </div>
            )}
          </div>

          {/* Result count */}
          <p className="text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-600">{filteredTasks.length}</span> task{filteredTasks.length !== 1 ? "s" : ""}
            {filteredTasks.length !== tasks.length && ` (filtered from ${tasks.length})`}
          </p>

          {/* ── LOADING / ERROR ──────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-200 border-t-indigo-500" />
              <p className="text-sm text-slate-400">Loading tasks…</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-red-700">Error loading tasks</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          )}

          {/* ── BOARD VIEW ───────────────────────────────────────────── */}
          {!loading && !error && view === "board" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 fade-in">
              {COLUMNS.map(col => {
                const colTasks = byStatus(col.id);
                return (
                  <div key={col.id} className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${col.color} flex flex-col overflow-hidden`}>
                    {/* Column header */}
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dot }} />
                        <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                      </div>
                      <span className="text-xs font-bold mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>

                    {/* Column body */}
                    <div className="col-scroll px-3 pb-3 flex flex-col gap-2.5 flex-1">
                      {colTasks.length > 0 ? colTasks.map(task => (
                        <BoardTaskCard
                          key={task.id}
                          task={task}
                          now={now}
                          onDelete={() => handleDeleteTask(task.id)}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                        />
                      )) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                            <span className="text-lg" style={{ color: col.dot }}>○</span>
                          </div>
                          <p className="text-xs text-slate-400">No tasks here</p>
                        </div>
                      )}
                    </div>

                    {/* Add to column */}
                    <div className="px-3 pb-3">
                      <button onClick={() => setShowTaskForm(true)}
                        className="w-full py-2 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all">
                        + Add task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TABLE VIEW ───────────────────────────────────────────── */}
          {!loading && !error && view === "table" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden fade-in">
              {filteredTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {([
                          { field: "title" as SortField, label: "Task" },
                          { field: "project" as SortField, label: "Project" },
                          { field: null, label: "Status" },
                          { field: "priority" as SortField, label: "Priority" },
                          { field: null, label: "Assignee" },
                          { field: "due_date" as SortField, label: "Due" },
                          { field: null, label: "Tags" },
                        ]).map(col => (
                          <th key={col.label}
                            className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${col.field ? "th-sort" : ""}`}
                            onClick={() => col.field && handleSort(col.field)}>
                            {col.label}{col.field && <SortArrow field={col.field} sortField={sortField} sortDir={sortDir} />}
                          </th>
                        ))}
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTasks.map(task => {
                        const isOverdue = now && task.due_date && new Date(task.due_date) < now && task.status !== "completed";
                        return (
                          <tr key={task.id} className="row-hover transition-colors">
                            <td className="px-4 py-3.5 max-w-xs">
                              <button onClick={() => router.push(`/tasks/${task.id}`)} className="text-left group">
                                <p className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">{task.title}</p>
                                {task.description && <p className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">{task.description}</p>}
                              </button>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {task.project ? (
                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{task.project.name}</span>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><StatusPill status={task.status} /></td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><PriorityDot priority={task.priority} /></td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {task.assignee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar name={task.assignee.name || ""} url={task.assignee.avatar_url} size="sm" />
                                  <span className="text-xs text-slate-600 truncate max-w-[80px]">{task.assignee.name}</span>
                                </div>
                              ) : <span className="text-xs text-slate-300 italic">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {task.due_date ? (
                                <span className={`text-xs mono font-medium ${isOverdue ? "text-red-500" : "text-slate-500"}`}>
                                  {isOverdue && "⚠ "}{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {task.tags?.slice(0, 2).map(tag => (
                                  <span key={tag.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${tag.color}20`, color: tag.color }}>{tag.name}</span>
                                ))}
                                {(task.tags?.length ?? 0) > 2 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-400">+{(task.tags?.length ?? 0) - 2}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3.5">
                              <button onClick={() => handleDeleteTask(task.id)} className="p-1 rounded hover:bg-red-50 text-slate-200 hover:text-red-400 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState onAdd={() => setShowTaskForm(true)} hasFilters={hasFilters} />}
            </div>
          )}

          {/* ── LIST VIEW ─────────────────────────────────────────────── */}
          {!loading && !error && view === "list" && (
            <div className="space-y-2 fade-in">
              {filteredTasks.length > 0 ? filteredTasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <TaskCard
                    id={task.id} title={task.title} description={task.description || ""}
                    status={task.status} priority={task.priority} dueDate={task.due_date || undefined}
                    assignee={task.assignee ? { id: task.assignee.id, name: task.assignee.name || "", email: task.assignee.email || "", avatarUrl: task.assignee.avatar_url || undefined } : null}
                    project={task.project || null}
                    tags={task.tags}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                </div>
              )) : <EmptyState onAdd={() => setShowTaskForm(true)} hasFilters={hasFilters} />}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd, hasFilters }: { onAdd: () => void; hasFilters: boolean }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      {hasFilters ? (
        <><p className="text-sm font-medium text-slate-600">No tasks match your filters</p><p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria</p></>
      ) : (
        <><p className="text-sm font-medium text-slate-600 mb-1">No tasks yet</p><p className="text-xs text-slate-400 mb-5">Create your first task to get started</p>
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Task
          </button>
        </>
      )}
    </div>
  );
}

// ─── SSR ─────────────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);
  if (!session) return { redirect: { destination: "/auth/signin", permanent: false } };
  return { props: { session } };
};