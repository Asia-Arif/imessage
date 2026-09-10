FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY frontend/ ./

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build


FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ ./backend

# Frontend build → /app/public
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3000

CMD ["node", "backend/src/index.js"]