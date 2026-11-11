FROM node:24-bookworm-slim
WORKDIR /opt/bot
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY index.js ./
COPY src ./src
COPY assets ./assets
WORKDIR /home/container
ENTRYPOINT ["/bin/sh", "-c", "exec $STARTUP"]
