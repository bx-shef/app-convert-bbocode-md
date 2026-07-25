.PHONY: help dev check up down logs ps pull restart status init-network init-proxy down-proxy clean prod-redeploy prod-rollback prod-smoke

PROD := docker compose -f docker-compose.prod.yml --env-file .env.prod

help:
	@echo "Targets:"
	@echo "  dev           pnpm dev (local dev server)"
	@echo "  check         pnpm lint + typecheck + test (full gate before push)"
	@echo "  up            pull + up -d  (prod stack, behind nginx-proxy)"
	@echo "  down          stop & remove the prod stack"
	@echo "  restart       down + up"
	@echo "  pull          docker compose pull"
	@echo "  prod-redeploy pull :latest (or DOCKER_TAG) + up -d, then smoke"
	@echo "  prod-rollback deploy a specific image tag: make prod-rollback TAG=<commit-sha>"
	@echo "  prod-smoke    functional check: the app container serves the SPA shell"
	@echo "  logs          tail prod logs"
	@echo "  ps            list prod containers"
	@echo "  status        docker stats"
	@echo "  init-network  create the shared 'proxy-net' bridge network (one-off)"
	@echo "  init-proxy    bring up nginx-proxy + acme-companion (expects ./compose/proxy.yml)"
	@echo "  down-proxy    stop nginx-proxy stack"
	@echo "  clean         docker system prune"

# --- Development ---
dev:
	pnpm dev

check:
	pnpm check

# --- Production app ---
up:
	$(PROD) pull
	$(PROD) up -d

down:
	$(PROD) down

restart: down up

pull:
	$(PROD) pull

logs:
	$(PROD) logs -f --tail=200

ps:
	$(PROD) ps

# Pull the current tag (:latest by default, or DOCKER_TAG) and restart, then smoke.
prod-redeploy:
	$(PROD) pull
	$(PROD) up -d
	$(MAKE) prod-smoke

# Roll back (or pin) to a specific immutable image tag — the raw commit SHA that
# deploy-docker.yml pushes alongside :latest. One-shot; to persist across the
# host's shared Watchtower / `make up`, set DOCKER_TAG=<sha> in .env.prod.
#   make prod-rollback TAG=<full-commit-sha>
prod-rollback:
	@test -n "$(TAG)" || { echo "usage: make prod-rollback TAG=<image-tag> (raw commit sha pushed by deploy-docker.yml alongside :latest)"; exit 1; }
	DOCKER_TAG=$(TAG) $(PROD) pull
	DOCKER_TAG=$(TAG) $(PROD) up -d
	DOCKER_TAG=$(TAG) $(MAKE) prod-smoke

# Functional smoke: the app container answers with the built SPA shell, checked
# in-cluster (no public URL / TLS needed). For an end-to-end public check use
# `scripts/smoke.sh <url>`.
prod-smoke:
	@$(PROD) exec -T app wget -qO- http://127.0.0.1/ | grep -qi 'nuxt' \
	  && echo "prod-smoke OK: app serves the SPA shell" \
	  || { echo "prod-smoke FAIL: app did not return the SPA shell"; exit 1; }

# --- Server-wide proxy (run once per server) ---
init-network:
	docker network inspect proxy-net >/dev/null 2>&1 || docker network create proxy-net

init-proxy:
	@test -f compose/proxy.yml || (echo "compose/proxy.yml not found — point the target at your nginx-proxy stack" && exit 1)
	docker compose -f compose/proxy.yml up -d

down-proxy:
	docker compose -f compose/proxy.yml down

# --- Utils ---
status:
	docker stats

clean:
	docker system prune
