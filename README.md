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

## 💻 What is this repository aiming for
To be clear, Yes! this bot is named Jellyfin Discord Bot. But actually I'm aiming to support the other source provider as well such as Youtube and may have some other private provider that i can't tell you how to enable or use it and might require the external service that i can't provide the code for.     
     
This is my hobby project, Feel free to use or contribute as you want!

## ✨ Features
- Play the music from your existsing Jellyfin library!
- Multiple discord server support (All server share the same jellyfin library)
- Supports ``Music``, ``Playlists`` and ``Albums`` from your Jellyfin instance
- Easy usage with Discord command system (eg. ``/play``, ``/pause``, ...)


## 📌 About this fork
This project was fork from [manual-rw on Github](https://github.com/manuel-rw/jellyfin-discord-music-bot/) for my own purpose. I came across and interested in this project,
By the way, The many things is missing from that repo and some of them is just my needs. So i made a fork and try to do my best to fit this bot to my use cases.

## ⛔ Limitations
- Bot can be use on multiple discord servers concurrently, But sharding is not support for large amount of server (1000+)
- Album covers are not visible, unless you enable the JELLYFIN_INTERNAL_IMAGE_ENABLED which require you jellyfin instance to be public and will expose your jellyfin server address
- Streaming any video content in voice channels (Discord Bot API Limitation)

## 🚀 Installation

Please check out the Wiki section in the repository for installation instructions:

https://github.com/SpeedxPz/jellyfin-discord-music-bot/wiki

For docker image you can choose your suitable image     
     
Stable release
```
registry.takumipro.dev/public/jellyfin-discord-music-bot:latest
```

Development image (New feature frequenly but also buggy and unstable)
```
registry.takumipro.dev/public/jellyfin-discord-music-bot:dev
```

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
