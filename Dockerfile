# RealEstate Intent AI Platform – Frontend (Vite + Nginx)
# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Production build: unified backend (same-origin /v1), Keycloak auth (not mock)
ENV VITE_USE_UNIFIED_ENGINE=true
ENV VITE_UNIFIED_ENGINE_URL=
ARG VITE_USE_MOCK_AUTH=false
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ENV VITE_USE_MOCK_AUTH=${VITE_USE_MOCK_AUTH}
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}

RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx-unified.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
