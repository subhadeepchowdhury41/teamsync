import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { PrismaClient } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET - Fetch all projects the user is a member of
  if (req.method === "GET") {
    try {
      // Define the project type with proper types for count fields
      type ProjectWithRole = {
        id: string;
        name: string;
        description: string | null;
        creator_id: string;
        created_at: string;
        updated_at: string;
        role: string;
        memberCount: bigint;
        taskCount: bigint;
        completedTaskCount: bigint;
      };
      
      // Find all projects where the user is a member with task and member counts
      const projectsWithStats = await db.$queryRaw<ProjectWithRole[]>`
        SELECT 
          p.id, 
          p.name, 
          p.description, 
          p.creator_id, 
          p.created_at, 
          p.updated_at, 
          pm.role,
          (SELECT COUNT(*) FROM "ProjectMember" WHERE project_id = p.id) as "memberCount",
          (SELECT COUNT(*) FROM "Task" WHERE project_id = p.id) as "taskCount",
          (SELECT COUNT(*) FROM "Task" WHERE project_id = p.id AND status = 'completed') as "completedTaskCount"
        FROM "Project" p
        JOIN "ProjectMember" pm ON p.id = pm.project_id
        WHERE pm.user_id = ${session.user.id}
        ORDER BY p.updated_at DESC
      `;

      // Convert BigInt values to numbers before sending the response
      const serializedProjects = projectsWithStats.map(project => ({
        ...project,
        memberCount: Number(project.memberCount),
        taskCount: Number(project.taskCount),
        completedTaskCount: Number(project.completedTaskCount)
      }));

      return res.status(200).json({ projects: serializedProjects });
    } catch (error) {
      console.error("Error fetching projects:", error);
      return res.status(500).json({ error: "Failed to fetch projects" });
    }
  }

  // POST - Create a new project
  if (req.method === "POST") {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    try {
      // Create the project with a transaction to ensure both operations succeed
      const project = await db.$transaction(async (prisma) => {
        // Create the project
        const newProject = await prisma.project.create({
          data: {
            name,
            description: description || null,
            creator_id: session.user.id,
          },
        });

        // Add the creator as a project member with owner role
        await prisma.projectMember.create({
          data: {
            project_id: newProject.id,
            user_id: session.user.id,
            role: 'owner',
          },
        });

        return newProject;
      });

      return res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: "Failed to create project" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
