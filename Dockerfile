# ---- Build stage ----
# Install dependencies (including native build tools for better-sqlite3)
FROM node:22-alpine AS build

WORKDIR /app

# Install build dependencies for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Production stage ----
FROM node:22-alpine

# Add tini for proper PID 1 signal handling
RUN apk add --no-cache tini

# Non-root user for security
RUN addgroup -S blog && adduser -S blog -G blog

WORKDIR /app

# Copy installed node_modules from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY server.js db.js ./
COPY views/ ./views/
COPY public/ ./public/

# Create the data directory for the SQLite database and give ownership to blog user
RUN mkdir -p /data && chown blog:blog /data

# Switch to non-root user
USER blog

# Environment configuration
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Expose the app port
EXPOSE 3000

# Persist database across container restarts
VOLUME ["/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
