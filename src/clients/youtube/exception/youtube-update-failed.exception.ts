export class YoutubeUpdateFailed extends Error {
  constructor() {
    super('yt-dlp update failed');
  }
}
