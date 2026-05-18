FROM node:22-bookworm-slim
WORKDIR /app/services/orchestrator
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY services/orchestrator/package.json services/orchestrator/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY services/orchestrator/tsconfig.json ./
COPY services/orchestrator/src ./src
COPY proto /app/proto
RUN pnpm run build
WORKDIR /app/services/orchestrator
CMD ["pnpm", "run", "worker"]
