FROM docker.mirrors.ustc.edu.cn/library/php:8.4-fpm-alpine

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

# 安装 Redis 扩展
RUN pecl install redis && docker-php-ext-enable redis

# 安装 Composer（中科大镜像）
COPY --from=docker.mirrors.ustc.edu.cn/library/composer:2 /usr/bin/composer /usr/bin/composer

# 时区
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

# 工作目录
WORKDIR /var/www

# 用户
RUN adduser -D -u 1000 www-data
