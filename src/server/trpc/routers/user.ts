import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

// Define the input schema for base64 image upload
const imageUploadSchema = z.object({
  image: z.string().min(1),
  filename: z.string().min(1),
});

export const userRouter = router({
  // Get current user information
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    try {
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.image,
        email_verified: user.emailVerified ? true : false,
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user information",
      });
    }
  }),

  // Search for users by name or email
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const userId = ctx.session.user.id;

      try {
        const users = await ctx.db.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
            id: { not: userId }, // Exclude the current user
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
          take: limit,
        });

        return users.map((user) => ({
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          avatar_url: user.image,
        }));
      } catch (error) {
        console.error("Error searching users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search users",
        });
      }
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { name, image } = input;

      try {
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: {
            name: name,
            image: image,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        return {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar_url: updatedUser.image,
        };
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user profile",
        });
      }
    }),

  // Get user by ID (for viewing other user profiles)
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;

      try {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          avatar_url: user.image,
        };
      } catch (error) {
        console.error("Error fetching user by ID:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user information",
        });
      }
    }),

  // Get projects for the current user
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
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

      return {
        projects: projectMembers.map((member) => ({
          id: member.project.id,
          name: member.project.name,
          description: member.project.description,
          created_at: member.project.created_at.toISOString(),
          role: member.role,
        })),
      };
    } catch (error) {
      console.error("Error fetching user projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user projects",
      });
    }
  }),

  // Upload avatar image
  uploadAvatar: protectedProcedure
    .input(imageUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { image } = input;
      
      try {
        // For base64 images, we'd typically upload to a storage service
        // For this implementation, we'll just store the image URL directly
        
        // In a real implementation, you would:
        // 1. Decode the base64 image
        // 2. Upload to S3 or another storage service
        // 3. Get the URL of the uploaded image
        // 4. Store that URL in the database
        
        // For now, we'll assume the image is already a URL or base64 data
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: {
            image: image,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        return {
          id: updatedUser.id,
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          avatar_url: updatedUser.image,
        };
      } catch (error) {
        console.error("Error uploading avatar:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload avatar",
        });
      }
    }),
});
