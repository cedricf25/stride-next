# ================================
# Stage 1: Builder
# ================================
FROM node:22-alpine AS builder
WORKDIR /app

# Dummy DATABASE_URL for prisma generate & next build (not used at runtime)
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"

# Install ALL dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client then build
RUN npx prisma generate
ENV NODE_ENV=production
RUN npm run build

# ================================
# Stage 2: Production Runner
# ================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

CMD ["node", "server.js"]
