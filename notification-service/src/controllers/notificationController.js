import { notificationService } from '../services/notificationService.js';

export const notificationController = {
  async getNotifications(req, res, next) {
    try {
      const userId = req.query.userId || req.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'userId query parameter or X-User-Id header is required',
            requestId: req.correlationId
          }
        });
      }

      const notifications = await notificationService.getNotificationsByUserId(userId);
      res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      next(error);
    }
  },

  async getNotificationById(req, res, next) {
    try {
      const notification = await notificationService.getNotificationById(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found',
            requestId: req.correlationId
          }
        });
      }

      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }
};
