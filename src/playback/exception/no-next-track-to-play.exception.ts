export class NoNextTrackToPlay extends Error {
  constructor() {
    super('The playback reach the end. No next track to assigned');
  }
}
