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
    return res.status(400).json({ error: "Project ID is required" });
  }

  // GET - Fetch project tags
  if (req.method === "GET") {
    try {
      // First check if user is a member of this project using raw SQL
      const userMembership = await db.$queryRaw<Array<{role: string}>>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }

      // Fetch all project tags using raw SQL
      type Tag = {
        id: string;
        name: string;
        color: string;
        project_id: string;
      };
      
      const tags = await db.$queryRaw<Tag[]>`
        SELECT id, name, color, project_id
        FROM "Tag"
        WHERE project_id = ${projectId}
        ORDER BY name ASC
      `;

      return res.status(200).json(tags);
    } catch (error) {
      console.error("Error fetching project tags:", error);
      return res.status(500).json({ error: "Failed to fetch project tags" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
