import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}
