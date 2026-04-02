# FrameReview V2 — PHP App Dockerfile
# 针对国内网络优化：阿里云 apk 源 + Composer 国内源

FROM php:8.4-fpm-alpine

# 换 Alpine 国内源（阿里云）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统依赖
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    postgresql-dev \
    linux-headers \
    $PHPIZE_DEPS

# 安装 PHP 扩展
RUN docker-php-ext-install pdo pdo_pgsql bcmath exif pcntl gd

# 安装 Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Composer 国内源
RUN composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/

# 时区
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

# 工作目录
WORKDIR /var/www

# 用户
RUN adduser -D -u 1000 www-data
