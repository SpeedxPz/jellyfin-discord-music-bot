export class InvalidYoutubeLink extends Error {
  constructor() {
    super('This link is not youtube link');
  }
}
