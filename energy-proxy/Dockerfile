FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production

COPY server.js map-stats.js map-history.js build-stats.js partner.js ./

EXPOSE 3001

CMD ["node", "server.js"]
