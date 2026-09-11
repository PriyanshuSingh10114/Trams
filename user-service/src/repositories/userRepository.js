import { prisma } from './prisma.js';

export const userRepository = {
  async findByEmail(email, tx = prisma) {
    return tx.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  },

  async findById(id, tx = prisma) {
    return tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  async findByIdWithPassword(id, tx = prisma) {
    return tx.user.findUnique({
      where: { id }
    });
  },

  async create(userData, tx = prisma) {
    return tx.user.create({
      data: {
        email: userData.email.toLowerCase(),
        name: userData.name,
        passwordHash: userData.passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  async update(id, data, tx = prisma) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.toLowerCase();

    return tx.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
};
