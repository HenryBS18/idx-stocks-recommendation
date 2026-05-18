FROM node:20 AS base

# Builder
FROM base AS builder
WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Install
FROM base AS install
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Release
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist .
COPY --from=install /app/node_modules node_modules

CMD [ "node", "main" ]