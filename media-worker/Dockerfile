# FrameReview V2 — Media Worker Dockerfile
# 针对国内网络优化：阿里云 apk 源 + npm 淘宝源

FROM node:22-alpine

# 换 Alpine 国内源（阿里云）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装 ffmpeg（视频处理）
RUN apk add --no-cache ffmpeg

WORKDIR /var/www

COPY package*.json ./
RUN npm install --omit=dev --registry=https://registry.npmmirror.com

COPY src ./src

CMD ["node", "src/index.js"]
