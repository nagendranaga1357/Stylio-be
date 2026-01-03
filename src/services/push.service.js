import User from '../models/User.js';

/**
 * Push Notification Service
 * 
 * Sends push notifications via Expo's push notification service.
 * Free and unlimited - no Firebase or other services required.
 * 
 * Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

class PushService {
  /**
   * Send push notification to a single user
   * @param {string} userId - User ID to send notification to
   * @param {Object} notification - Notification content
   * @param {string} notification.title - Notification title
   * @param {string} notification.body - Notification body
   * @param {Object} notification.data - Additional data payload
   * @param {string} notification.channelId - Android channel ID (optional)
   */
  async sendToUser(userId, notification) {
    try {
      const user = await User.findById(userId).select('pushToken pushPlatform');
      
      if (!user?.pushToken) {
        console.log(`📱 No push token for user ${userId}`);
        return { success: false, reason: 'no_token' };
      }

      return this.sendToToken(user.pushToken, notification);
    } catch (error) {
      console.error(`📱 Failed to send push to user ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to a specific Expo push token
   * @param {string} pushToken - Expo push token (ExponentPushToken[xxx])
   * @param {Object} notification - Notification content
   */
  async sendToToken(pushToken, notification) {
    // Validate Expo push token format
    if (!pushToken?.startsWith('ExponentPushToken[')) {
      console.log(`📱 Invalid push token format: ${pushToken}`);
      return { success: false, reason: 'invalid_token' };
    }

    const message = {
      to: pushToken,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: notification.channelId || 'default',
      priority: notification.priority || 'high',
      badge: notification.badge,
    };

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.data?.status === 'ok') {
        console.log(`📱 Push sent successfully to ${pushToken.slice(0, 30)}...`);
        return { success: true, ticketId: result.data.id };
      } else {
        console.error(`📱 Push failed:`, result.data?.message || result);
        return { success: false, error: result.data?.message };
      }
    } catch (error) {
      console.error(`📱 Push request failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notifications to multiple users
   * @param {string[]} userIds - Array of user IDs
   * @param {Object} notification - Notification content
   */
  async sendToUsers(userIds, notification) {
    const users = await User.find({ 
      _id: { $in: userIds },
      pushToken: { $exists: true, $ne: null }
    }).select('pushToken');

    if (users.length === 0) {
      return { success: true, sent: 0, reason: 'no_tokens' };
    }

    const tokens = users.map(u => u.pushToken).filter(Boolean);
    return this.sendToTokens(tokens, notification);
  }

  /**
   * Send push notifications to multiple tokens (batch)
   * @param {string[]} pushTokens - Array of Expo push tokens
   * @param {Object} notification - Notification content
   */
  async sendToTokens(pushTokens, notification) {
    // Filter valid tokens
    const validTokens = pushTokens.filter(t => t?.startsWith('ExponentPushToken['));
    
    if (validTokens.length === 0) {
      return { success: true, sent: 0, reason: 'no_valid_tokens' };
    }

    // Expo supports batching up to 100 notifications per request
    const messages = validTokens.map(token => ({
      to: token,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: notification.channelId || 'default',
      priority: notification.priority || 'high',
      badge: notification.badge,
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      const successCount = result.data?.filter(r => r.status === 'ok').length || 0;
      
      console.log(`📱 Batch push: ${successCount}/${validTokens.length} sent successfully`);
      return { success: true, sent: successCount, total: validTokens.length };
    } catch (error) {
      console.error(`📱 Batch push failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // =====================
  // Convenience Methods
  // =====================

  /**
   * Send booking confirmation push notification
   */
  async sendBookingConfirmation(userId, booking) {
    return this.sendToUser(userId, {
      title: '✅ Booking Confirmed!',
      body: `Your appointment at ${booking.salonName} on ${booking.date} at ${booking.time} is confirmed.`,
      data: {
        type: 'booking',
        bookingId: booking.id || booking._id,
        action: 'view_booking',
      },
      channelId: 'bookings',
    });
  }

  /**
   * Send booking cancellation push notification
   */
  async sendBookingCancellation(userId, booking) {
    return this.sendToUser(userId, {
      title: '❌ Booking Cancelled',
      body: `Your appointment at ${booking.salonName} on ${booking.date} has been cancelled.`,
      data: {
        type: 'booking',
        bookingId: booking.id || booking._id,
        action: 'booking_cancelled',
      },
      channelId: 'bookings',
    });
  }

  /**
   * Send booking reminder push notification
   */
  async sendBookingReminder(userId, booking, minutesBefore = 60) {
    const timeText = minutesBefore >= 60 
      ? `${Math.floor(minutesBefore / 60)} hour${minutesBefore >= 120 ? 's' : ''}`
      : `${minutesBefore} minutes`;

    return this.sendToUser(userId, {
      title: '⏰ Appointment Reminder',
      body: `Your appointment at ${booking.salonName} is in ${timeText}.`,
      data: {
        type: 'reminder',
        bookingId: booking.id || booking._id,
        action: 'view_booking',
      },
      channelId: 'bookings',
    });
  }

  /**
   * Send promotional push notification
   */
  async sendPromoNotification(userIds, promo) {
    return this.sendToUsers(userIds, {
      title: promo.title || '🎉 Special Offer!',
      body: promo.message,
      data: {
        type: 'promo',
        promoCode: promo.code,
        action: 'view_promo',
      },
      channelId: 'promos',
    });
  }

  /**
   * Send general notification
   */
  async sendGeneralNotification(userId, title, body, data = {}) {
    return this.sendToUser(userId, {
      title,
      body,
      data: { type: 'general', ...data },
    });
  }
}

// Export singleton instance
const pushService = new PushService();
export default pushService;

