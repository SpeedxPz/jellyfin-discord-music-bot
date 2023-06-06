export class YoutubeNotFound extends Error {
  constructor() {
    super('Cannot find the video you request');
  }
}
