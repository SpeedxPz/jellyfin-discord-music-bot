export class InvalidYoutubeLink extends Error {
  constructor() {
    super('This link is not youtube link');
  }
}

export class InvalidYoutubePlaylistLink extends Error {
  constructor() {
    super('This link is not youtube playlist link');
  }
}
