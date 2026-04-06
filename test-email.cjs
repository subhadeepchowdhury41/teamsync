// Test SMTP Configuration by sending a test email
// Usage: node test-email.js [recipient_email]

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

// Email configuration from environment variables
const config = {
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
};

// Create transporter
const transporter = nodemailer.createTransport(config);

console.log("FROM: ", process.env.EMAIL_FROM);

// Get recipient email from command line or use a default
const recipientEmail = process.argv[2] || 'subhadeepchowdhury41@gmail.com';

// Email content
const mailOptions = {
  from:  'TeamSync <admin@omnistacks.com>',
  to: recipientEmail,
  subject: 'TeamSync SMTP Test Email',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4f46e5;">SMTP Configuration Test</h2>
      <p>Hello,</p>
      <p>This is a test email to verify that your SMTP configuration is working correctly.</p>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #111827;">Configuration Details:</h3>
        <p><strong>Host:</strong> ${config.host}</p>
        <p><strong>Port:</strong> ${config.port}</p>
        <p><strong>Secure:</strong> ${config.secure}</p>
        <p><strong>User:</strong> ${config.auth.user}</p>
      </div>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        This is an automated test message from TeamSync. Please do not reply to this email.
      </p>
    </div>
  `,
};

// Function to send test email
async function sendTestEmail() {
  console.log('Sending test email to:', recipientEmail);
  console.log('Using SMTP configuration:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    // Password is hidden for security
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Execute the test
sendTestEmail()
  .then(success => {
    if (success) {
      console.log('SMTP test completed successfully!');
    } else {
      console.log('SMTP test failed. Please check your configuration.');
    }
    process.exit(success ? 0 : 1);
  });
