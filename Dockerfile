FROM alpine

RUN  apk update \
  && apk add --no-cache bash \
  && apk --no-cache add curl \
  && apk --no-cache add git \
  && apk add --no-cache nodejs npm

WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json .
COPY .eslintrc .
COPY tsconfig.json .
RUN npm install
COPY . .
RUN npm run create-locales