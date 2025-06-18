import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const tagRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // Check if user is a member of this project
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

        // Get all tags for this project
        const tags = await ctx.db.tag.findMany({
          where: {
            project_id: input.projectId,
          },
          orderBy: {
            name: "asc",
          },
        });

        return { tags };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching project tags:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project tags",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#3B82F6"), // Default blue color
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // Check if user has permission to add tags (owner or admin)
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: input.projectId,
            user_id: userId,
            role: {
              in: ["owner", "admin"],
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to add tags to this project",
          });
        }

        // Check if tag with same name already exists in this project
        const existingTag = await ctx.db.tag.findFirst({
          where: {
            project_id: input.projectId,
            name: {
              equals: input.name,
              mode: "insensitive", // Case insensitive
            },
          },
        });

        if (existingTag) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A tag with this name already exists in this project",
          });
        }

        // Create the tag
        const tag = await ctx.db.tag.create({
          data: {
            name: input.name,
            color: input.color,
            project_id: input.projectId,
          },
        });

        return { tag };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating tag:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tag",
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        color: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the tag to check project access
        const tag = await ctx.db.tag.findUnique({
          where: {
            id: input.id,
          },
          select: {
            project_id: true,
          },
        });

        if (!tag) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tag not found",
          });
        }

        // Check if user has permission to update tags (owner or admin)
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: tag.project_id,
            user_id: userId,
            role: {
              in: ["owner", "admin"],
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update tags in this project",
          });
        }

        // Check if tag with same name already exists in this project
        const existingTag = await ctx.db.tag.findFirst({
          where: {
            project_id: tag.project_id,
            name: {
              equals: input.name,
              mode: "insensitive", // Case insensitive
            },
            id: {
              not: input.id, // Exclude current tag
            },
          },
        });

        if (existingTag) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A tag with this name already exists in this project",
          });
        }

        // Update the tag
        const updatedTag = await ctx.db.tag.update({
          where: {
            id: input.id,
          },
          data: {
            name: input.name,
            color: input.color,
          },
        });

        return { tag: updatedTag };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating tag:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tag",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      try {
        // First get the tag to check project access
        const tag = await ctx.db.tag.findUnique({
          where: {
            id: input.id,
          },
          select: {
            project_id: true,
          },
        });

        if (!tag) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tag not found",
          });
        }

        // Check if user has permission to delete tags (owner or admin)
        const userMembership = await ctx.db.projectMember.findFirst({
          where: {
            project_id: tag.project_id,
            user_id: userId,
            role: {
              in: ["owner", "admin"],
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete tags in this project",
          });
        }

        // Delete the tag
        await ctx.db.tag.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting tag:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tag",
        });
      }
    }),
});
