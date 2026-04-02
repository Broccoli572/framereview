FROM docker.mirrors.ustc.edu.cn/library/node:22-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /var/www

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

CMD ["node", "src/index.js"]
