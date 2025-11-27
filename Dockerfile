FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci

# Build server
COPY server/tsconfig.json ./server/
COPY server/src ./server/src
RUN cd server && npm run build

# Runtime image
FROM node:20-slim
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=base /app/server/node_modules ./node_modules
COPY --from=base /app/server/dist ./dist
COPY server/package*.json ./

EXPOSE 3001/tcp
EXPOSE 40000-40100/udp

CMD ["npm", "start"]
