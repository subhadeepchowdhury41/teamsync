import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/server/auth';
import { db } from '@/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // Check authentication
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  // Check if user has access to this project
  const userMembership = await db.projectMember.findUnique({
    where: {
      project_id_user_id: {
        project_id: id,
        user_id: session.user.id,
      },
    },
  });

  if (!userMembership) {
    return res.status(403).json({ error: 'You do not have access to this project' });
  }

  // GET: Fetch project details
  if (req.method === 'GET') {
    try {
      const project = await db.project.findUnique({
        where: {
          id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  // PATCH: Update project details
  if (req.method === 'PATCH') {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      // Only owners and admins can update projects
      if (userMembership.role !== 'owner' && userMembership.role !== 'admin') {
        return res.status(403).json({ error: 'Only project owners and admins can update project details' });
      }

      const updatedProject = await db.project.update({
        where: {
          id,
        },
        data: {
          name,
          description,
          updated_at: new Date(),
        },
      });

      return res.status(200).json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // DELETE: Delete project
  if (req.method === 'DELETE') {
    try {
      // Only owners can delete projects
      if (userMembership.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can delete projects' });
      }

      // Delete the project (cascade delete should handle members and tasks)
      await db.project.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
