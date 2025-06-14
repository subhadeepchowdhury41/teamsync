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

  // GET - Fetch project details with user role
  if (req.method === "GET") {
    try {
      // Define types for our SQL query results
      type UserMembership = {
        role: string;
      };
      
      type Project = {
        id: string;
        name: string;
        description: string | null;
        creator_id: string;
        created_at: string;
        updated_at: string;
      };
      
      // Check if user is a member of this project using raw SQL
      const userMembership = await db.$queryRaw<UserMembership[]>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You do not have access to this project" });
      }

      // Fetch project details using raw SQL
      const projects = await db.$queryRaw<Project[]>`
        SELECT * FROM "Project" WHERE id = ${projectId}
      `;

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Make sure we have valid data before returning
      if (!projects[0] || !userMembership[0]?.role) {
        return res.status(500).json({ error: "Failed to fetch complete project data" });
      }
      
      return res.status(200).json({
        project: projects[0],
        userRole: userMembership[0].role,
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      return res.status(500).json({ error: "Failed to fetch project" });
    }
  }

  // PUT - Update project details
  if (req.method === "PUT") {
    try {
      // Define types for our SQL query results
      type UserMembership = {
        role: string;
      };
      
      type Project = {
        id: string;
        name: string;
        description: string | null;
        creator_id: string;
        created_at: string;
        updated_at: string;
      };
      
      // Check if user has permission to update project using raw SQL
      const userMembership = await db.$queryRaw<UserMembership[]>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
        AND role IN ('owner', 'admin')
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "You do not have permission to update this project" });
      }

      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      
      const now = new Date().toISOString();

      // Update project using raw SQL
      await db.$executeRaw`
        UPDATE "Project"
        SET name = ${name},
            description = ${description || null},
            updated_at = ${now}::timestamp
        WHERE id = ${projectId}
      `;
      
      // Fetch the updated project
      const updatedProject = await db.$queryRaw<Project[]>`
        SELECT * FROM "Project" WHERE id = ${projectId}
      `;

      return res.status(200).json(updatedProject[0]);
    } catch (error) {
      console.error("Error updating project:", error);
      return res.status(500).json({ error: "Failed to update project" });
    }
  }

  // DELETE - Delete project
  if (req.method === "DELETE") {
    try {
      // Define types for our SQL query results
      type UserMembership = {
        role: string;
      };
      
      // Check if user is the owner of the project using raw SQL
      const userMembership = await db.$queryRaw<UserMembership[]>`
        SELECT role FROM "ProjectMember" 
        WHERE project_id = ${projectId} 
        AND user_id = ${session.user.id}
        AND role = 'owner'
      `;

      if (!userMembership || userMembership.length === 0) {
        return res.status(403).json({ error: "Only the project owner can delete this project" });
      }

      // Delete the project using raw SQL
      // Note: We rely on database CASCADE constraints to handle deleting related data
      
      // First delete all task tags associated with tasks in this project
      await db.$executeRaw`
        DELETE FROM "TaskTag"
        WHERE task_id IN (
          SELECT id FROM "Task" WHERE project_id = ${projectId}
        )
      `;
      
      // Then delete all tasks in this project
      await db.$executeRaw`
        DELETE FROM "Task" WHERE project_id = ${projectId}
      `;
      
      // Delete all tags in this project
      await db.$executeRaw`
        DELETE FROM "Tag" WHERE project_id = ${projectId}
      `;
      
      // Delete all project members
      await db.$executeRaw`
        DELETE FROM "ProjectMember" WHERE project_id = ${projectId}
      `;
      
      // Finally delete the project itself
      await db.$executeRaw`
        DELETE FROM "Project" WHERE id = ${projectId}
      `;

      return res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      return res.status(500).json({ error: "Failed to delete project" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
