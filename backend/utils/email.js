const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@learnhub.com';
    this.fromName = 'LearnHub';
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message
      });
      throw error;
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Welcome email for new users
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to LearnHub!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to LearnHub!</h1>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining LearnHub! We're excited to help you on your learning journey.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            With LearnHub, you can:
          </p>
          
          <ul style="color: #666; line-height: 1.8; margin-bottom: 30px;">
            <li>Access thousands of courses from expert instructors</li>
            <li>Learn at your own pace with lifetime access</li>
            <li>Earn certificates to showcase your skills</li>
            <li>Join a community of millions of learners</li>
          </ul>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/courses" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Start Learning Now
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team at 
            <a href="mailto:support@learnhub.com" style="color: #667eea;">support@learnhub.com</a>
          </p>
        </div>
        
        <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 LearnHub. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Email verification
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const subject = 'Verify your LearnHub account';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #333;">Hi ${user.firstName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Please click the button below to verify your email address and activate your LearnHub account.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            This link will expire in 24 hours for security reasons.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Password reset email
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = 'Reset your LearnHub password';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #333;">Hi ${user.firstName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Course enrollment confirmation
  async sendEnrollmentConfirmation(user, course) {
    const subject = `You're enrolled in ${course.title}!`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Enrollment Confirmed!</h1>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #333;">Hi ${user.firstName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Congratulations! You've successfully enrolled in <strong>${course.title}</strong>.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 30px 0;">
            <h3 style="color: #333; margin-top: 0;">Course Details:</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Title:</strong> ${course.title}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Instructor:</strong> ${course.instructor}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Duration:</strong> ${course.duration}</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Start Learning
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            You now have lifetime access to this course. Happy learning!
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  // Course completion certificate
  async sendCertificateEmail(user, course, certificateUrl) {
    const subject = `Congratulations! You've completed ${course.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ffc107; padding: 40px 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">🎉 Congratulations!</h1>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #333;">Hi ${user.firstName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Congratulations on completing <strong>${course.title}</strong>! Your dedication to learning is inspiring.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${certificateUrl}" 
               style="background: #ffc107; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Download Certificate
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Share your achievement on social media and add this certificate to your LinkedIn profile to showcase your new skills.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Keep learning and exploring new courses to continue your professional development!
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;