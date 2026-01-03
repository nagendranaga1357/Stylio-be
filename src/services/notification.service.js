import emailService from './email.service.js';
import config from '../config/index.js';

/**
 * Notification Service
 * 
 * Unified service for sending notifications via:
 * - Email (using SMTP)
 * - SMS (using console in dev, or external SMS API in production)
 * - Push Notifications (future integration)
 * 
 * In development mode, all notifications are logged to console.
 */

class NotificationService {
  /**
   * Send OTP to user
   * @param {Object} user - User object with email and phone
   * @param {string} otp - OTP code
   * @param {string} channel - 'email' | 'sms' | 'both'
   */
  async sendOtp(user, otp, channel = 'email') {
    const results = [];
    const userName = user.firstName || user.username || 'User';

    // Send via Email
    if (channel === 'email' || channel === 'both') {
      try {
        const emailResult = await emailService.sendOtpEmail(
          user.email,
          otp,
          userName
        );
        results.push({ channel: 'email', ...emailResult });
      } catch (error) {
        console.error('Failed to send OTP email:', error.message);
        results.push({ channel: 'email', success: false, error: error.message });
      }
    }

    // Send via SMS
    if ((channel === 'sms' || channel === 'both') && user.phone) {
      try {
        const smsResult = await this.sendSms(
          user.phone,
          `Your Stylio verification code is: ${otp}. Valid for ${config.otp.expiresMinutes} minutes.`
        );
        results.push({ channel: 'sms', ...smsResult });
      } catch (error) {
        console.error('Failed to send OTP SMS:', error.message);
        results.push({ channel: 'sms', success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send SMS message
   * Currently logs to console in development mode.
   * Configure SMS_PROVIDER for production usage.
   * 
   * Supported providers (future):
   * - TextBelt (free tier available)
   * - Twilio
   * - MSG91
   * 
   * @param {string} phone - Phone number
   * @param {string} message - SMS message
   */
  async sendSms(phone, message) {
    const smsConfig = config.sms;

    // If no SMS provider configured, use console logging
    if (!smsConfig.provider || smsConfig.provider === 'console') {
      console.log('\n' + '='.repeat(60));
      console.log('📱 SMS (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${phone}`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(60) + '\n');
      
      return { 
        success: true, 
        messageId: `sms-dev-${Date.now()}`,
        mode: 'development' 
      };
    }

    // TextBelt - Free SMS API (1 free SMS per day for testing)
    if (smsConfig.provider === 'textbelt') {
      return this.sendViaTxtBelt(phone, message, smsConfig.apiKey);
    }

    // Custom HTTP API
    if (smsConfig.provider === 'custom') {
      return this.sendViaCustomApi(phone, message, smsConfig);
    }

    // Fallback to console
    console.log(`📱 SMS to ${phone}: ${message}`);
    return { success: true, mode: 'console' };
  }

  /**
   * Send SMS via TextBelt (free tier: 1 SMS/day, or paid with API key)
   * Website: https://textbelt.com/
   */
  async sendViaTxtBelt(phone, message, apiKey = 'textbelt') {
    try {
      const response = await fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message,
          key: apiKey, // 'textbelt' for free tier (1/day)
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`📱 SMS sent via TextBelt to ${phone}`);
        return { success: true, messageId: data.textId, mode: 'textbelt' };
      } else {
        console.error('TextBelt error:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('TextBelt request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS via custom HTTP API
   * Configure SMS_API_URL and SMS_API_KEY in environment
   */
  async sendViaCustomApi(phone, message, smsConfig) {
    try {
      const response = await fetch(smsConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${smsConfig.apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`📱 SMS sent via custom API to ${phone}`);
        return { success: true, data, mode: 'custom' };
      } else {
        return { success: false, error: data.message || 'SMS API error' };
      }
    } catch (error) {
      console.error('Custom SMS API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send booking notification
   * @param {Object} user - User object
   * @param {Object} booking - Booking details
   */
  async sendBookingNotification(user, booking) {
    const results = [];

    // Email notification
    try {
      const bookingDetails = {
        salonName: booking.salon?.name || 'Salon',
        bookingNumber: booking.bookingNumber,
        date: new Date(booking.bookingDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: booking.bookingTime,
        services: booking.services.map(s => ({
          name: s.service?.name || s.name || 'Service',
        })),
        totalAmount: booking.finalAmount || booking.totalAmount,
      };

      const emailResult = await emailService.sendBookingConfirmation(
        user.email,
        bookingDetails
      );
      results.push({ channel: 'email', ...emailResult });
    } catch (error) {
      console.error('Failed to send booking email:', error.message);
      results.push({ channel: 'email', success: false, error: error.message });
    }

    // SMS notification (optional)
    if (user.phone && config.sms.enabled) {
      try {
        const smsResult = await this.sendSms(
          user.phone,
          `Booking Confirmed! #${booking.bookingNumber} at ${booking.salon?.name || 'salon'} on ${booking.bookingDate}. See you soon! - Stylio`
        );
        results.push({ channel: 'sms', ...smsResult });
      } catch (error) {
        results.push({ channel: 'sms', success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send booking reminder
   * @param {Object} user - User object
   * @param {Object} booking - Booking details
   */
  async sendBookingReminder(user, booking) {
    const message = `Reminder: Your appointment at ${booking.salon?.name} is tomorrow at ${booking.bookingTime}. Booking #${booking.bookingNumber} - Stylio`;

    const results = [];

    // Send email reminder
    try {
      const emailResult = await emailService.sendEmail({
        to: user.email,
        subject: `Reminder: Tomorrow's Appointment #${booking.bookingNumber}`,
        text: message,
        html: `<p>${message}</p>`,
      });
      results.push({ channel: 'email', ...emailResult });
    } catch (error) {
      results.push({ channel: 'email', success: false, error: error.message });
    }

    // Send SMS reminder if phone available
    if (user.phone) {
      const smsResult = await this.sendSms(user.phone, message);
      results.push({ channel: 'sms', ...smsResult });
    }

    return results;
  }

  /**
   * Send booking cancellation notification
   * @param {Object} user - User object  
   * @param {Object} booking - Booking details
   * @param {string} reason - Cancellation reason
   */
  async sendBookingCancellation(user, booking, reason = '') {
    const message = `Your booking #${booking.bookingNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''} - Stylio`;

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: `Booking Cancelled #${booking.bookingNumber}`,
        text: message,
        html: `<p>${message}</p>`,
      });
      
      if (user.phone) {
        await this.sendSms(user.phone, message);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send cancellation notification:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;



