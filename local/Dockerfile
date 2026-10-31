FROM composer:2 AS composer
FROM php:8.4-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev libsqlite3-dev libonig-dev \
    && docker-php-ext-install pdo_sqlite mbstring bcmath zip pcntl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY php.ini /usr/local/etc/php/conf.d/cinammon-local.ini
ENV COMPOSER_HOME=/tmp/composer
