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
    return res.status(400).json({ error: "Project ID is required" });
  }

  // GET - Fetch project members
  if (req.method === "GET") {
    try {
      // First check if user is a member of this project using raw SQL
      const userMembership = await db.$queryRaw<Array<{ role: string }>>`
        SELECT role FROM "ProjectMember"
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return res
          .status(403)
          .json({ error: "You don't have access to this project" });
      }

      // Fetch all project members using raw SQL
      type ProjectMember = {
        role: string;
        id: string;
        user_id: string;
        name: string;
        email: string;
        avatar_url: string | null;
      };

      const members = await db.$queryRaw<ProjectMember[]>`
        SELECT pm.role, u.id, pm.user_id, u.name, u.email, u.image as avatar_url
        FROM "ProjectMember" pm
        JOIN "User" u ON pm.user_id = u.id
        WHERE pm.project_id = ${projectId}
      `;

      // Format the response to ensure the id field contains the user_id value
      const formattedMembers = members.map((member) => ({
        role: member.role,
        id: member.user_id, // Use user_id as the id field since that's what the TaskForm expects
        user_id: member.user_id,
        name: member.name,
        email: member.email,
        avatar_url: member.avatar_url,
      }));

      return res.status(200).json(formattedMembers);
    } catch (error) {
      console.error("Error fetching project members:", error);
      return res.status(500).json({ error: "Failed to fetch project members" });
    }
  }

  // POST: Invite a new member
  if (req.method === "POST") {
    try {
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!role || !["owner", "admin", "member"].includes(role)) {
        return res.status(400).json({ error: "Valid role is required" });
      }

      // Check if the current user has permission to invite members
      const userMembership = await db.projectMember.findUnique({
        where: {
          project_id_user_id: {
            project_id: projectId,
            user_id: session.user.id,
          },
        },
      });

      if (!userMembership) {
        return res
          .status(403)
          .json({ error: "You do not have access to this project" });
      }

      if (userMembership.role !== "owner" && userMembership.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only project owners and admins can invite members" });
      }

      // Find the user by email
      const userToInvite = await db.user.findUnique({
        where: {
          email,
        },
      });

      if (!userToInvite) {
        return res
          .status(404)
          .json({ error: `No user found with email ${email}` });
      }

      // Check if user is already a member
      const existingMember = await db.projectMember.findUnique({
        where: {
          project_id_user_id: {
            project_id: projectId,
            user_id: userToInvite.id,
          },
        },
      });

      if (existingMember) {
        return res
          .status(409)
          .json({ error: "This user is already a member of this project" });
      }

      // Add user to project
      await db.projectMember.create({
        data: {
          project_id: projectId,
          user_id: userToInvite.id,
          role,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Successfully invited ${email} to the project`,
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      return res.status(500).json({ error: "Failed to invite member" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
