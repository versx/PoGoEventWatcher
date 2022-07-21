FROM alpine:3.15

ENV NODE_VERSION 18.6.0

WORKDIR /app
RUN npm install -g npm@8.15.0
COPY package.json .
RUN npm install
COPY . .
RUN npm run create-locales
RUN npm start