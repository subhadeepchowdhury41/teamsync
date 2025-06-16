import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db-serverless";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  // GET - Fetch all project data including members and tasks
  if (req.method === "GET") {
    try {
      // Use raw SQL query to check if user is a member of this project
      const userMembership = await db.$queryRaw<Array<{ role: string }>>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
      `;

      if (
        !userMembership ||
        (Array.isArray(userMembership) && userMembership.length === 0)
      ) {
        return res
          .status(403)
          .json({ error: "You do not have access to this project" });
      }

      // Safely extract the role from the query result
      const userRole =
        Array.isArray(userMembership) &&
        userMembership.length > 0 &&
        userMembership[0]
          ? (userMembership[0].role)
          : "member";

      // Use raw SQL query to fetch project details
      const projects = await db.$queryRaw`
        SELECT * FROM "Project" 
        WHERE id = ${projectId}
      `;

      if (!projects || (Array.isArray(projects) && projects.length === 0)) {
        return res.status(404).json({ error: "Project not found" });
      }

      const project = Array.isArray(projects) ? projects[0] : projects;

      // Use raw SQL query to fetch project members
      const members = await db.$queryRaw`
        SELECT pm.role, u.id, u.name, u.email, u.image as avatar_url
        FROM "ProjectMember" pm
        JOIN "User" u ON pm.user_id = u.id
        WHERE pm.project_id = ${projectId}
      `;

      // Use raw SQL query to fetch tasks with assignees
      const tasks = await db.$queryRaw`
        SELECT t.*, 
               creator.name as creator_name, creator.email as creator_email, creator.image as creator_avatar,
               assignee.name as assignee_name, assignee.email as assignee_email, assignee.image as assignee_avatar
        FROM "Task" t
        LEFT JOIN "User" creator ON t.creator_id = creator.id
        LEFT JOIN "User" assignee ON t.assignee_id = assignee.id
        WHERE t.project_id = ${projectId}
        ORDER BY t.created_at DESC
      `;

      // Format tasks to include assignee and creator objects
      const formattedTasks = Array.isArray(tasks)
        ? tasks.map((task: any) => ({
            ...task,
            assignee: task.assignee_id
              ? {
                  id: task.assignee_id,
                  name: task.assignee_name,
                  email: task.assignee_email,
                  avatar_url: task.assignee_avatar,
                }
              : null,
            creator: {
              id: task.creator_id,
              name: task.creator_name,
              email: task.creator_email,
              avatar_url: task.creator_avatar,
            },
          }))
        : [];

      // Use raw SQL query to fetch task tags
      const taskTags = await db.$queryRaw`
        SELECT tt.task_id, t.id as tag_id, t.name, t.color
        FROM "TaskTag" tt
        JOIN "Tag" t ON tt.tag_id = t.id
        WHERE t.project_id = ${projectId}
        `;

      // Add tags to tasks
      const tasksWithTags = formattedTasks.map((task: any) => {
        const tags = Array.isArray(taskTags)
          ? taskTags
              .filter((tt: any) => tt.task_id === task.id)
              .map((tt: any) => ({
                id: tt.tag_id,
                name: tt.name,
                color: tt.color,
              }))
          : [];
        return { ...task, tags };
      });

      // Helper function to convert BigInt values to numbers
      console.log(tasksWithTags);
      const serializeBigInt = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }

        if (typeof obj === "bigint") {
          return Number(obj);
        }

        if (Array.isArray(obj)) {
          return obj.map(serializeBigInt);
        }

        if (typeof obj === "object") {
          if (obj instanceof Date) {
            return obj.toISOString();
          }
          const result: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              result[key] = serializeBigInt(obj[key]);
            }
          }
          return result;
        }

        return obj;
      };

      // Serialize all data to handle BigInt values
      return res.status(200).json({
        project: serializeBigInt(project),
        userRole,
        members: serializeBigInt(members),
        tasks: serializeBigInt(tasksWithTags),
      });
    } catch (error) {
      console.error("Error fetching project data:", error);
      return res.status(500).json({ error: "Failed to fetch project data" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
