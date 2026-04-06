import nodemailer from 'nodemailer';

// Email configuration
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email data interface
interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Create a transporter with environment variables
const createTransporter = () => {
  // Default to using environment variables
  const config: EmailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || '',
    },
  };

  return nodemailer.createTransport(config);
};

// Send email function
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: emailData.from || process.env.EMAIL_FROM || 'TeamSync <admin@omnistacks.com>',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${emailData.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Email templates
export const emailTemplates = {
  // Task assignment notification
  taskAssignment: (taskData: {
    taskTitle: string;
    taskId: string;
    projectName: string;
    assignerName: string;
    dueDate?: string;
    taskUrl: string;
  }) => {
    const dueDateInfo = taskData.dueDate 
      ? `<p>Due date: ${new Date(taskData.dueDate).toLocaleDateString()}</p>` 
      : '';
      
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4f46e5;">Task Assigned to You</h2>
        <p>Hello,</p>
        <p>${taskData.assignerName} has assigned you a task in project ${taskData.projectName}.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #111827;">${taskData.taskTitle}</h3>
          ${dueDateInfo}
        </div>
        <p>
          <a href="${taskData.taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from TeamSync. Please do not reply to this email.
        </p>
      </div>
    `;
  },

  // Project invitation notification
  projectInvitation: (data: {
    projectName: string;
    inviterName: string;
    role: string;
    projectUrl: string;
  }) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4f46e5;">Project Invitation</h2>
        <p>Hello,</p>
        <p>${data.inviterName} has added you to the project "${data.projectName}" as a ${data.role}.</p>
        <p>
          <a href="${data.projectUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Project
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from TeamSync. Please do not reply to this email.
        </p>
      </div>
    `;
  },

  // Task due date reminder
  taskDueReminder: (data: {
    taskTitle: string;
    projectName: string;
    dueDate: string;
    taskUrl: string;
  }) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #dc2626;">Task Due Reminder</h2>
        <p>Hello,</p>
        <p>This is a reminder that your task "${data.taskTitle}" in project "${data.projectName}" is due today.</p>
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #b91c1c;">Due date: ${new Date(data.dueDate).toLocaleDateString()}</p>
        </div>
        <p>
          <a href="${data.taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from TeamSync. Please do not reply to this email.
        </p>
      </div>
    `;
  },

  // New comment notification
  newComment: (data: {
    taskTitle: string;
    commenterName: string;
    commentText: string;
    taskUrl: string;
  }) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4f46e5;">New Comment on Task</h2>
        <p>Hello,</p>
        <p>${data.commenterName} commented on the task "${data.taskTitle}":</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4f46e5;">
          <p style="margin: 0; color: #111827;">${data.commentText}</p>
        </div>
        <p>
          <a href="${data.taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Comment
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from TeamSync. Please do not reply to this email.
        </p>
      </div>
    `;
  },
};
