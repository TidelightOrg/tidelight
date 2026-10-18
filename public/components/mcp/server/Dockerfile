# syntax=docker/dockerfile:1

# Build the public MCP stdio bridge from the mother repository source.
FROM node:22-alpine AS build
WORKDIR /app

COPY public/components/mcp/server/package.json public/components/mcp/server/package-lock.json ./
RUN npm ci

COPY public/components/mcp/server/tsconfig.json ./
COPY public/components/mcp/server/src ./src
COPY public/components/mcp/server/bin ./bin
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

LABEL org.opencontainers.image.title="Tidelight MCP" \
      org.opencontainers.image.description="Official Tidelight MCP stdio bridge for the Tidelight Intelligence Cloud" \
      org.opencontainers.image.url="https://tidelight.app/developers/packages/mcp" \
      org.opencontainers.image.source="https://github.com/TidelightOrg/tidelight" \
      org.opencontainers.image.licenses="Apache-2.0"

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/bin ./bin

USER node
ENTRYPOINT ["node", "/app/bin/tidelight-mcp.mjs"]
