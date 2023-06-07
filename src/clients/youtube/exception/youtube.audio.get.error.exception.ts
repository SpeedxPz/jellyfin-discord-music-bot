export class YoutubeGetAudioError extends Error {
  constructor() {
    super('Cannot get audio from youtube');
  }
}
