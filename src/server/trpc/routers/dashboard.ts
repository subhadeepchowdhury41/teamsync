import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const dashboardRouter = router({
  getData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    try {
      // Get projects where user is a member with member count and task count
      const projectMembers = await ctx.db.projectMember.findMany({
        where: {
          user_id: userId,
        },
        include: {
          project: {
            include: {
              members: true,
              tasks: {
                select: {
                  id: true,
                  status: true
                }
              }
            }
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 5, // Limit to 5 recent projects
      });

      const projects = projectMembers.map((member) => ({
        id: member.project.id,
        name: member.project.name,
        description: member.project.description,
        created_at: member.project.created_at.toISOString(),
        role: member.role,
        memberCount: member.project.members.length,
        taskCount: member.project.tasks.length,
        completedTaskCount: member.project.tasks.filter(task => task.status === 'completed').length
      }));

      // Get recent tasks
      const recentTasks = await ctx.db.task.findMany({
        where: {
          OR: [
            { creator_id: userId },
            { assignee_id: userId },
          ],
          project: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
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
          task_tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 5,
      });

      // Get upcoming tasks (due in the next 7 days)
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingTasks = await ctx.db.task.findMany({
        where: {
          assignee_id: userId,
          due_date: {
            gte: today,
            lte: nextWeek,
          },
          status: {
            not: "completed",
          },
          project: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
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
          task_tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: {
          due_date: "asc",
        },
        take: 5,
      });

      // Get task counts
      const totalTasksCount = await ctx.db.task.count({
        where: {
          OR: [
            { creator_id: userId },
            { assignee_id: userId },
          ],
          project: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
      });

      const completedTasksCount = await ctx.db.task.count({
        where: {
          OR: [
            { creator_id: userId },
            { assignee_id: userId },
          ],
          status: "completed",
          project: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
      });

      const overdueTasksCount = await ctx.db.task.count({
        where: {
          assignee_id: userId,
          due_date: {
            lt: today,
          },
          status: {
            not: "completed",
          },
          project: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
      });

      // Format tasks for response
      const formatTask = (task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date?.toISOString() || null,
        created_at: task.created_at.toISOString(),
        updated_at: task.updated_at.toISOString(),
        project: {
          id: task.project.id,
          name: task.project.name,
        },
        creator: {
          id: task.creator.id,
          name: task.creator.name || '',
          email: task.creator.email || '',
          avatar_url: task.creator.image,
        },
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.name || '',
          email: task.assignee.email || '',
          avatar_url: task.assignee.image,
        } : null,
        tags: task.task_tags.map((tt: any) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color,
        })),
      });

      const formattedRecentTasks = recentTasks.map(formatTask);
      const formattedUpcomingTasks = upcomingTasks.map(formatTask);

      return {
        projects,
        recentTasks: formattedRecentTasks,
        upcomingTasks: formattedUpcomingTasks,
        taskCounts: {
          total: totalTasksCount,
          completed: completedTasksCount,
          overdue: overdueTasksCount,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch dashboard data",
      });
    }
  }),
});
