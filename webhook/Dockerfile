FROM python:3.13-alpine

# docker-cli + compose plugin so the script can talk to the host docker socket
# we mount in via /var/run/docker.sock.
RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /srv
COPY server.py .
COPY scripts /scripts
RUN chmod +x /scripts/*.sh

EXPOSE 9000
CMD ["python", "-u", "server.py"]
