# ANVESA backend — Next.js 15 + tRPC production image.
FROM node:20-alpine AS base
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY packages/config/package.json ./packages/config/
RUN npm ci --workspace @anvesa/backend --include-workspace-root || npm install

# --- build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate --workspace @anvesa/backend \
  && npm run build --workspace @anvesa/backend

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/backend/.next ./backend/.next
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@anvesa/backend"]
