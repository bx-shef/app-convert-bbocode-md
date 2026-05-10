#!/bin/sh
set -eu
APP=/apps/convert-bbocode-md
docker compose -f "$APP/docker-compose.prod.yml" --env-file "$APP/.env.prod" pull
docker compose -f "$APP/docker-compose.prod.yml" --env-file "$APP/.env.prod" up -d
