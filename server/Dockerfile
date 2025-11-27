FROM node:20-slim AS base
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime image
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package*.json ./

EXPOSE 3001/tcp
EXPOSE 40000-40100/udp

CMD ["npm", "start"]
