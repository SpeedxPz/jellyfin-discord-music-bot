FROM node:17.3.0-alpine3.12 as builder
RUN apk add --no-cache --virtual bash git g++ make py3-pip
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-cache
COPY . .
RUN npm run build


FROM node:17.3.0-alpine3.12
RUN apk add ffmpeg

COPY --from=builder /usr/src/app/ /usr/src/app/
WORKDIR /usr/src/app/

EXPOSE 3000

CMD ["yarn", "start:prod"]