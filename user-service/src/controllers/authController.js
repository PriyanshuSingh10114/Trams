import { authService } from '../services/authService.js';

export const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({
        name,
        email,
        password,
        correlationId: req.correlationId
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
