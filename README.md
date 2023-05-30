<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true" width="200" alt="Nest Logo" /></a>
</p>

  <br/>
  <h1 align="center">Jellyfin Discord Bot</h1>

  <p align="center">A simple <a href="https://discord.com" target="_blank">Discord</a> bot that enables you to broadcast<br/>your <a href="https://jellyfin.org/" target="_blank">Jellyfin Media Server</a> music collection to voice channels.<br/>It's Open Source and can easily be hosted by yourself!</p>

<p align="center">
  <small>Thanky you <a href="https://github.com/manuel-rw/jellyfin-discord-music-bot/">manuel-rw</a>, <a href="https://github.com/KGT1/jellyfin-discord-music-bot/">KGT1</a> for starting this project!<br/>This is a fork of their original repository because i need to big modify them to match my use case</small>
</p>

<hr/>
<br/>


## ✨ Features

- Leighweight and extendable using the [Nest](https://github.com/nestjs/nest) framework
- Easy usage with Discord command system (eg. ``/play``, ``/pause``, ...)
- Fast and validated configuration using environment variables
- Typesafe code for quicker development and less bugs
- Supports ``Music``, ``Playlists`` and ``Albums`` from your Jellyfin instance

## 📌 About this fork
This project was fork from [manual-rw on Github](https://github.com/manuel-rw/jellyfin-discord-music-bot/). I came across and interested in this project,
By the way, The many things is missing from that repo. So i made a fork and try to do my best to fit this bot to my use cases.

## ⛔ Limitations

- Bot does not support shards (for now). This means, you cannot use it in multiple servers concurrently.
- Album covers are not visible, unless they are remote (eg. provided by external metadata provider)
- Streaming any video content in voice channels (See [this issue](https://github.com/discordjs/discord.js/issues/4116))

## 🚀 Installation

Please check out the Wiki section in the repository for installation instructions:

https://github.com/manuel-rw/jellyfin-discord-music-bot/wiki

If you want to use this repo build use this image
```registry.takumipro.dev/public/jellyfin-discord-music-bot:latest```


## 💻 Development

I'm open to any contributions to this project. You can start contributing using the following commands, after executing the installation commands:

## 👤 Credits
- https://tabler-icons.io/
- https://docs.nestjs.com/
- https://discord.js.org/
- https://github.com/fjodor-rybakov/discord-nestjs
- https://github.com/jellyfin/jellyfin-sdk-typescript
- https://jellyfin.org/
- https://github.com/KGT1/jellyfin-discord-music-bot
- https://gitmoji.dev/
- https://github.com/manuel-rw/jellyfin-discord-music-bot
