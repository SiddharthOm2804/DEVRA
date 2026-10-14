# syntax=docker/dockerfile:1

# Stage 1: Build frontend assets within npm workspaces monorepo
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifest and lockfile
COPY package.json package-lock.json ./

# Copy all workspace manifests so npm workspaces dependency graph resolves cleanly
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY extension/package.json ./extension/
COPY shared/package.json ./shared/

# Install dependencies for the client workspace strictly adhering to lockfile
RUN npm ci --workspace=devra-client --include-workspace-root

# Copy shared code and client source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build client production bundle
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm --prefix client run build

# Stage 2: Production Nginx runner
FROM nginx:alpine AS runner

# Copy compiled static files
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
