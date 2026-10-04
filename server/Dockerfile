# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set default environment
ENV NODE_ENV=production
ENV PORT=5000

# Security: run as non-root user
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
