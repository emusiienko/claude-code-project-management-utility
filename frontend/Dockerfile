# Frontend image — multi-stage: Vite build (Node) -> static SPA served by nginx.
# The browser talks to the backend directly at VITE_API_BASE_URL (default
# http://localhost:8000); the backend CORS allowlist already permits the
# Web UI origin, so no reverse proxy is needed in V1 (see architecture.md).
#
# Owned by devops (build); app contents owned by frontend-developer.

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app/frontend

# Vite inlines VITE_* vars at BUILD time, so the API base URL must be known
# here. Overridable at build via --build-arg if the backend is reached at a
# different origin from the browser.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Dependency layer — copy manifests first for cache reuse across source edits.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Source + build (tsc --noEmit && vite build, per package.json "build" script).
COPY . .
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (history-API fallback to index.html), listening on 3000.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output.
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 3000

# nginx:alpine already runs CMD ["nginx", "-g", "daemon off;"].
