FROM node:20-alpine AS base

# Install
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# Release
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

CMD ["node", "server.js"]