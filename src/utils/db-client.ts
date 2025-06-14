/**
 * Database client utility for TeamSync
 * This replaces the Supabase client with direct Prisma calls
 */

import { db } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { PrismaClient } from "@prisma/client";

// Type assertion to help TypeScript understand our Prisma models
const prisma = db as any;

/**
 * Get the current user's session
 */
export async function getCurrentUser(req: any, res: any) {
  const session = await getServerSession(req, res, authOptions);
  return session?.user;
}

/**
 * Project related database operations
 */
export const projects = {
  /**
   * Get all projects where the user is a member
   */
  async getByUserId(userId: string) {
    return prisma.projectMember.findMany({
      where: {
        user_id: userId,
      },
      include: {
        project: true,
      },
    });
  },

  /**
   * Get a project by ID
   */
  async getById(projectId: string) {
    return prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });
  },

  /**
   * Create a new project
   */
  async create(data: {
    name: string;
    description: string;
    ownerId: string;
  }) {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        creator_id: data.ownerId,
      },
    });

    // Add the creator as an admin member
    await prisma.projectMember.create({
      data: {
        project_id: project.id,
        user_id: data.ownerId,
        role: "admin",
      },
    });

    return project;
  },

  /**
   * Update a project
   */
  async update(projectId: string, data: {
    name?: string;
    description?: string;
  }) {
    return prisma.project.update({
      where: {
        id: projectId,
      },
      data: data,
    });
  },

  /**
   * Delete a project
   */
  async delete(projectId: string) {
    return prisma.project.delete({
      where: {
        id: projectId,
      },
    });
  },
};

/**
 * Project members related database operations
 */
export const projectMembers = {
  /**
   * Get all members of a project
   */
  async getByProjectId(projectId: string) {
    return prisma.projectMember.findMany({
      where: {
        project_id: projectId,
      },
      include: {
        user: true,
      },
    });
  },

  /**
   * Get a specific member of a project
   */
  async getByUserAndProjectId(userId: string, projectId: string) {
    return prisma.projectMember.findFirst({
      where: {
        user_id: userId,
        project_id: projectId,
      },
    });
  },

  /**
   * Add a member to a project
   */
  async create(data: {
    projectId: string;
    userId: string;
    role: string;
  }) {
    return prisma.projectMember.create({
      data: {
        project_id: data.projectId,
        user_id: data.userId,
        role: data.role,
      },
    });
  },

  /**
   * Update a member's role
   */
  async updateRole(data: {
    projectId: string;
    userId: string;
    role: string;
  }) {
    return prisma.projectMember.update({
      where: {
        project_id_user_id: {
          project_id: data.projectId,
          user_id: data.userId,
        },
      },
      data: {
        role: data.role,
      },
    });
  },

  /**
   * Remove a member from a project
   */
  async delete(projectId: string, userId: string) {
    return prisma.projectMember.delete({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId,
        },
      },
    });
  },
};

/**
 * Tasks related database operations
 */
export const tasks = {
  /**
   * Get all tasks for a project
   */
  async getByProjectId(projectId: string) {
    return prisma.task.findMany({
      where: {
        project_id: projectId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  },

  /**
   * Get tasks assigned to a user
   */
  async getByAssigneeId(userId: string) {
    return prisma.task.findMany({
      where: {
        assignee_id: userId,
      },
      include: {
        project: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  },

  /**
   * Get a task by ID
   */
  async getById(taskId: string) {
    return prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });
  },

  /**
   * Create a new task
   */
  async create(data: {
    title: string;
    description: string;
    status: string;
    priority: string;
    projectId: string;
    creatorId: string;
    assigneeId?: string;
    dueDate?: Date;
  }) {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        project_id: data.projectId,
        creator_id: data.creatorId,
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
      },
    });
  },

  /**
   * Update a task
   */
  async update(taskId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: Date;
  }) {
    return prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
      },
    });
  },

  /**
   * Delete a task
   */
  async delete(taskId: string) {
    return prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  },
};

/**
 * Users related database operations
 */
export const users = {
  /**
   * Get a user by ID
   */
  async getById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  },

  /**
   * Get a user by email
   */
  async getByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  /**
   * Update a user's profile
   */
  async updateProfile(userId: string, data: {
    name?: string;
    image?: string;
  }) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  },
};
