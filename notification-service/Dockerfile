FROM node:22-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 3002

# Run migrations/push and start server
CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
