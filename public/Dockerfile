# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and lock first for caching
COPY package*.json ./
RUN npm ci --production=false

# Copy source
COPY . .

# Build Next.js for production
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy build artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --production=true

EXPOSE 3000

# Start server
CMD ["npm", "start"]
