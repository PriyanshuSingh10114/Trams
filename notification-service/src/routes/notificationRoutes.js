import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { internalAuth } from '../middleware/internalAuth.js';

export const notificationRoutes = Router();

// Internal endpoints accessible through API Gateway
notificationRoutes.get('/', internalAuth, notificationController.getNotifications);
notificationRoutes.get('/:id', internalAuth, notificationController.getNotificationById);
