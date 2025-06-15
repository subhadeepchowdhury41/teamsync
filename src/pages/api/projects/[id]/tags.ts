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

  // Helper function to check if user is a member with appropriate permissions
  async function checkUserPermissions(requireAdmin = false) {
    try {
      const userMembership = await db.$queryRaw<Array<{role: string}>>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session?.user?.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return { allowed: false, error: "You don't have access to this project" };
      }

      const role = userMembership?.[0]?.role;
      
      // For operations that require admin privileges
      if (requireAdmin && role !== 'owner' && role !== 'admin') {
        return { allowed: false, error: "You don't have permission to perform this action" };
      }

      return { allowed: true };
    } catch (error) {
      console.error("Error checking permissions:", error);
      return { allowed: false, error: "Error checking permissions" };
    }
  }

  // Define Tag type for reuse
  type Tag = {
    id: string;
    name: string;
    color: string;
    project_id: string;
  };

  // GET - Fetch project tags
  if (req.method === "GET") {
    try {
      const permissionCheck = await checkUserPermissions();
      if (!permissionCheck.allowed) {
        return res.status(403).json({ error: permissionCheck.error });
      }
      
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

  // POST - Create a new tag
  if (req.method === "POST") {
    try {
      // Only admins and owners can create tags
      const permissionCheck = await checkUserPermissions(true);
      if (!permissionCheck.allowed) {
        return res.status(403).json({ error: permissionCheck.error });
      }

      const { name, color } = req.body;

      if (!name || !color) {
        return res.status(400).json({ error: "Name and color are required" });
      }

      // Create new tag using Prisma
      const newTag = await db.tag.create({
        data: {
          name,
          color,
          project: { connect: { id: projectId } }
        }
      });

      return res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating tag:", error);
      return res.status(500).json({ error: "Failed to create tag" });
    }
  }

  // PUT - Update a tag
  if (req.method === "PUT") {
    try {
      // Only admins and owners can update tags
      const permissionCheck = await checkUserPermissions(true);
      if (!permissionCheck.allowed) {
        return res.status(403).json({ error: permissionCheck.error });
      }

      const { id, name, color } = req.body;

      if (!id || !name || !color) {
        return res.status(400).json({ error: "Tag ID, name, and color are required" });
      }

      // First verify the tag belongs to this project
      const existingTag = await db.tag.findUnique({
        where: { id }
      });

      if (!existingTag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      if (existingTag.project_id !== projectId) {
        return res.status(403).json({ error: "This tag does not belong to the specified project" });
      }

      // Update the tag
      const updatedTag = await db.tag.update({
        where: { id },
        data: { name, color }
      });

      return res.status(200).json(updatedTag);
    } catch (error) {
      console.error("Error updating tag:", error);
      return res.status(500).json({ error: "Failed to update tag" });
    }
  }

  // DELETE - Delete a tag
  if (req.method === "DELETE") {
    try {
      // Only admins and owners can delete tags
      const permissionCheck = await checkUserPermissions(true);
      if (!permissionCheck.allowed) {
        return res.status(403).json({ error: permissionCheck.error });
      }

      const { tagId } = req.query;

      if (!tagId || typeof tagId !== "string") {
        return res.status(400).json({ error: "Tag ID is required" });
      }

      // First verify the tag belongs to this project
      const existingTag = await db.tag.findUnique({
        where: { id: tagId }
      });

      if (!existingTag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      if (existingTag.project_id !== projectId) {
        return res.status(403).json({ error: "This tag does not belong to the specified project" });
      }

      // First delete all task_tags associations
      await db.$executeRaw`
        DELETE FROM "TaskTag"
        WHERE tag_id = ${tagId}
      `;

      // Then delete the tag
      await db.tag.delete({
        where: { id: tagId }
      });

      return res.status(200).json({ message: "Tag deleted successfully" });
    } catch (error) {
      console.error("Error deleting tag:", error);
      return res.status(500).json({ error: "Failed to delete tag" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
