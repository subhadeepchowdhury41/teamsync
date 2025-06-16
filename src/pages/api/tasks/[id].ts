import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db-serverless";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Task ID is required" });
  }

  // GET - Fetch a single task
  if (req.method === "GET") {
    try {
      // Define the task type
      type TaskWithUsers = {
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        due_date: string | null;
        project_id: string;
        creator_id: string;
        assignee_id: string | null;
        created_at: string;
        updated_at: string;
        creator_name: string;
        creator_email: string;
        creator_avatar: string | null;
        assignee_name: string | null;
        assignee_email: string | null;
        assignee_avatar: string | null;
      };
      
      // Fetch task with related data
      const task = await db.$queryRaw<TaskWithUsers[]>`
        SELECT t.*, 
               creator.name as creator_name, creator.email as creator_email, creator.image as creator_avatar,
               assignee.name as assignee_name, assignee.email as assignee_email, assignee.image as assignee_avatar
        FROM "Task" t
        LEFT JOIN "User" creator ON t.creator_id = creator.id
        LEFT JOIN "User" assignee ON t.assignee_id = assignee.id
        WHERE t.id = ${id}
      `;

      if (!task || task.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Fetch task tags
      const taskTags = await db.$queryRaw`
        SELECT tt.task_id, t.id as tag_id, t.name, t.color
        FROM "TaskTag" tt
        JOIN "Tag" t ON tt.tag_id = t.id
        WHERE tt.task_id = ${id}
      `;
      
      // Format the task response
      // First, convert the task data to a plain object to handle PostgreSQL types
      const plainTaskData = JSON.parse(JSON.stringify(task[0]));
      
      // Convert tags to plain objects
      const plainTags = Array.isArray(taskTags) ? JSON.parse(JSON.stringify(taskTags)) : [];
      
      const formattedTask = {
        ...plainTaskData,
        assignee: plainTaskData.assignee_id ? {
          id: plainTaskData.assignee_id,
          name: plainTaskData.assignee_name || '',
          email: plainTaskData.assignee_email || '',
          avatar_url: plainTaskData.assignee_avatar
        } : null,
        creator: {
          id: plainTaskData.creator_id,
          name: plainTaskData.creator_name || '',
          email: plainTaskData.creator_email || '',
          avatar_url: plainTaskData.creator_avatar
        },
        tags: plainTags.map((tt: any) => ({
          id: tt.tag_id,
          name: tt.name,
          color: tt.color
        }))
      };

      return res.status(200).json(formattedTask);
    } catch (error) {
      console.error("Error fetching task:", error);
      return res.status(500).json({ error: "Failed to fetch task" });
    }
  }

  // PUT - Update a task
  if (req.method === "PUT") {
    const { title, description, status, priority, dueDate, projectId, assigneeId, tags } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: "Title and project ID are required" });
    }

    try {
      // First check if the task exists
      const existingTask = await db.$queryRaw<Array<{creator_id: string, project_id: string}>>`
        SELECT creator_id, project_id FROM "Task" WHERE id = ${id}
      `;

      if (!existingTask || existingTask.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Check if user is a member of this project
      const userMembership = await db.$queryRaw<Array<{role: string}>>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${existingTask[0]?.project_id} 
        AND user_id = ${session.user.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }

      // Check if user is creator or has admin/owner role in the project
      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      const userRole = userMembership[0]?.role || "member";
      const isCreator = existingTask[0]?.creator_id === session.user.id;
      const canEdit = isCreator || userRole === "owner" || userRole === "admin";

      if (!canEdit) {
        return res.status(403).json({ error: "You don't have permission to update this task" });
      }

      // Update the task using raw SQL
      const now = new Date().toISOString();
      const dueDateTime = dueDate ? new Date(dueDate).toISOString() : null;
      
      await db.$executeRaw`
        UPDATE "Task"
        SET title = ${title},
            description = ${description},
            status = ${status},
            priority = ${priority},
            due_date = ${dueDateTime}::timestamp,
            project_id = ${projectId},
            assignee_id = ${assigneeId || null},
            updated_at = ${now}::timestamp
        WHERE id = ${id}
      `;

      // Update tags if provided
      if (tags) {
        // Delete existing tag associations
        await db.$executeRaw`
          DELETE FROM "TaskTag" WHERE task_id = ${id}
        `;

        // Create new tag associations
        if (tags.length > 0) {
          for (const tagId of tags) {
            await db.$executeRaw`
              INSERT INTO "TaskTag" (task_id, tag_id, created_at)
              VALUES (${id}, ${tagId}, ${now}::timestamp)
            `;
          }
        }
      }

      // Fetch the updated task with all its details
      type TaskWithUsers = {
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        due_date: string | null;
        project_id: string;
        creator_id: string;
        assignee_id: string | null;
        created_at: string;
        updated_at: string;
        creator_name: string;
        creator_email: string;
        creator_avatar: string | null;
        assignee_name: string | null;
        assignee_email: string | null;
        assignee_avatar: string | null;
      };
      
      const task = await db.$queryRaw<TaskWithUsers[]>`
        SELECT t.*, 
               creator.name as creator_name, creator.email as creator_email, creator.image as creator_avatar,
               assignee.name as assignee_name, assignee.email as assignee_email, assignee.image as assignee_avatar
        FROM "Task" t
        LEFT JOIN "User" creator ON t.creator_id = creator.id
        LEFT JOIN "User" assignee ON t.assignee_id = assignee.id
        WHERE t.id = ${id}
      `;
      
      if (!task || task.length === 0) {
        return res.status(404).json({ error: "Task not found after update" });
      }
      
      return res.status(200).json(task[0]);
    } catch (error) {
      console.error("Error updating task:", error);
      return res.status(500).json({ error: "Failed to update task" });
    }
  }

  // DELETE - Delete a task
  if (req.method === "DELETE") {
    try {
      // First check if the task exists
      const existingTask = await db.$queryRaw<Array<{creator_id: string, project_id: string}>>`
        SELECT creator_id, project_id FROM "Task" WHERE id = ${id}
      `;

      if (!existingTask || existingTask.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Check if user is a member of this project
      const userMembership = await db.$queryRaw<Array<{role: string}>>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${existingTask[0]?.project_id} 
        AND user_id = ${session.user.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }

      // Check if user is creator or has admin/owner role in the project
      // We already checked if userMembership exists above, so this check is redundant
      // if (!userMembership || userMembership.length === 0) {
      //   return res.status(403).json({ error: "You don't have access to this project" });
      // }
      
      const userRole = userMembership[0]?.role || "member";
      const isCreator = existingTask[0]?.creator_id === session.user.id;
      const canDelete = isCreator || userRole === "owner" || userRole === "admin";

      if (!canDelete) {
        return res.status(403).json({ error: "You don't have permission to delete this task" });
      }

      // Delete task tags first
      await db.$executeRaw`
        DELETE FROM "TaskTag" WHERE task_id = ${id}
      `;

      // Delete the task
      await db.$executeRaw`
        DELETE FROM "Task" WHERE id = ${id}
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      return res.status(500).json({ error: "Failed to delete task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
