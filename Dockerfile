# syntax=docker/dockerfile:1.7
# Multi-stage: build static SPA with Nuxt, serve via nginx.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Cache deps separately from app sources.
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Public config bakes into the static bundle, so it must be known at build time.
# NUXT_PUBLIC_YANDEX_COUNTER_ID is empty by default → analytics stays off unless
# the build passes a counter id (fail-safe).
ARG NUXT_PUBLIC_SITE_URL=
ARG NUXT_APP_BASE_URL=/
ARG NUXT_PUBLIC_YANDEX_COUNTER_ID=
ARG NUXT_PUBLIC_FEEDBACK_URL=
ARG NUXT_PUBLIC_MARKETPLACE_SLUG=
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL} \
    NUXT_APP_BASE_URL=${NUXT_APP_BASE_URL} \
    NUXT_PUBLIC_YANDEX_COUNTER_ID=${NUXT_PUBLIC_YANDEX_COUNTER_ID} \
    NUXT_PUBLIC_FEEDBACK_URL=${NUXT_PUBLIC_FEEDBACK_URL} \
    NUXT_PUBLIC_MARKETPLACE_SLUG=${NUXT_PUBLIC_MARKETPLACE_SLUG}
RUN pnpm run generate

# Inject sha256 hashes of Nuxt's inline scripts into the CSP placeholder, so the
# served config can run script-src WITHOUT 'unsafe-inline'. Must run after
# generate (hashes come from the built HTML) and mutate the conf in this stage;
# the runtime image copies the processed conf from here (NOT the build context).
RUN node scripts/csp-hashes.mjs dist docker/nginx.conf

FROM nginx:1.31-alpine AS runtime
COPY --from=build /app/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
