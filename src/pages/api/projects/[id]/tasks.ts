import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  // GET - Fetch all tasks for a project
  if (req.method === "GET") {
    try {
      // First check if user is a member of this project
      const userMembership = await db.projectMember.findFirst({
        where: {
          project_id: projectId,
          user_id: session.user.id,
        },
      });

      if (!userMembership) {
        return res.status(403).json({ error: "You do not have access to this project" });
      }

      // Fetch all tasks for the project with related data
      const tasks = await db.task.findMany({
        where: {
          project_id: projectId,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          task_tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Format the tasks to match the expected structure
      const formattedTasks = tasks.map(task => ({
        ...task,
        tags: task.task_tags.map(tt => tt.tag),
      }));

      return res.status(200).json(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
