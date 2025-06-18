export type DashboardData = {
  projects: Project[];
  recentTasks: Task[];
  upcomingTasks: Task[];
  taskCounts: TaskCounts;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  role: string;
  members: Member[];
  tasks: Task[];
};

export type Member = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  assignee: Member | null;
  creator: Member;
  project: Project;
  tags: Tag[];
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type TaskCounts = {
  total: number;
  completed: number;
  overdue: number;
};
