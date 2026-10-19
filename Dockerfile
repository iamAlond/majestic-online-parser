
FROM oven/bun:1.1-alpine AS build

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --production --frozen-lockfile --ignore-scripts

FROM oven/bun:1.1-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY src/ ./src/

EXPOSE 4444

CMD ["bun", "run", "src/main.ts"]