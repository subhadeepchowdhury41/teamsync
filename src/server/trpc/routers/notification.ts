import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/server/db-serverless";

export const notificationRouter = router({
  // Get all notifications for the current user
  getAll: protectedProcedure
    .input(
      z.object({
        read: z.boolean().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Build query filters
      const where = {
        user_id: userId,
        ...(input.read !== undefined ? { read: input.read } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
      };

      // Get notifications from database with user info for sender
      const notifications = await ctx.db.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Transform to match the frontend expected format
      return notifications.map((notification: any) => ({
        ...notification,
        created_at: notification.created_at.toISOString(),
        updated_at: notification.updated_at.toISOString(),
        sender: notification.sender
          ? {
              id: notification.sender.id,
              name: notification.sender.name || '',
              email: notification.sender.email || '',
              avatar_url: notification.sender.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender.name || 'User')}`,
            }
          : null,
      }));
    }),

  // Mark a notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Update the notification in the database
        await db.notification.updateMany({
          where: {
            id: input.id,
            user_id: userId,
          },
          data: {
            read: true,
            updated_at: new Date(),
          },
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
          cause: error,
        });
      }
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      // Update all notifications for the user
      await db.notification.updateMany({
        where: {
          user_id: userId,
          read: false,
        },
        data: {
          read: true,
          updated_at: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to mark all notifications as read",
        cause: error,
      });
    }
  }),

  // Get unread notification count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      // Count unread notifications
      const count = await db.notification.count({
        where: {
          user_id: userId,
          read: false,
        },
      });

      return { count };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get unread notification count",
        cause: error,
      });
    }
  }),

  // Delete a notification
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Delete the notification
        const result = await db.notification.deleteMany({
          where: {
            id: input.id,
            user_id: userId,
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notification not found",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete notification",
          cause: error,
        });
      }
    }),
});
