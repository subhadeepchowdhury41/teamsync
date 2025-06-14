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

  const { id: projectId, userId } = req.query;

  if (!projectId || typeof projectId !== 'string' || !userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Project ID and User ID are required' });
  }

  // Check if the current user has permission to manage members
  const userMembership = await db.projectMember.findUnique({
    where: {
      project_id_user_id: {
        project_id: projectId,
        user_id: session.user.id,
      },
    },
  });

  if (!userMembership) {
    return res.status(403).json({ error: 'You do not have access to this project' });
  }

  // Get the target member's current role
  const targetMember = await db.projectMember.findUnique({
    where: {
      project_id_user_id: {
        project_id: projectId,
        user_id: userId,
      },
    },
  });

  if (!targetMember) {
    return res.status(404).json({ error: 'Member not found in this project' });
  }

  // PATCH: Update member role
  if (req.method === 'PATCH') {
    try {
      const { role } = req.body;

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required' });
      }

      // Only owners and admins can change roles
      if (userMembership.role !== 'owner' && userMembership.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to change roles' });
      }

      // Owner cannot be demoted
      if (targetMember.role === 'owner') {
        return res.status(403).json({ error: 'The project owner role cannot be changed' });
      }

      // Admin cannot change other admin's role
      if (userMembership.role === 'admin' && targetMember.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot change other admin roles' });
      }

      // Update the role
      await db.projectMember.update({
        where: {
          project_id_user_id: {
            project_id: projectId,
            user_id: userId,
          },
        },
        data: {
          role,
        },
      });

      return res.status(200).json({ success: true, message: 'Member role updated successfully' });
    } catch (error) {
      console.error('Error updating member role:', error);
      return res.status(500).json({ error: 'Failed to update member role' });
    }
  }

  // DELETE: Remove member from project
  if (req.method === 'DELETE') {
    try {
      // Only owners and admins can remove members
      if (userMembership.role !== 'owner' && userMembership.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to remove members' });
      }

      // Owner cannot be removed
      if (targetMember.role === 'owner') {
        return res.status(403).json({ error: 'The project owner cannot be removed' });
      }

      // Admin cannot remove other admins
      if (userMembership.role === 'admin' && targetMember.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot remove other admins' });
      }

      // Remove the member
      await db.projectMember.delete({
        where: {
          project_id_user_id: {
            project_id: projectId,
            user_id: userId,
          },
        },
      });

      return res.status(200).json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
