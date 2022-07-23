FROM node:16 as build

WORKDIR /app
COPY package*.json .
RUN npm install -g npm@8.15.0
COPY . .
RUN npm run create-locales
CMD ["npm", "start"]