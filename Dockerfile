# syntax=docker/dockerfile:1.7
# Multi-stage: build static SPA with Nuxt, serve via nginx.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Cache deps separately from app sources.
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Base URL bakes into the static bundle, so it must be known at build time.
ARG NUXT_PUBLIC_SITE_URL=
ARG NUXT_APP_BASE_URL=/
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL} \
    NUXT_APP_BASE_URL=${NUXT_APP_BASE_URL}
RUN pnpm run generate

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
