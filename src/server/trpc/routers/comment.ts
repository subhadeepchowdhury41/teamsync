import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { PrismaClient } from "@prisma/client";

// Type assertion to help TypeScript recognize the Comment model
type PrismaClientWithComment = PrismaClient & {
  comment: {
    findMany: Function;
    findUnique: Function;
    create: Function;
    update: Function;
    delete: Function;
  };
};

export const commentRouter = router({
  // Get all comments for a task
  getByTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the task to check project access
        const task = await ctx.db.task.findUnique({
          where: {
            id: input.taskId,
          },
          select: {
            project_id: true,
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

        // Get comments for this task
        const comments = await (ctx.db as PrismaClientWithComment).comment.findMany({
          where: {
            task_id: input.taskId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        });

        // Format comments for response
        const formattedComments = comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at.toISOString(),
          updated_at: comment.updated_at.toISOString(),
          user: {
            id: comment.user.id,
            name: comment.user.name || "",
            email: comment.user.email || "",
            avatar_url: comment.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || 'User')}`,
          },
        }));

        return { comments: formattedComments };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching comments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments",
        });
      }
    }),

  // Create a new comment
  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the task to check project access
        const task = await ctx.db.task.findUnique({
          where: {
            id: input.taskId,
          },
          select: {
            project_id: true,
            title: true,
            assignee_id: true,
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

        // Create the comment
        const comment = await (ctx.db as PrismaClientWithComment).comment.create({
          data: {
            content: input.content,
            task_id: input.taskId,
            user_id: userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        });

        // Create notification for task assignee if it's not the commenter
        if (task.assignee_id && task.assignee_id !== userId) {
          await ctx.db.notification.create({
            data: {
              type: "comment",
              title: "New comment on task",
              message: `${ctx.session.user.name || "Someone"} commented on task: ${task.title}`,
              user_id: task.assignee_id,
              sender_id: userId,
              read: false,
            },
          });
        }

        // Format comment for response
        const formattedComment = {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at.toISOString(),
          updated_at: comment.updated_at.toISOString(),
          user: {
            id: comment.user.id,
            name: comment.user.name || "",
            email: comment.user.email || "",
            avatar_url: comment.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || 'User')}`,
          },
          task_id: comment.task_id,
        };

        return { comment: formattedComment };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating comment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create comment",
        });
      }
    }),

  // Update a comment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the comment to check ownership
        const comment = await (ctx.db as PrismaClientWithComment).comment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            task: {
              select: {
                project_id: true,
              },
            },
          },
        });

        if (!comment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comment not found",
          });
        }

        // Check if user is the comment author
        if (comment.user_id !== userId) {
          // If not the author, check if user is a project admin or owner
          const userMembership = await ctx.db.projectMember.findFirst({
            where: {
              project_id: comment.task.project_id,
              user_id: userId,
              role: { in: ["owner", "admin"] },
            },
          });

          if (!userMembership) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this comment",
            });
          }
        }

        // Update the comment
        const updatedComment = await (ctx.db as PrismaClientWithComment).comment.update({
          where: {
            id: input.id,
          },
          data: {
            content: input.content,
            updated_at: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        });

        // Format comment for response
        const formattedComment = {
          id: updatedComment.id,
          content: updatedComment.content,
          created_at: updatedComment.created_at.toISOString(),
          updated_at: updatedComment.updated_at.toISOString(),
          user: {
            id: updatedComment.user.id,
            name: updatedComment.user.name || "",
            email: updatedComment.user.email || "",
            avatar_url: updatedComment.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedComment.user.name || 'User')}`,
          },
          task_id: updatedComment.task_id,
        };

        return { comment: formattedComment };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating comment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update comment",
        });
      }
    }),

  // Delete a comment
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the comment to check ownership
        const comment = await (ctx.db as PrismaClientWithComment).comment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            task: {
              select: {
                project_id: true,
              },
            },
          },
        });

        if (!comment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comment not found",
          });
        }

        // Check if user is the comment author
        if (comment.user_id !== userId) {
          // If not the author, check if user is a project admin or owner
          const userMembership = await ctx.db.projectMember.findFirst({
            where: {
              project_id: comment.task.project_id,
              user_id: userId,
              role: { in: ["owner", "admin"] },
            },
          });

          if (!userMembership) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to delete this comment",
            });
          }
        }

        // Delete the comment
        await (ctx.db as PrismaClientWithComment).comment.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting comment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete comment",
        });
      }
    }),
});
