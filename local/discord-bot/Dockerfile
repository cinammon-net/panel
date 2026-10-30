FROM node:24-bookworm-slim
WORKDIR /opt/bot
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY src ./src
WORKDIR /home/container
ENTRYPOINT ["/bin/sh", "-c", "exec $STARTUP"]
