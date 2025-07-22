import { sendEmail, emailTemplates } from "./emailService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Base URL for the application
const getAppBaseUrl = () => {
  return process.env.API_URL || "http://localhost:3000";
};

// Notification service
export const notificationService = {
  // Send task assignment notification
  async sendTaskAssignmentNotification(
    taskId: string,
    assignerId: string,
  ): Promise<boolean> {
    try {
      // Get task details with related data
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: true,
          creator: true,
          project: true,
        },
      });

      if (!task || !task.assignee || !task.assignee.email) {
        console.error(
          "Cannot send task assignment notification: Missing task or assignee data",
        );
        return false;
      }

      // Get assigner details (might be different from creator)
      const assigner = await prisma.user.findUnique({
        where: { id: assignerId },
      });

      if (!assigner) {
        console.error(
          "Cannot send task assignment notification: Missing assigner data",
        );
        return false;
      }

      // Generate task URL
      const taskUrl = `${getAppBaseUrl()}/tasks/${taskId}`;

      // Send email to assignee
      return await sendEmail({
        to: task.assignee.email,
        subject: `[TeamSync] Task assigned to you: ${task.title}`,
        html: emailTemplates.taskAssignment({
          taskTitle: task.title,
          taskId: task.id,
          projectName: task.project.name,
          assignerName: assigner.name || "A team member",
          dueDate: task.due_date?.toISOString(),
          taskUrl,
        }),
      });
    } catch (error) {
      console.error("Error sending task assignment notification:", error);
      return false;
    }
  },

  // Send project invitation notification
  async sendProjectInvitationNotification(
    projectId: string,
    userId: string,
    inviterId: string,
    role: string,
  ): Promise<boolean> {
    try {
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Get inviter details
      const inviter = await prisma.user.findUnique({
        where: { id: inviterId },
      });

      if (!project || !user || !user.email || !inviter) {
        console.error("Cannot send project invitation: Missing data");
        return false;
      }

      // Generate project URL
      const projectUrl = `${getAppBaseUrl()}/projects/${projectId}`;

      // Send email to the invited user
      return await sendEmail({
        to: user.email,
        subject: `[TeamSync] You've been added to ${project.name}`,
        html: emailTemplates.projectInvitation({
          projectName: project.name,
          inviterName: inviter.name || "A team member",
          role,
          projectUrl,
        }),
      });
    } catch (error) {
      console.error("Error sending project invitation notification:", error);
      return false;
    }
  },

  // Send task due date reminder
  async sendTaskDueReminder(taskId: string): Promise<boolean> {
    try {
      // Get task details with related data
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: true,
          project: true,
        },
      });

      if (!task || !task.assignee || !task.assignee.email || !task.due_date) {
        console.error("Cannot send due date reminder: Missing task data");
        return false;
      }

      // Generate task URL
      const taskUrl = `${getAppBaseUrl()}/tasks/${taskId}`;

      // Send email to assignee
      return await sendEmail({
        to: task.assignee.email,
        subject: `[TeamSync] Reminder: Task "${task.title}" is due today`,
        html: emailTemplates.taskDueReminder({
          taskTitle: task.title,
          projectName: task.project.name,
          dueDate: task.due_date.toISOString(),
          taskUrl,
        }),
      });
    } catch (error) {
      console.error("Error sending task due reminder:", error);
      return false;
    }
  },

  // Send new comment notification
  async sendNewCommentNotification(
    commentId: string,
    commenterId: string,
  ): Promise<boolean> {
    try {
      // Get comment details with related data
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          task: {
            include: {
              assignee: true,
              creator: true,
            },
          },
          user: true,
        },
      });

      if (!comment || !comment.task) {
        console.error("Cannot send comment notification: Missing comment data");
        return false;
      }

      console.log(comment);

      const task = comment.task;
      const commenter = comment.user;

      // Determine recipients (task creator and assignee, excluding commenter)
      const recipients = [];

      if (
        task.creator &&
        task.creator.email &&
        task.creator.id !== commenterId
      ) {
        recipients.push(task.creator.email);
      }

      if (
        task.assignee &&
        task.assignee.email &&
        task.assignee.id !== commenterId &&
        (!task.creator || task.creator.id !== task.assignee.id)
      ) {
        recipients.push(task.assignee.email);
      }

      if (recipients.length === 0) {
        console.log("No recipients for comment notification");
        return true; // No need to send notification
      }

      // Generate task URL
      const taskUrl = `${getAppBaseUrl()}/tasks/${task.id}`;

      // Send email to all recipients
      const results = await Promise.all(
        recipients.map((recipient) =>
          sendEmail({
            to: recipient,
            subject: `[TeamSync] New comment on task "${task.title}"`,
            html: emailTemplates.newComment({
              taskTitle: task.title,
              commenterName: commenter.name || "A team member",
              commentText: comment.content,
              taskUrl,
            }),
          }),
        ),
      );

      // Return true if at least one email was sent successfully
      return results.some((result) => result);
    } catch (error) {
      console.error("Error sending comment notification:", error);
      return false;
    }
  },

  // Check for tasks due today and send reminders
  async sendDueDateReminders(): Promise<number> {
    try {
      // Get today's date (start and end)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find tasks due today
      const dueTasks = await prisma.task.findMany({
        where: {
          due_date: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            not: "completed",
          },
        },
        include: {
          assignee: true,
        },
      });

      console.log(`Found ${dueTasks.length} tasks due today`);

      // Send reminders for each task
      let sentCount = 0;
      for (const task of dueTasks) {
        if (task.assignee?.email) {
          const sent = await this.sendTaskDueReminder(task.id);
          if (sent) sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error("Error sending due date reminders:", error);
      return 0;
    }
  },
};
