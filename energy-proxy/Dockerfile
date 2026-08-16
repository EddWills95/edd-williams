FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
