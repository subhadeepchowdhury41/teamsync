import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const taskRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        filter: z.enum(["all", "assigned", "upcoming", "overdue"]).optional().default("all"),
        projectId: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First, get the user's projects if no specific project is selected
        let projectsToQuery: string[] = [];
        
        if (input.projectId) {
          // If a specific project is requested, use that
          projectsToQuery = [input.projectId];
        } else {
          // Otherwise, get all projects the user is a member of
          const userProjects = await ctx.db.projectMember.findMany({
            where: {
              user_id: userId
            },
            select: {
              project_id: true
            }
          });
          
          if (!userProjects || userProjects.length === 0) {
            // If user has no projects, return empty array
            return { tasks: [] };
          }
          
          projectsToQuery = userProjects.map(p => p.project_id);
        }
        
        // Build base query conditions
        const whereConditions: any = {
          project_id: {
            in: projectsToQuery
          }
        };
        
        // Add filter conditions
        if (input.filter === 'assigned') {
          whereConditions.assignee_id = userId;
        } else if (input.filter === 'upcoming') {
          const today = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          
          whereConditions.due_date = {
            gte: today,
            lte: nextWeek
          };
          whereConditions.status = {
            not: 'completed'
          };
        } else if (input.filter === 'overdue') {
          const today = new Date();
          whereConditions.due_date = {
            lt: today
          };
          whereConditions.status = {
            not: 'completed'
          };
        }
        
        // Add status filter if provided
        if (input.status) {
          whereConditions.status = input.status;
        }
        
        // Add priority filter if provided
        if (input.priority) {
          whereConditions.priority = input.priority;
        }
        
        // Fetch tasks using Prisma's type-safe query
        const tasks = await ctx.db.task.findMany({
          where: whereConditions,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            project: {
              select: {
                id: true,
                name: true
              }
            },
            task_tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            }
          },
          orderBy: [
            {
              due_date: 'asc'
            },
            {
              created_at: 'desc'
            }
          ]
        });
        
        // Format tasks for response
        const formattedTasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date?.toISOString() || null,
          project_id: task.project_id,
          creator_id: task.creator_id,
          assignee_id: task.assignee_id,
          created_at: task.created_at.toISOString(),
          updated_at: task.updated_at.toISOString(),
          project: {
            id: task.project_id,
            name: task.project.name
          },
          creator: {
            id: task.creator.id,
            name: task.creator.name || '',
            email: task.creator.email || '',
            avatar_url: task.creator.image
          },
          assignee: task.assignee ? {
            id: task.assignee.id,
            name: task.assignee.name || '',
            email: task.assignee.email || '',
            avatar_url: task.assignee.image
          } : null,
          tags: task.task_tags.map(tt => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color
          }))
        }));

        return { tasks: formattedTasks };
      } catch (error) {
        console.error("Error fetching tasks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tasks",
        });
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        const task = await ctx.db.task.findUnique({
          where: {
            id: input.id,
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
            project: true,
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
        });

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Check if user has access to this task's project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: task.project_id,
            user_id: userId,
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this task",
          });
        }

        // Format task for response
        const formattedTask = {
          ...task,
          created_at: task.created_at.toISOString(),
          updated_at: task.updated_at.toISOString(),
          due_date: task.due_date?.toISOString() || null,
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
          tags: task.task_tags.map(tt => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
        };

        return { task: formattedTask };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch task",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.string().default("todo"),
        priority: z.string().default("medium"),
        dueDate: z.string().optional(),
        projectId: z.string(),
        assigneeId: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First check if user is a member of this project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: userId,
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        
        // Handle due date properly
        let dueDateTime: Date | null = null;
        if (input.dueDate && input.dueDate.trim() !== '') {
          try {
            dueDateTime = new Date(input.dueDate);
          } catch (e) {
            console.error('Invalid due date format:', input.dueDate, e);
          }
        }
        
        // Create the task using Prisma
        const createdTask = await ctx.db.task.create({
          data: {
            title: input.title,
            description: input.description,
            status: input.status,
            priority: input.priority,
            due_date: dueDateTime,
            project_id: input.projectId,
            assignee_id: input.assigneeId || null,
            creator_id: userId,
            task_tags: input.tags && input.tags.length > 0 ? {
              create: input.tags.map((tagId: string) => ({
                tag_id: tagId,
              }))
            } : undefined,
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
        });
        
        // Format the task response
        const formattedTask = {
          ...createdTask,
          created_at: createdTask.created_at.toISOString(),
          updated_at: createdTask.updated_at.toISOString(),
          due_date: createdTask.due_date?.toISOString() || null,
          creator: {
            id: createdTask.creator.id,
            name: createdTask.creator.name || '',
            email: createdTask.creator.email || '',
            avatar_url: createdTask.creator.image,
          },
          assignee: createdTask.assignee ? {
            id: createdTask.assignee.id,
            name: createdTask.assignee.name || '',
            email: createdTask.assignee.email || '',
            avatar_url: createdTask.assignee.image,
          } : null,
          tags: createdTask.task_tags.map(tt => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
        };

        return { task: formattedTask };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create task",
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.string(),
        priority: z.string(),
        dueDate: z.string().optional(),
        assigneeId: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the task to check project access
        const task = await ctx.db.task.findUnique({
          where: {
            id: input.id,
          },
          select: {
            project_id: true,
            creator_id: true,
          },
        });

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Check if user has access to this task's project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: task.project_id,
            user_id: userId,
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this task",
          });
        }

        // Handle due date properly
        let dueDateTime: Date | null = null;
        if (input.dueDate && input.dueDate.trim() !== '') {
          try {
            dueDateTime = new Date(input.dueDate);
          } catch (e) {
            console.error('Invalid due date format:', input.dueDate, e);
          }
        }

        // Update the task
        const updatedTask = await ctx.db.task.update({
          where: {
            id: input.id,
          },
          data: {
            title: input.title,
            description: input.description,
            status: input.status,
            priority: input.priority,
            due_date: dueDateTime,
            assignee_id: input.assigneeId || null,
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
          },
        });

        // Update task tags if provided
        if (input.tags) {
          // First delete existing task tags
          await ctx.db.taskTag.deleteMany({
            where: {
              task_id: input.id,
            },
          });

          // Then create new task tags
          if (input.tags.length > 0) {
            await ctx.db.taskTag.createMany({
              data: input.tags.map((tagId) => ({
                task_id: input.id,
                tag_id: tagId,
              })),
            });
          }
        }

        // Get updated task with tags
        const taskWithTags = await ctx.db.task.findUnique({
          where: {
            id: input.id,
          },
          include: {
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
        });

        // Format the task response
        const formattedTask = {
          ...updatedTask,
          created_at: updatedTask.created_at.toISOString(),
          updated_at: updatedTask.updated_at.toISOString(),
          due_date: updatedTask.due_date?.toISOString() || null,
          creator: {
            id: updatedTask.creator.id,
            name: updatedTask.creator.name || '',
            email: updatedTask.creator.email || '',
            avatar_url: updatedTask.creator.image,
          },
          assignee: updatedTask.assignee ? {
            id: updatedTask.assignee.id,
            name: updatedTask.assignee.name || '',
            email: updatedTask.assignee.email || '',
            avatar_url: updatedTask.assignee.image,
          } : null,
          tags: taskWithTags?.task_tags.map(tt => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })) || [],
        };

        return { task: formattedTask };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update task",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the task to check project access
        const task = await ctx.db.task.findUnique({
          where: {
            id: input.id,
          },
          select: {
            project_id: true,
            creator_id: true,
          },
        });

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Check if user has access to this task's project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: task.project_id,
            user_id: userId,
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this task",
          });
        }

        // Only allow task creator, project owner, or admin to delete tasks
        if (
          task.creator_id !== userId &&
          userMembership.role !== "owner" &&
          userMembership.role !== "admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this task",
          });
        }

        // Delete the task
        await ctx.db.task.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete task",
        });
      }
    }),
});
