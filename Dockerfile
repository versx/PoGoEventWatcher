FROM node:16

ENV NODE_VERSION 18.6.0

WORKDIR /app/eventwatcher
RUN npm install -g npm@8.15.0
COPY package.json .
RUN npm install
COPY . .
RUN npm run create-locales
RUN npm start