import { NextApiRequest, NextApiResponse } from 'next';
import { getServerAuthSession } from '@/server/auth';
import { db } from '@/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSession({ req, res });

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    // Fetch user's projects (limited to 4)
    const projectMembers = await db.projectMember.findMany({
      where: {
        user_id: userId,
      },
      include: {
        project: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 4,
    });

    const projects = await Promise.all(
      projectMembers.map(async (member) => {
        // Get member count for each project
        const memberCount = await db.projectMember.count({
          where: {
            project_id: member.project_id,
          },
        });

        // Get task counts for each project
        const taskCount = await db.task.count({
          where: {
            project_id: member.project_id,
          },
        });

        const completedTaskCount = await db.task.count({
          where: {
            project_id: member.project_id,
            status: 'completed',
          },
        });

        return {
          ...member.project,
          memberCount,
          taskCount,
          completedTaskCount,
        };
      })
    );

    // Fetch recent tasks assigned to user (limited to 5)
    const recentTasks = await db.task.findMany({
      where: {
        assignee_id: userId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 5,
    });

    // Fetch upcoming tasks (due in the next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingTasks = await db.task.findMany({
      where: {
        assignee_id: userId,
        due_date: {
          gte: today,
          lte: nextWeek,
        },
        NOT: {
          status: 'completed',
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        due_date: 'asc',
      },
      take: 5,
    });

    // Fetch task counts
    const allTasks = await db.task.findMany({
      where: {
        assignee_id: userId,
      },
      select: {
        status: true,
      },
    });

    const taskCounts = {
      total: allTasks.length,
      completed: allTasks.filter(task => task.status === 'completed').length,
      inProgress: allTasks.filter(task => task.status === 'in_progress').length,
      todo: allTasks.filter(task => task.status === 'todo').length,
    };

    return res.status(200).json({
      projects,
      recentTasks,
      upcomingTasks,
      taskCounts,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
