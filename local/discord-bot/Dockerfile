FROM node:24-bookworm-slim
WORKDIR /opt/bot
COPY package.json ./
COPY src ./src
WORKDIR /home/container
ENTRYPOINT ["/bin/sh", "-c", "exec $STARTUP"]
