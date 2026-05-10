.PHONY: help up down logs ps pull restart status init-network init-proxy down-proxy clean

PROD := docker compose -f docker-compose.prod.yml --env-file .env.prod

help:
	@echo "Targets:"
	@echo "  up            pull + up -d  (prod stack, behind nginx-proxy)"
	@echo "  down          stop & remove the prod stack"
	@echo "  restart       down + up"
	@echo "  pull          docker compose pull"
	@echo "  logs          tail prod logs"
	@echo "  ps            list prod containers"
	@echo "  status        docker stats"
	@echo "  init-network  create the shared 'proxy-net' bridge network (one-off)"
	@echo "  init-proxy    bring up nginx-proxy + acme-companion (expects ./compose/proxy.yml)"
	@echo "  down-proxy    stop nginx-proxy stack"
	@echo "  clean         docker system prune"

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
