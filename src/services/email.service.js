import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Email Service
 * 
 * Supports multiple email providers:
 * - Brevo HTTP API (recommended for Render - no SMTP restrictions)
 * - SMTP (Gmail, Mailtrap, etc.)
 * - Development mode (console logging)
 * 
 * Environment Variables:
 * - EMAIL_PROVIDER: 'brevo-api' | 'smtp' | 'console' (default: auto-detect)
 * - BREVO_API_KEY: Brevo API key (for brevo-api provider)
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password or app password
 * - SMTP_FROM: Default sender email
 * - SMTP_FROM_NAME: Default sender name
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.provider = 'console'; // 'brevo-api' | 'smtp' | 'console'
    this.brevoApiKey = process.env.BREVO_API_KEY || '';
    this.init();
  }

  /**
   * Initialize the email service
   */
  init() {
    const { email } = config;
    const explicitProvider = process.env.EMAIL_PROVIDER;

    // Determine provider
    if (explicitProvider) {
      this.provider = explicitProvider;
    } else if (this.brevoApiKey) {
      this.provider = 'brevo-api';
    } else if (email.host && email.user && email.pass) {
      this.provider = 'smtp';
    } else {
      this.provider = 'console';
    }

    // Initialize based on provider
    if (this.provider === 'brevo-api') {
      this.isConfigured = true;
      console.log('📧 Email service configured with Brevo HTTP API');
    } else if (this.provider === 'smtp') {
      this.initSmtpTransporter();
    } else {
      console.log('📧 Email service running in DEVELOPMENT mode (console logging only)');
      console.log('   To enable email: set BREVO_API_KEY or SMTP_* environment variables');
      this.isConfigured = false;
    }
  }

  /**
   * Initialize SMTP transporter
   */
  initSmtpTransporter() {
    const { email } = config;

    try {
      this.transporter = nodemailer.createTransport({
        host: email.host,
        port: email.port,
        secure: email.port === 465,
        auth: {
          user: email.user,
          pass: email.pass,
        },
        ...(email.host.includes('gmail') && {
          service: 'gmail',
        }),
        // Connection timeout settings
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      this.isConfigured = true;
      console.log(`📧 Email service configured with SMTP: ${email.host}`);
    } catch (error) {
      console.error('❌ Failed to configure SMTP transporter:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send email via Brevo HTTP API
   */
  async sendViaBrevoApi({ to, subject, text, html }) {
    const { email } = config;
    
    const payload = {
      sender: {
        name: email.fromName || 'Stylio',
        email: email.from || 'noreply@stylio.app',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      console.log(`📧 Email sent to ${to} via Brevo API: ${data.messageId}`);
      return { success: true, messageId: data.messageId, mode: 'brevo-api' };
    } catch (error) {
      console.error(`❌ Brevo API error for ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} options.html - HTML body
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail({ to, subject, text, html }) {
    const { email } = config;
    const from = `"${email.fromName}" <${email.from}>`;

    // Console/Development mode - log to console
    if (this.provider === 'console' || !this.isConfigured) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL (Development Mode)');
      console.log('='.repeat(60));
      console.log(`From: ${from}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('-'.repeat(60));
      console.log(text || html);
      console.log('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: `dev-${Date.now()}`,
        mode: 'development' 
      };
    }

    // Brevo HTTP API (recommended for Render)
    if (this.provider === 'brevo-api') {
      return this.sendViaBrevoApi({ to, subject, text, html });
    }

    // SMTP
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return { 
        success: true, 
        messageId: info.messageId,
        mode: 'smtp' 
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send OTP verification email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} userName - User's name
   */
  async sendOtpEmail(email, otp, userName = 'User') {
    const subject = `Your Stylio Verification Code: ${otp}`;
    
    const text = `
Hello ${userName},

Your verification code is: ${otp}

This code will expire in ${config.otp.expiresMinutes} minutes.

If you didn't request this code, please ignore this email.

Best regards,
The Stylio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✨ Stylio</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Beauty & Salon Booking App</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">Hello ${userName}! 👋</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          You requested a verification code for your Stylio account. Here's your code:
        </p>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
          <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
          <h1 style="color: #ffffff; margin: 0; font-size: 42px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
        </div>
        
        <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">
          ⏱️ This code expires in <strong>${config.otp.expiresMinutes} minutes</strong>
        </p>
        
        <p style="color: #888; font-size: 14px; margin: 0;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Stylio. All rights reserved.<br>
          This is an automated email, please do not reply.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send booking confirmation email
   * @param {string} email - Recipient email
   * @param {Object} booking - Booking details
   */
  async sendBookingConfirmation(email, booking) {
    const { salonName, bookingNumber, date, time, services, totalAmount } = booking;
    
    const subject = `Booking Confirmed! #${bookingNumber} - Stylio`;
    
    const serviceList = services.map(s => `• ${s.name}`).join('\n');
    
    const text = `
Your booking is confirmed!

Booking Number: #${bookingNumber}
Salon: ${salonName}
Date: ${date}
Time: ${time}

Services:
${serviceList}

Total: ₹${totalAmount}

We look forward to seeing you!

Best regards,
The Stylio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Booking Confirmed!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #888; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Booking Number</p>
          <p style="color: #333; margin: 0; font-size: 24px; font-weight: bold;">#${bookingNumber}</p>
        </div>
        
        <table width="100%" cellpadding="10" style="margin-bottom: 20px;">
          <tr>
            <td style="color: #888; font-size: 14px;">Salon</td>
            <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">${salonName}</td>
          </tr>
          <tr>
            <td style="color: #888; font-size: 14px;">Date</td>
            <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">${date}</td>
          </tr>
          <tr>
            <td style="color: #888; font-size: 14px;">Time</td>
            <td style="color: #333; font-size: 14px; font-weight: 600; text-align: right;">${time}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 1px solid #eee; padding-top: 15px;">
              <p style="color: #888; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase;">Services</p>
              ${services.map(s => `<p style="color: #333; margin: 5px 0; font-size: 14px;">• ${s.name}</p>`).join('')}
            </td>
          </tr>
        </table>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px 0; font-size: 12px;">Total Amount</p>
          <p style="color: #fff; margin: 0; font-size: 28px; font-weight: bold;">₹${totalAmount}</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Stylio. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's name
   */
  async sendPasswordResetEmail(email, resetToken, userName = 'User') {
    const resetUrl = `${config.cors.frontendUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Stylio Password';
    
    const text = `
Hello ${userName},

You requested to reset your password. Click the link below to reset it:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The Stylio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #333; margin: 0 0 20px 0;">Hello ${userName}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          You requested to reset your password. Click the button below to create a new password.
        </p>
        
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Reset Password
        </a>
        
        <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
          ⏱️ This link expires in <strong>1 hour</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Verify email service connection
   */
  async verifyConnection() {
    if (this.provider === 'console' || !this.isConfigured) {
      return { success: true, mode: 'development', provider: 'console' };
    }

    if (this.provider === 'brevo-api') {
      // Verify Brevo API key by making a simple request
      try {
        const response = await fetch('https://api.brevo.com/v3/account', {
          headers: {
            'accept': 'application/json',
            'api-key': this.brevoApiKey,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Brevo API connected: ${data.email}`);
          return { success: true, mode: 'production', provider: 'brevo-api' };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Brevo API verification failed:', error.message);
        return { success: false, error: error.message, provider: 'brevo-api' };
      }
    }

    // SMTP verification
    try {
      await this.transporter.verify();
      return { success: true, mode: 'production', provider: 'smtp' };
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error.message);
      return { success: false, error: error.message, provider: 'smtp' };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;



