const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter
const createTransporter = () => {
  // For development, you can use ethereal email (fake SMTP service)
  // For production, use real SMTP service (Gmail, SendGrid, etc.)
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
  });
};
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASSWORD?.length);

// Send email for password setup
const sendPasswordSetupEmail = async (to, username, token, fullName) => {
  try {
    const transporter = createTransporter();
    
    // Create password setup link
    const setupLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/set-password?token=${token}`;
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'SWP391 System'}" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Setup Your Password - SWP391 System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
            .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials { background: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SWP391 System</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Your account has been created successfully! Here are your login credentials:</p>
              
              <div class="credentials">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Temporary Access:</strong> Click the button below to set your password</p>
              </div>
              
              <p>Please click the button below to set your password:</p>
              <center>
                <a href="${setupLink}" class="button">Set My Password</a>
              </center>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Or copy and paste this link in your browser:<br>
                <a href="${setupLink}">${setupLink}</a>
              </p>
              
              <p style="color: #d9534f; margin-top: 30px;">
                <strong>Important:</strong> This link will expire in 24 hours for security reasons.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; 2026 SWP391 Warehouse Management System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, username, newPassword, fullName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'SWP391 System'}" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Password Reset - SWP391 System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
            .credentials { background: #fff; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Your password has been reset by an administrator.</p>
              
              <div class="credentials">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Temporary Password:</strong> ${newPassword}</p>
              </div>
              
              <p style="color: #d9534f;">
                <strong>Important:</strong> Please change your password after logging in.
              </p>
              
              <p>You can log in at: <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login">${process.env.CLIENT_URL || 'http://localhost:3000'}/login</a></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; 2026 SWP391 Warehouse Management System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordSetupEmail,
  sendPasswordResetEmail
};
