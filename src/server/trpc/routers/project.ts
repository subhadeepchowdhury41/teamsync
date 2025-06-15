import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

// Member role validation schema
const memberRoleSchema = z.enum(['owner', 'admin', 'member']);

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  memberCount: z.number(),
  taskCount: z.number(),
  completedTaskCount: z.number(),
});

export const projectRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    try {
      // Get projects where user is a member
      const projectMembers = await ctx.db.projectMember.findMany({
        where: {
          user_id: userId,
        },
        include: {
          project: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      const projects = await Promise.all(
        projectMembers.map(async (member) => {
          // Get member count for each project
          const memberCount = await ctx.db.projectMember.count({
            where: {
              project_id: member.project_id,
            },
          });

          // Get task counts for each project
          const taskCount = await ctx.db.task.count({
            where: {
              project_id: member.project_id,
            },
          });

          const completedTaskCount = await ctx.db.task.count({
            where: {
              project_id: member.project_id,
              status: "completed",
            },
          });

          return {
            ...member.project,
            memberCount,
            taskCount,
            completedTaskCount,
            role: member.role,
          };
        })
      );

      return { projects };
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch projects",
      });
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const projects = await ctx.db.project.findMany({
        where: {
          members: {
            some: {
              user_id: userId,
            },
          },
        },
        include: {
          members: {
            select: {
              user_id: true,
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      const formattedProjects = projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        memberCount: project.members.length,
        taskCount: project.tasks.length,
        completedTaskCount: project.tasks.filter(
          (task) => task.status === "completed",
        ).length,
      }));

      return projectSchema.array().parse(formattedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch projects",
      });
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id: projectId } = input;

      try {
        // Check if user is a member of this project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: projectId,
            user_id: userId,
          },
          select: {
            role: true,
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }

        // Get project details
        const project = await ctx.db.project.findUnique({
          where: {
            id: projectId,
          },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Get project members
        const members = await ctx.db.projectMember.findMany({
          where: {
            project_id: projectId,
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

        // Get project tasks
        const tasks = await ctx.db.task.findMany({
          where: {
            project_id: projectId,
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
          orderBy: {
            created_at: "desc",
          },
        });

        // Format tasks to include tags properly
        const formattedTasks = tasks.map((task) => ({
          ...task,
          tags: task.task_tags.map((tt) => ({
            id: tt.tag.id,
            name: tt.tag.name,
            color: tt.tag.color,
          })),
        }));

        // Format members
        const formattedMembers = members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatar_url: member.user.image,
          role: member.role,
        }));

        return {
          project,
          userRole: userMembership.role,
          members: formattedMembers,
          tasks: formattedTasks,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching project data:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project data",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        const project = await ctx.db.project.create({
          data: {
            name: input.name,
            description: input.description || "",
            creator_id: userId, // Using creator_id instead of created_by to match schema
            members: {
              create: {
                user_id: userId,
                role: "owner",
              },
            },
          },
        });

        return { project };
      } catch (error) {
        console.error("Error creating project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // Check if user has permission to update this project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.id,
            user_id: userId,
            role: {
              in: ["owner", "admin"],
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this project",
          });
        }

        const project = await ctx.db.project.update({
          where: {
            id: input.id,
          },
          data: {
            name: input.name,
            description: input.description,
          },
        });

        return { project };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // Check if user is the owner of this project
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.id,
            user_id: userId,
            role: "owner",
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project owners can delete projects",
          });
        }

        // Delete the project
        await ctx.db.project.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete project",
        });
      }
    }),
    
  // Member management procedures
  addMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: memberRoleSchema.default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // Check if user has permission to add members
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: userId,
            role: { in: ["owner", "admin"] },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to add members to this project",
          });
        }

        // Check if project exists
        const project = await ctx.db.project.findUnique({
          where: { id: input.projectId },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Find user by email
        const userToAdd = await ctx.db.user.findUnique({
          where: { email: input.email },
        });

        if (!userToAdd) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Check if user is already a member
        const existingMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: userToAdd.id,
          },
        });

        if (existingMembership) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this project",
          });
        }

        // Don't allow adding someone as owner if there's already an owner
        if (input.role === "owner") {
          const existingOwner = await ctx.db.projectMember.findFirst({
            where: {
              project_id: input.projectId,
              role: "owner",
            },
          });

          if (existingOwner && existingOwner.user_id !== userId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This project already has an owner",
            });
          }
        }

        // Add user to project
        const newMember = await ctx.db.projectMember.create({
          data: {
            project_id: input.projectId,
            user_id: userToAdd.id,
            role: input.role,
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

        return {
          member: {
            id: newMember.user.id,
            name: newMember.user.name,
            email: newMember.user.email,
            avatar_url: newMember.user.image,
            role: newMember.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error adding project member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add member to project",
        });
      }
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
        role: memberRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;
      
      try {
        // Check if current user has permission to update roles
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: currentUserId,
            role: "owner", // Only owners can change roles
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project owners can update member roles",
          });
        }

        // Check if target user is a member
        const targetMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: input.userId,
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

        if (!targetMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User is not a member of this project",
          });
        }

        // Don't allow changing own role if owner
        if (input.userId === currentUserId && userMembership.role === "owner" && input.role !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot change your own owner role",
          });
        }

        // Update member role
        const updatedMember = await ctx.db.projectMember.update({
          where: {
            project_id_user_id: {
              project_id: input.projectId,
              user_id: input.userId,
            },
          },
          data: {
            role: input.role,
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

        return {
          member: {
            id: updatedMember.user.id,
            name: updatedMember.user.name,
            email: updatedMember.user.email,
            avatar_url: updatedMember.user.image,
            role: updatedMember.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating member role:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update member role",
        });
      }
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;
      
      try {
        // Check if current user has permission to remove members
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: currentUserId,
            role: { in: ["owner", "admin"] },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to remove members from this project",
          });
        }

        // Check if target user is a member
        const targetMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: input.userId,
          },
        });

        if (!targetMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User is not a member of this project",
          });
        }

        // Don't allow removing owner unless you are the owner
        if (targetMembership.role === "owner" && userMembership.role !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only owners can remove other owners",
          });
        }

        // Don't allow owners to remove themselves (they should transfer ownership first)
        if (input.userId === currentUserId && targetMembership.role === "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Owners cannot remove themselves from the project",
          });
        }

        // Remove member from project
        await ctx.db.projectMember.delete({
          where: {
            project_id_user_id: {
              project_id: input.projectId,
              user_id: input.userId,
            },
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error removing project member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member from project",
        });
      }
    }),
});
