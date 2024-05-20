FROM node:20.13.1-alpine3.18 as builder
RUN apk add --no-cache --virtual bash git g++ make py3-pip
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-cache
COPY . .
RUN npm run build


FROM node:20.13.1-alpine3.18
RUN apk add ffmpeg python3

COPY --from=builder /usr/src/app/ /usr/src/app/
WORKDIR /usr/src/app/
RUN chmod a+rx /usr/src/app/bin/yt-dlp
EXPOSE 3000

CMD ["yarn", "start:prod"]