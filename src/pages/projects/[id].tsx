import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '@/components/layout/Layout';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import TagManager from '@/components/tags/TagManager';
import { api } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskTag { id: string; name: string; color: string | null; }
interface ProjectMember { id: string; name: string; email: string; role: string; image?: string; avatar_url?: string; }
interface Project { id: string; name: string; description?: string; created_at: string; updated_at?: string; creator_id?: string; }
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type SortField = 'title' | 'status' | 'priority' | 'due_date' | 'assignee';
type SortDir = 'asc' | 'desc';

type Task = {
  id: string; title: string; description?: string | null; status: TaskStatus; priority: TaskPriority;
  due_date?: string | null;
  assignee?: { id: string; name: string | null; email: string | null; image?: string | null; } | null;
  tags?: Array<{ id: string; name: string; color: string | null; }>;
  creator?: { id: string; name: string | null; email: string | null; image?: string | null; };
  assignee_id?: string | null; project_id?: string;
  created_at?: string | Date; updated_at?: string | Date;
};

// ─── Status / Priority Config ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; bg: string; text: string }> = {
  todo:        { label: 'To Do',       dot: '#94a3b8', bg: 'bg-slate-100',  text: 'text-slate-600' },
  in_progress: { label: 'In Progress', dot: '#3b82f6', bg: 'bg-blue-50',   text: 'text-blue-700'  },
  review:      { label: 'Review',      dot: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700' },
  completed:   { label: 'Done',        dot: '#10b981', bg: 'bg-emerald-50',text: 'text-emerald-700'},
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  low:    { label: 'Low',    color: 'text-slate-400', icon: '↓' },
  medium: { label: 'Medium', color: 'text-amber-500', icon: '→' },
  high:   { label: 'High',   color: 'text-orange-500',icon: '↑' },
  urgent: { label: 'Urgent', color: 'text-red-500',   icon: '↑↑'},
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<TaskStatus, number>     = { in_progress: 0, review: 1, todo: 2, completed: 3 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
      <span className="font-bold text-[11px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function Avatar({ name, image, size = 'sm' }: { name: string; image?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (image) return <img className={`${dim} rounded-full object-cover ring-1 ring-white`} src={image} alt={name} />;
  return (
    <div className={`${dim} rounded-full bg-indigo-500 flex items-center justify-center ring-1 ring-white`}>
      <span className="font-semibold text-white">{name?.charAt(0).toUpperCase() ?? '?'}</span>
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: projectId } = router.query;

  const [project, setProject]         = useState<Project | null>(null);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [members, setMembers]         = useState<ProjectMember[]>([]);
  const [loading, setLoading]         = useState(true);
  const [projectTags, setProjectTags] = useState<TaskTag[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [userRole, setUserRole]       = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [refreshTags, setRefreshTags] = useState(0);

  // ── Filter & sort state
  const [filterStatus,   setFilterStatus]   = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [search,         setSearch]         = useState('');
  const [sortField,      setSortField]      = useState<SortField>('status');
  const [sortDir,        setSortDir]        = useState<SortDir>('asc');
  const [view,           setView]           = useState<'table' | 'board'>('table');

  useEffect(() => { if (status === 'unauthenticated') void router.push('/auth/signin'); }, [status, router]);

  const { data: projectData, error: projectError, isLoading } = api.project.getById.useQuery(
    { id: projectId as string }, { enabled: !!projectId && !!session?.user }
  );
  const { data: tagsData } = api.tag.getByProject.useQuery(
    { projectId: projectId as string }, { enabled: !!projectId && !!session?.user }
  );
  const { refetch: refetchProjectData } = api.project.getById.useQuery(
    { id: projectId as string }, { enabled: false }
  );

  useEffect(() => { if (tagsData) setProjectTags(tagsData.tags); }, [tagsData]);

  const mapTask = (task: any): Task => {
    const s = ['todo','in_progress','review','completed'].includes(task.status) ? task.status as TaskStatus : 'todo';
    const p = ['low','medium','high','urgent'].includes(task.priority) ? task.priority as TaskPriority : 'medium';
    return {
      id: task.id, title: task.title, status: s, priority: p,
      description: task.description || undefined,
      due_date: task.due_date ? task.due_date.toString() : undefined,
      created_at: task.created_at?.toString(), updated_at: task.updated_at?.toString(),
      assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name || '', email: task.assignee.email || '', image: task.assignee.image || undefined } : undefined,
      tags: task.tags?.map((t: any) => ({ id: t.id, name: t.name, color: t.color || '#6366f1' })) ?? [],
      project_id: task.project_id, assignee_id: task.assignee_id,
    };
  };

  useEffect(() => {
    if (projectData) {
      setProject({ ...projectData.project, description: projectData.project.description || undefined, created_at: projectData.project.created_at.toString(), updated_at: projectData.project.updated_at?.toString() });
      setUserRole(projectData.userRole);
      setTasks(projectData.tasks.map(mapTask));
      setMembers(projectData.members.map((m: any) => ({ id: m.id, name: m.name || '', email: m.email || '', role: m.role || 'member', avatar_url: m.avatar_url || '', image: m.image || '' })));
      setLoading(false);
    }
  }, [projectData]);

  useEffect(() => { if (projectError) { setError(projectError.message || 'Failed to load project'); setLoading(false); } }, [projectError]);
  useEffect(() => { setLoading(isLoading); }, [isLoading]);

  const deleteTaskMutation = api.task.delete.useMutation({
    onSuccess: (_: any, { id }: { id: string }) => setTasks(t => t.filter(x => x.id !== id)),
    onError: (e) => alert(`Error: ${e.message}`),
  });
  const deleteProjectMutation = api.project.delete.useMutation({
    onSuccess: () => router.push('/projects'),
    onError: (e) => alert(`Error: ${e.message}`),
  });

  const handleDeleteProject = () => { if (confirm('Delete this project? This cannot be undone.') && typeof projectId === 'string') deleteProjectMutation.mutate({ id: projectId }); };
  const handleDeleteTask    = (id: string) => { if (confirm('Delete this task?')) deleteTaskMutation.mutate({ id }); };

  const handleTaskFormSuccess = async () => {
    setShowTaskForm(false);
    const result = await refetchProjectData();
    if (result.data?.tasks) setTasks(result.data.tasks.map(mapTask));
  };

  // ── Derived data
  const filteredTasks = useMemo(() => {
    let out = [...tasks];
    if (filterStatus   !== 'all') out = out.filter(t => t.status   === filterStatus);
    if (filterPriority !== 'all') out = out.filter(t => t.priority === filterPriority);
    if (filterAssignee !== 'all') out = out.filter(t => (t.assignee?.id ?? 'unassigned') === filterAssignee);
    if (search.trim()) { const q = search.toLowerCase(); out = out.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)); }
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':    cmp = a.title.localeCompare(b.title); break;
        case 'status':   cmp = STATUS_ORDER[a.status]   - STATUS_ORDER[b.status];   break;
        case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case 'due_date': cmp = (a.due_date ?? 'zzzz').localeCompare(b.due_date ?? 'zzzz'); break;
        case 'assignee': cmp = (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [tasks, filterStatus, filterPriority, filterAssignee, search, sortField, sortDir]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;
  const progressPct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // ── Loading / Error / Not Found
  if (status === 'loading' || loading) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm text-slate-400 font-medium">Loading project…</p>
        </div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="max-w-lg mx-auto mt-16 bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="font-semibold text-red-700 mb-1">Something went wrong</p>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    </Layout>
  );

  if (!project) return (
    <Layout>
      <div className="text-center mt-24 text-slate-400">Project not found</div>
    </Layout>
  );

  return (
    <>
      <Head>
        <title>{project.name} · TeamSync</title>
        <meta name="description" content={project.description ?? `${project.name} – TeamSync project`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        .th-btn { cursor: pointer; user-select: none; }
        .th-btn:hover { color: #4f46e5; }
        .row-hover:hover { background: #f8fafc; }
        .tag-pill { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
        ::-webkit-scrollbar { height: 6px; width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <Layout>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            {/* ── TASK FORM MODAL ─────────────────────────────────────────── */}
            {showTaskForm && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl fade-in">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">New Task</p>
                      <h2 className="text-lg font-bold text-slate-800">{project.name}</h2>
                    </div>
                    <button onClick={() => setShowTaskForm(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="p-6">
                    <TaskForm projectId={projectId as string} onSuccess={handleTaskFormSuccess} onCancel={() => setShowTaskForm(false)} availableMembers={members} availableTags={projectTags} />
                  </div>
                </div>
              </div>
            )}

            {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
              <button onClick={() => router.push('/projects')} className="hover:text-slate-600 transition-colors">Projects</button>
              <span>/</span>
              <span className="text-slate-700 font-medium">{project.name}</span>
            </nav>

            {/* ── PROJECT HEADER ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                    <h1 className="text-2xl font-bold text-slate-900 truncate">{project.name}</h1>
                  </div>
                  {project.description && <p className="text-sm text-slate-500 ml-5">{project.description}</p>}
                  <div className="ml-5 mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} image={m.image} size="sm" />)}
                      </div>
                      <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-slate-200">|</span>
                    <span className="text-xs text-slate-400">Created {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => router.push(`/projects/edit/${projectId}`)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                    <button onClick={() => router.push(`/projects/team/${projectId}`)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Team
                    </button>
                    <button onClick={() => setShowTaskForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                      Add Task
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">Overall progress</span>
                  <span className="text-xs font-bold text-slate-700 mono">{progressPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── STATS ROW ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Tasks"   value={tasks.length}    sub={`${tasks.length - completedCount} remaining`} />
              <StatCard label="Completed"     value={completedCount}  sub={`${progressPct}% done`} />
              <StatCard label="In Progress"   value={inProgressCount} sub="active right now" />
              <StatCard label="Overdue"       value={overdueCount}    sub={overdueCount > 0 ? '⚠ needs attention' : 'all on track'} />
            </div>

            {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

              {/* Tasks panel — takes 3/4 */}
              <div className="lg:col-span-3 space-y-3">

                {/* Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                      />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                        className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                        <option value="all">All Statuses</option>
                        {(['todo','in_progress','review','completed'] as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}
                        className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                        <option value="all">All Priorities</option>
                        {(['urgent','high','medium','low'] as TaskPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                      </select>
                      <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                        className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                        <option value="all">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>

                      {/* View toggle */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 ml-1">
                        <button onClick={() => setView('table')} title="Table view"
                          className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
                        </button>
                        <button onClick={() => setView('board')} title="Card view"
                          className={`p-1.5 rounded-md transition-all ${view === 'board' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  {(filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all' || search) && (
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="text-xs text-slate-400">Filters:</span>
                      {filterStatus !== 'all' && <span className="tag-pill bg-indigo-50 text-indigo-600">{STATUS_CONFIG[filterStatus].label}<button onClick={() => setFilterStatus('all')} className="ml-1 hover:text-indigo-800">×</button></span>}
                      {filterPriority !== 'all' && <span className="tag-pill bg-amber-50 text-amber-700">{PRIORITY_CONFIG[filterPriority].label}<button onClick={() => setFilterPriority('all')} className="ml-1 hover:text-amber-900">×</button></span>}
                      {filterAssignee !== 'all' && <span className="tag-pill bg-slate-100 text-slate-600">{members.find(m => m.id === filterAssignee)?.name ?? 'Unassigned'}<button onClick={() => setFilterAssignee('all')} className="ml-1">×</button></span>}
                      {search && <span className="tag-pill bg-slate-100 text-slate-600">"{search}"<button onClick={() => setSearch('')} className="ml-1">×</button></span>}
                      <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterAssignee('all'); setSearch(''); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1">Clear all</button>
                    </div>
                  )}
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-slate-400"><span className="font-semibold text-slate-600">{filteredTasks.length}</span> task{filteredTasks.length !== 1 ? 's' : ''} {filteredTasks.length !== tasks.length && `(filtered from ${tasks.length})`}</p>
                  {!isAdmin && (
                    <button onClick={() => setShowTaskForm(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">+ Add Task</button>
                  )}
                </div>

                {/* ── TABLE VIEW ──────────────────────────────────────────── */}
                {view === 'table' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden fade-in">
                    {filteredTasks.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 th-btn" onClick={() => handleSort('title')}>
                                Task <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 th-btn" onClick={() => handleSort('status')}>
                                Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 th-btn" onClick={() => handleSort('priority')}>
                                Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 th-btn" onClick={() => handleSort('assignee')}>
                                Assignee <SortIcon field="assignee" sortField={sortField} sortDir={sortDir} />
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 th-btn hidden md:table-cell" onClick={() => handleSort('due_date')}>
                                Due <SortIcon field="due_date" sortField={sortField} sortDir={sortDir} />
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">Tags</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map(task => {
                              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                              return (
                                <tr key={task.id} className="row-hover transition-colors">
                                  <td className="px-4 py-3.5 max-w-xs">
                                    <button onClick={() => router.push(`/tasks/${task.id}`)} className="text-left group">
                                      <p className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[220px]">{task.title}</p>
                                      {task.description && <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{task.description}</p>}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={task.status} /></td>
                                  <td className="px-4 py-3.5 whitespace-nowrap"><PriorityBadge priority={task.priority} /></td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    {task.assignee ? (
                                      <div className="flex items-center gap-2">
                                        <Avatar name={task.assignee.name || ''} image={task.assignee.image} size="sm" />
                                        <span className="text-xs text-slate-600 truncate max-w-[80px]">{task.assignee.name}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-300 italic">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap hidden md:table-cell">
                                    {task.due_date ? (
                                      <span className={`text-xs mono font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                        {isOverdue && '⚠ '}{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-3.5 hidden lg:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags?.slice(0, 2).map(tag => (
                                        <span key={tag.id} className="tag-pill" style={{ background: `${tag.color}18`, color: tag.color || '#6366f1' }}>{tag.name}</span>
                                      ))}
                                      {(task.tags?.length ?? 0) > 2 && <span className="tag-pill bg-slate-100 text-slate-400">+{(task.tags?.length ?? 0) - 2}</span>}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3.5">
                                    {isAdmin && (
                                      <button onClick={() => handleDeleteTask(task.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState onAdd={() => setShowTaskForm(true)} hasFilters={filteredTasks.length !== tasks.length} />
                    )}
                  </div>
                )}

                {/* ── CARD VIEW ───────────────────────────────────────────── */}
                {view === 'board' && (
                  <div className="fade-in">
                    {filteredTasks.length > 0 ? (
                      <div className="space-y-3">
                        {filteredTasks.map(task => (
                          <div key={task.id} className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                            <TaskCard
                              id={task.id} title={task.title} description={task.description ?? undefined}
                              status={task.status} priority={task.priority} dueDate={task.due_date ?? undefined}
                              assignee={task.assignee ? { id: task.assignee.id, name: task.assignee.name || '', email: task.assignee.email || '', avatarUrl: task.assignee.image || undefined } : null}
                              tags={task.tags?.map(t => ({ id: t.id, name: t.name, color: t.color || '' })) ?? []}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200">
                        <EmptyState onAdd={() => setShowTaskForm(true)} hasFilters={filteredTasks.length !== tasks.length} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
              <div className="space-y-4">

                {/* Team Members */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">Team</h2>
                    {isAdmin && (
                      <button onClick={() => router.push(`/projects/team/${projectId}`)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">Manage</button>
                    )}
                  </div>
                  {members.length > 0 ? (
                    <ul className="divide-y divide-slate-50">
                      {members.map(m => (
                        <li key={m.id} className="px-4 py-3 flex items-center gap-3">
                          <Avatar name={m.name} image={m.image} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 truncate">{m.email}</p>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md
                            ${m.role === 'owner' ? 'bg-violet-100 text-violet-700' : m.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {m.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">No members yet</div>
                  )}
                </div>

                {/* Tag Manager */}
                {isAdmin && projectId && typeof projectId === 'string' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h2 className="text-sm font-semibold text-slate-700">Tags</h2>
                    </div>
                    <div className="p-4">
                      <TagManager projectId={projectId} onTagsChange={() => setRefreshTags(p => p + 1)} />
                    </div>
                  </div>
                )}

                {/* Danger zone */}
                {userRole === 'owner' && (
                  <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-red-50">
                      <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-slate-500 mb-3">Deleting this project will permanently remove all tasks and data.</p>
                      <button onClick={handleDeleteProject}
                        className="w-full py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                        Delete Project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd, hasFilters }: { onAdd: () => void; hasFilters: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-slate-600 mb-1">No tasks match your filters</p>
          <p className="text-xs text-slate-400">Try adjusting or clearing your filters</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-600 mb-1">No tasks yet</p>
          <p className="text-xs text-slate-400 mb-4">Get started by creating your first task</p>
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Task
          </button>
        </>
      )}
    </div>
  );
}