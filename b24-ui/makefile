.PHONY: init-network init-nginxproxy prod-docs status ps down down-all logs logs-nginxproxy clean

# Init
init-network:
	@echo "Starting network"
	docker network create proxy-net

init-nginxproxy:
	@echo "Starting nginx proxy"
	docker compose -f docker-compose.server.yml up -d

# Production
prod-docs:
	@echo "Starting prod docs environment"
	docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

# Utils
status:
	docker stats

ps:
	watch -n 2 docker ps

down:
	docker compose -f docker-compose.prod.yml --env-file .env.prod down

down-all:
	docker compose -f docker-compose.prod.yml --env-file .env.prod down
	docker compose -f docker-compose.server.yml down

logs:
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs

logs-nginxproxy:
	docker compose -f docker-compose.server.yml --env-file .env.prod logs

clean:
	# docker compose down
	docker system prune
