import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/server/db";
import { z } from "zod";

interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  project: { id: string; name: string } | null;
  creator_id: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  assignee_id: string | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

const getByIdInput = z.object({
  id: z.string().uuid(),
});

export const tasksRouter = router({
  getById: protectedProcedure
    .input(getByIdInput)
    .query(async ({ ctx, input }): Promise<{ task: TaskResponse }> => {
      const userId = ctx.session.user.id;
      
      try {
        const task = await db.$queryRaw<{ id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; project_id: string; project_name: string | null; creator_id: string; creator_name: string | null; creator_email: string | null; creator_avatar: string | null; assignee_id: string | null; assignee_name: string | null; assignee_email: string | null; assignee_avatar: string | null; created_at: string; updated_at: string }[]>`
          SELECT t.*, 
                 creator.name as creator_name, creator.email as creator_email, creator.image as creator_avatar,
                 assignee.name as assignee_name, assignee.email as assignee_email, assignee.image as assignee_avatar,
                 p.name as project_name
          FROM "Task" t
          LEFT JOIN "User" creator ON t.creator_id = creator.id
          LEFT JOIN "User" assignee ON t.assignee_id = assignee.id
          LEFT JOIN "Project" p ON t.project_id = p.id
          WHERE t.id = ${input.id}
            AND (t.creator_id = ${userId} 
              OR t.assignee_id = ${userId}
              OR EXISTS (
                SELECT 1 FROM "ProjectMember" pm 
                WHERE pm.project_id = t.project_id 
                AND pm.user_id = ${userId}
              ))
        `;

        if (!task || task.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found or unauthorized",
          });
        }

        const taskTags = await db.$queryRaw<{ task_id: string; tag_id: string; name: string; color: string }[]>`
          SELECT tt.task_id, t.id as tag_id, t.name, t.color
          FROM "TaskTag" tt
          JOIN "Tag" t ON tt.tag_id = t.id
          WHERE tt.task_id = ${input.id}
        `;

        return {
          task: {
            id: task[0]?.id || '',
            title: task[0]?.title || '',
            description: task[0]?.description || '',
            status: task[0]?.status || 'pending',
            priority: task[0]?.priority || 'normal',
            due_date: task[0]?.due_date || null,
            project_id: task[0]?.project_id || '',
            project: task[0]?.project_name ? { 
              id: task[0].project_id || '', 
              name: task[0].project_name || '' 
            } : null,
            creator_id: task[0]?.creator_id || '',
            creator: {
              id: task[0]?.creator_id || '',
              name: task[0]?.creator_name || '',
              email: task[0]?.creator_email || '',
              avatar_url: task[0]?.creator_avatar || null
            },
            assignee_id: task[0]?.assignee_id || null,
            assignee: task[0]?.assignee_id ? {
              id: task[0].assignee_id || '',
              name: task[0].assignee_name || '',
              email: task[0].assignee_email || '',
              avatar_url: task[0].assignee_avatar || null
            } : null,
            created_at: task[0]?.created_at || '',
            updated_at: task[0]?.updated_at || '',
            tags: taskTags?.map((tt) => ({
              id: tt.tag_id,
              name: tt.name,
              color: tt.color
            })) || []
          }
        };
      } catch (error) {
        console.error("Error fetching task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch task details",
        });
      }
    }),
});
