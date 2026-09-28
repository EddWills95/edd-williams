FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production

COPY server.js map-stats.js build-stats.js ./

EXPOSE 3001

CMD ["node", "server.js"]
