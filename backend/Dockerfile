FROM node:20-alpine AS base
WORKDIR /app

# Install backend dependencies first so layer is cached unless package*.json changes.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy application source code (backend and frontend static assets)
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 5000

# Healthcheck against the API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Run as non-privileged node user for container security
USER node

CMD ["node", "server.js"]
