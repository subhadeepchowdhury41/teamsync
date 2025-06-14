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

  // GET - Fetch tasks
  if (req.method === "GET") {
    const { projectId, filter, status, priority } = req.query;
    try {
      // First, get the user's projects if no specific project is selected
      let projectsToQuery: string[] = [];
      
      if (projectId && typeof projectId === 'string') {
        // If a specific project is requested, use that
        projectsToQuery = [projectId];
      } else {
        // Otherwise, get all projects the user is a member of
        const userProjects = await db.projectMember.findMany({
          where: {
            user_id: session.user.id
          },
          select: {
            project_id: true
          }
        });
        
        if (!userProjects || userProjects.length === 0) {
          // If user has no projects, return empty array
          return res.status(200).json({ tasks: [] });
        }
        
        projectsToQuery = userProjects.map(p => p.project_id);
      }
      
      // Build base query conditions
      const whereConditions: any = {
        project_id: {
          in: projectsToQuery
        }
      };
      
      // Add filter conditions
      if (filter === 'assigned') {
        whereConditions.assignee_id = session.user.id;
      } else if (filter === 'upcoming') {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        whereConditions.due_date = {
          gte: today,
          lte: nextWeek
        };
        whereConditions.status = {
          not: 'completed'
        };
      } else if (filter === 'overdue') {
        const today = new Date();
        whereConditions.due_date = {
          lt: today
        };
        whereConditions.status = {
          not: 'completed'
        };
      }
      
      // Add status filter if provided
      if (status && typeof status === 'string') {
        whereConditions.status = status;
      }
      
      // Add priority filter if provided
      if (priority && typeof priority === 'string') {
        whereConditions.priority = priority;
      }
      
      // Fetch tasks using Prisma's type-safe query
      const tasks = await db.task.findMany({
        where: whereConditions,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          project: {
            select: {
              name: true
            }
          },
          task_tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          }
        },
        orderBy: [
          {
            due_date: 'asc'
          },
          {
            created_at: 'desc'
          }
        ]
      });
      
      // Format tasks for response
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date?.toISOString() || null,
        project_id: task.project_id,
        creator_id: task.creator_id,
        assignee_id: task.assignee_id,
        created_at: task.created_at.toISOString(),
        updated_at: task.updated_at.toISOString(),
        project_name: task.project.name,
        creator: {
          id: task.creator.id,
          name: task.creator.name,
          email: task.creator.email,
          avatar_url: task.creator.image
        },
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.name,
          email: task.assignee.email,
          avatar_url: task.assignee.image
        } : null,
        tags: task.task_tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color
        }))
      }));

      return res.status(200).json({ tasks: formattedTasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  // POST - Create task
  if (req.method === "POST") {
    const { title, description, status, priority, dueDate, projectId, assigneeId, tags } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: "Title and project ID are required" });
    }

    try {
      // First check if user is a member of this project
      const userMembership = await db.projectMember.findFirst({
        where: {
          project_id: projectId,
          user_id: session.user.id
        },
        select: {
          role: true
        }
      });

      if (!userMembership) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
      
      // Handle due date properly
      let dueDateTime: Date | null = null;
      if (dueDate && dueDate.trim() !== '') {
        try {
          dueDateTime = new Date(dueDate);
          console.log('Due date being set:', dueDate, '->', dueDateTime);
        } catch (e) {
          console.error('Invalid due date format:', dueDate, e);
        }
      }
      
      // Create the task using Prisma
      const createdTask = await db.task.create({
        data: {
          title,
          description,
          status: status || 'todo',
          priority: priority || 'medium',
          due_date: dueDateTime,
          project_id: projectId,
          assignee_id: assigneeId || null,
          creator_id: session.user.id,
          task_tags: tags && tags.length > 0 ? {
            create: tags.map((tagId: string) => ({
              tag_id: tagId
            }))
          } : undefined
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          task_tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          }
        }
      });
      
      // Format the task response
      const formattedTask = {
        id: createdTask.id,
        title: createdTask.title,
        description: createdTask.description,
        status: createdTask.status,
        priority: createdTask.priority,
        due_date: createdTask.due_date?.toISOString() || null,
        project_id: createdTask.project_id,
        creator_id: createdTask.creator_id,
        assignee_id: createdTask.assignee_id,
        created_at: createdTask.created_at.toISOString(),
        updated_at: createdTask.updated_at.toISOString(),
        creator: {
          id: createdTask.creator.id,
          name: createdTask.creator.name || '',
          email: createdTask.creator.email || '',
          avatar_url: createdTask.creator.image
        },
        assignee: createdTask.assignee ? {
          id: createdTask.assignee.id,
          name: createdTask.assignee.name || '',
          email: createdTask.assignee.email || '',
          avatar_url: createdTask.assignee.image
        } : null,
        tags: createdTask.task_tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color
        }))
      };

      return res.status(201).json(formattedTask);
    } catch (error) {
      console.error("Error creating task:", error);
      return res.status(500).json({ error: "Failed to create task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}