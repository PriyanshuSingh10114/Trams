import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { updateUserSchema, uuidParamSchema } from '../validators/userValidator.js';

export const userRoutes = Router();

userRoutes.get('/me', authenticate, userController.getMe);
userRoutes.patch('/me', authenticate, validateBody(updateUserSchema), userController.updateMe);
userRoutes.get('/:id', authenticate, validateParams(uuidParamSchema), userController.getById);
