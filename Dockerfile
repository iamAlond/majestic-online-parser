
FROM oven/bun:1.4.5-alpine AS build

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --production --frozen-lockfile --ignore-scripts

FROM oven/bun:1.4.5-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY src/ ./src/

USER bun

EXPOSE 80

CMD ["bun", "run", "src/main.ts"]