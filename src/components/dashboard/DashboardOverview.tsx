import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { api } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus   = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  low:    { label: 'Low',    color: 'text-slate-400',  icon: '↓'  },
  medium: { label: 'Medium', color: 'text-amber-500',  icon: '→'  },
  high:   { label: 'High',   color: 'text-orange-500', icon: '↑'  },
  urgent: { label: 'Urgent', color: 'text-red-500',    icon: '↑↑' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; accent: string }> = {
  todo:        { label: 'To Do',       dot: '#94a3b8', accent: 'bg-slate-100 text-slate-600'   },
  in_progress: { label: 'In Progress', dot: '#3b82f6', accent: 'bg-blue-50 text-blue-700'     },
  review:      { label: 'Review',      dot: '#f59e0b', accent: 'bg-amber-50 text-amber-700'   },
  completed:   { label: 'Done',        dot: '#10b981', accent: 'bg-emerald-50 text-emerald-700'},
};

// ─── Mini-components ──────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img className="h-7 w-7 rounded-full object-cover ring-1 ring-white flex-shrink-0" src={url} alt={name} />;
  return (
    <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center ring-1 ring-white flex-shrink-0">
      <span className="text-[10px] font-semibold text-white">{name?.charAt(0).toUpperCase() ?? '?'}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as TaskStatus] ?? STATUS_CONFIG.todo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.accent}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function DueLabel({ due }: { due: string | null }) {
  if (!due) return null;
  const d    = new Date(due);
  const now  = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const isOverdue = diff < 0 && true;
  const text = isOverdue
    ? `${Math.abs(diff)}d overdue`
    : diff === 0
    ? 'Due today'
    : diff === 1
    ? 'Due tomorrow'
    : `${diff}d left`;
  return (
    <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : diff <= 2 ? 'text-amber-500' : 'text-slate-400'}`}>
      {text}
    </span>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: any }) {
  const pri = PRIORITY_CONFIG[task.priority as TaskPriority];
  return (
    <Link href={`/tasks/${task.id}/edit`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
        {task.project && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{task.project.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.tags?.slice(0, 1).map((tag: any) => (
          <span key={tag.id} className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: `${tag.color}20`, color: tag.color }}>{tag.name}</span>
        ))}
        <span className={`text-[11px] font-semibold ${pri.color} hidden sm:inline`}>{pri.icon} {pri.label}</span>
        <StatusPill status={task.status} />
        <DueLabel due={task.due_date} />
        {task.assignee && <Avatar name={task.assignee.name ?? ''} url={task.assignee.avatar_url} />}
      </div>
    </Link>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: any }) {
  const pct = project.taskCount > 0
    ? Math.round((project.completedTaskCount / project.taskCount) * 100)
    : 0;
  return (
    <Link href={`/projects/${project.id}`}
      className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-150 p-5 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{project.name}</p>
          {project.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          {project.memberCount}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400">{project.completedTaskCount}/{project.taskCount} tasks</span>
          <span className="text-[11px] font-semibold text-indigo-500">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 capitalize">{project.role.replace('_', ' ')}</span>
        <span className="text-[11px] font-medium text-indigo-500 group-hover:underline">View →</span>
      </div>
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const { data: session } = useSession();
  const user = session?.user;

  const { data: dashboardData, isLoading, error } = api.dashboard.getData.useQuery(undefined, {
    enabled: !!user,
  });

  const {
    projects     = [],
    recentTasks  = [],
    upcomingTasks = [],
    taskCounts   = { total: 0, completed: 0, overdue: 0 },
  } = dashboardData || {};

  const pendingCount    = taskCounts.total - taskCounts.completed;
  const completionPct   = taskCounts.total > 0 ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-9 w-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-center text-sm text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Tasks',
      value: taskCounts.total,
      sub: `${completionPct}% complete`,
      accent: 'bg-indigo-50 text-indigo-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: taskCounts.completed,
      sub: 'tasks done',
      accent: 'bg-emerald-50 text-emerald-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: pendingCount,
      sub: 'in progress / to do',
      accent: 'bg-amber-50 text-amber-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Overdue',
      value: taskCounts.overdue,
      sub: 'need attention',
      accent: 'bg-red-50 text-red-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Overview</p>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's on your plate today.</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={`${s.accent} rounded-xl p-2.5 flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium truncate">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800 leading-tight">{s.value}</p>
              <p className="text-[11px] text-slate-400 truncate">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Overall progress bar ────────────────────────────────── */}
      {taskCounts.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Overall Progress</p>
            <span className="text-sm font-bold text-indigo-600">{completionPct}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-slate-400">{taskCounts.completed} completed</span>
            <span className="text-[11px] text-slate-400">{taskCounts.total} total</span>
          </div>
        </div>
      )}

      {/* ── Projects ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Projects</p>
            <h2 className="text-base font-bold text-slate-800">Your Projects</h2>
          </div>
          <Link href="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            View all →
          </Link>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {projects.map((project: any) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-400 mb-3">You don't have any projects yet.</p>
            <Link href="/projects/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Link>
          </div>
        )}
      </div>

      {/* ── Tasks ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Activity</p>
              <h2 className="text-sm font-bold text-slate-800">Recent Tasks</h2>
            </div>
            <Link href="/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              View all →
            </Link>
          </div>

          {recentTasks.length > 0 ? (
            <div className="divide-y divide-slate-50 px-2 py-1">
              {recentTasks.map((task: any) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">No recent tasks.</div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-0.5">Deadlines</p>
              <h2 className="text-sm font-bold text-slate-800">Upcoming</h2>
            </div>
            <Link href="/tasks?filter=upcoming" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              View all →
            </Link>
          </div>

          {upcomingTasks.length > 0 ? (
            <div className="divide-y divide-slate-50 px-2 py-1">
              {upcomingTasks.map((task: any) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">No upcoming deadlines.</div>
          )}
        </div>
      </div>
    </div>
  );
}
