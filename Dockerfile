# ================================
# Stage 1: Builder
# ================================
FROM node:22-alpine AS builder
WORKDIR /app

ENV NODE_ENV production
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"

COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma client
RUN npx prisma generate
RUN npm run build

# Variables needed at build time for Next.js
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

RUN npm run build
RUN npx prisma generate

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
